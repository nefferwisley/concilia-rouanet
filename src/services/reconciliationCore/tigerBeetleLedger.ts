import {
  BankTransaction,
  FiscalDocument,
  LedgerAccountType,
  LedgerTransfer,
  LedgerAccountBalance,
  DoubleEntryBalanceReport,
  PronacProject,
} from "../../types";

/**
 * TigerBeetle & Pyluca inspired Double-Entry Immutable Ledger Engine.
 * Guarantees that:
 * 1. Money is neither created nor destroyed, only transferred.
 * 2. Every debit to an expense account has an exact corresponding credit from the bank account.
 * 3. Withholding taxes (ISS, IRRF, INSS) are separated into specialized government liability accounts.
 * 4. Idempotency keys prevent double execution of bank transactions or invoice ingestions.
 */

// Simple deterministic hash for idempotency key generation
function generateIdempotencyKey(parts: string[]): string {
  const str = parts.join("::");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit int
  }
  return `idemp_${Math.abs(hash).toString(16).padStart(8, "0")}_${str.length}`;
}

export class TigerBeetleReconciliationLedger {
  private transfers: LedgerTransfer[] = [];
  private seenIdempotencyKeys: Set<string> = new Set();
  private idempotencyCollisionsPrevented: number = 0;

  constructor() {
    this.transfers = [];
    this.seenIdempotencyKeys = new Set();
    this.idempotencyCollisionsPrevented = 0;
  }

  /**
   * Posts a double-entry transfer with strict idempotency check
   */
  public postTransfer(
    sourceAccount: LedgerAccountType,
    destinationAccount: LedgerAccountType,
    amount: number,
    description: string,
    metadata?: { txId?: string; docId?: string; fitid?: string; rawKeyParts?: string[] }
  ): { posted: boolean; transfer?: LedgerTransfer; duplicatePrevented?: boolean } {
    if (amount <= 0) return { posted: false };

    const keyParts = metadata?.rawKeyParts || [
      sourceAccount,
      destinationAccount,
      amount.toFixed(2),
      metadata?.txId || "",
      metadata?.docId || "",
      metadata?.fitid || "",
      description,
    ];

    const idempotencyKey = generateIdempotencyKey(keyParts);

    // Enforce TigerBeetle idempotency: identical transfers are rejected / deduplicated
    if (this.seenIdempotencyKeys.has(idempotencyKey)) {
      this.idempotencyCollisionsPrevented++;
      return { posted: false, duplicatePrevented: true };
    }

    const transfer: LedgerTransfer = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      idempotencyKey,
      timestamp: new Date().toISOString(),
      sourceAccount,
      destinationAccount,
      amount: Math.round(amount * 100) / 100, // exact cents precision
      description,
      txId: metadata?.txId,
      docId: metadata?.docId,
      fitid: metadata?.fitid,
      status: "POSTED",
    };

    this.transfers.push(transfer);
    this.seenIdempotencyKeys.add(idempotencyKey);
    return { posted: true, transfer };
  }

  /**
   * Ingests full project state (Aportes, Rendimentos, Débitos, Retenções) into the ledger
   */
  public buildProjectLedger(
    project: PronacProject,
    transactions: BankTransaction[],
    documents: FiscalDocument[]
  ): DoubleEntryBalanceReport {
    this.transfers = [];
    this.seenIdempotencyKeys = new Set();
    this.idempotencyCollisionsPrevented = 0;

    // 1. Initial Resource Grants (Aporte FSA / Captação)
    const valorAprovadoOuCaptado =
      Number(project.valorCaptado) || Number(project.valorAprovado) || 0;
    this.postTransfer(
      "RECURSOS_CAPTADOS_FSA",
      "CONTA_VINCULADA_BB",
      valorAprovadoOuCaptado,
      "Repasse Principal de Recursos Fomentados (FSA / BRDE / MinC)",
      { rawKeyParts: ["APORTE_PRINCIPAL", project.id, valorAprovadoOuCaptado.toString()] }
    );

    // 2. Financial Earnings (Rendimentos de Aplicação Financeira BB)
    const creditsAndEarnings = transactions.filter(
      (t) => t.tipo === "CREDITO" || t.tipo === "RENDIMENTO" || t.tipo === "RESGATE" || (t as any).tipoMovimento === "CREDIT"
    );

    for (const cred of creditsAndEarnings) {
      this.postTransfer(
        "RENDIMENTOS_APLICACAO",
        "CONTA_APLICACAO_POUPANCA_BB",
        Number(cred.valor) || 0,
        cred.descricaoExtrato || cred.descricao || "Rendimento de Aplicação Financeira Poupança BB",
        {
          txId: cred.id,
          fitid: cred.documentoBancario || (cred as any).fitid,
          rawKeyParts: ["RENDIMENTO_BB", cred.id, (cred.documentoBancario || "").toString(), cred.valor.toString()],
        }
      );
    }

    // 3. Debits and Fiscal Expenses
    const debits = transactions.filter(
      (t) => t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT"
    );

    for (const deb of debits) {
      const matchedDoc = documents.find((d) => d.id === deb.matchedDocId || d.id === deb.idDocumentoFiscalVinculado);
      const isGlosa = deb.status === "ALERTA_GLOSA" || deb.tipo === "TARIFA";

      if (matchedDoc) {
        const retencoes = (matchedDoc.retencaoIss || 0) + (matchedDoc.retencaoIrrf || 0) + (matchedDoc.retencaoInss || 0);

        // Débito Líquido pago ao fornecedor
        this.postTransfer(
          "CONTA_VINCULADA_BB",
          "FORNECEDORES_DESPESAS",
          deb.valor,
          `Pagto Liq NF ${matchedDoc.numeroDoc} - ${matchedDoc.fornecedorNome}`,
          {
            txId: deb.id,
            docId: matchedDoc.id,
            fitid: deb.documentoBancario || (deb as any).fitid,
            rawKeyParts: ["PAGTO_DEBIT_MATCHED", deb.id, matchedDoc.id, deb.valor.toString()],
          }
        );

        // Se houver retenções registradas
        if (retencoes > 0) {
          this.postTransfer(
            "FORNECEDORES_DESPESAS",
            "RECEITA_FEDERAL_RETENCOES",
            retencoes,
            `Retenções na Fonte (ISS/IRRF/INSS) s/ NF ${matchedDoc.numeroDoc}`,
            {
              docId: matchedDoc.id,
              rawKeyParts: ["RETENCAO_FISCAL", matchedDoc.id, retencoes.toString()],
            }
          );
        }
      } else if (isGlosa) {
        this.postTransfer(
          "CONTA_VINCULADA_BB",
          "GLOSAS_BLOQUEADAS",
          deb.valor,
          deb.descricaoExtrato || deb.descricao || "Lançamento em Risco de Glosa / Tarifa Bancária Indevida",
          {
            txId: deb.id,
            fitid: deb.documentoBancario || (deb as any).fitid,
            rawKeyParts: ["GLOSA_DEBIT", deb.id, deb.valor.toString()],
          }
        );
      } else {
        // Despesa pendente de documento
        this.postTransfer(
          "CONTA_VINCULADA_BB",
          "FORNECEDORES_DESPESAS",
          deb.valor,
          deb.descricaoExtrato || deb.descricao || "Débito Bancário em Apuração Fiscal",
          {
            txId: deb.id,
            fitid: deb.documentoBancario || (deb as any).fitid,
            rawKeyParts: ["DEBIT_PENDING", deb.id, deb.valor.toString()],
          }
        );
      }
    }

    return this.generateBalanceReport();
  }

  /**
   * Produces a comprehensive Double-Entry balance report
   */
  public generateBalanceReport(): DoubleEntryBalanceReport {
    const accountConfigs: Record<LedgerAccountType, { name: string; isDebitNormal: boolean }> = {
      CONTA_VINCULADA_BB: { name: "Conta Corrente Vinculada (Banco do Brasil)", isDebitNormal: true },
      CONTA_APLICACAO_POUPANCA_BB: { name: "Conta Poupança de Aplicação Financeira (BB)", isDebitNormal: true },
      RECURSOS_CAPTADOS_FSA: { name: "Fundo Setorial Audiovisual / Captação Rouanet", isDebitNormal: false },
      RENDIMENTOS_APLICACAO: { name: "Receita de Rendimentos de Aplicação", isDebitNormal: false },
      FORNECEDORES_DESPESAS: { name: "Custos do Projeto / Fornecedores", isDebitNormal: true },
      RECEITA_FEDERAL_RETENCOES: { name: "Obrigações Tributárias / Retenções na Fonte", isDebitNormal: false },
      GLOSAS_BLOQUEADAS: { name: "Despesas com Alerta de Glosa / Tarifas Não Autorizadas", isDebitNormal: true },
    };

    const accountMap: Record<LedgerAccountType, { debits: number; credits: number }> = {
      CONTA_VINCULADA_BB: { debits: 0, credits: 0 },
      CONTA_APLICACAO_POUPANCA_BB: { debits: 0, credits: 0 },
      RECURSOS_CAPTADOS_FSA: { debits: 0, credits: 0 },
      RENDIMENTOS_APLICACAO: { debits: 0, credits: 0 },
      FORNECEDORES_DESPESAS: { debits: 0, credits: 0 },
      RECEITA_FEDERAL_RETENCOES: { debits: 0, credits: 0 },
      GLOSAS_BLOQUEADAS: { debits: 0, credits: 0 },
    };

    let totalDebits = 0;
    let totalCredits = 0;

    for (const t of this.transfers) {
      if (t.status !== "POSTED") continue;
      // In double-entry: Destination Account receives Debit, Source Account receives Credit
      accountMap[t.destinationAccount].debits += t.amount;
      accountMap[t.sourceAccount].credits += t.amount;

      totalDebits += t.amount;
      totalCredits += t.amount;
    }

    const accounts: LedgerAccountBalance[] = (Object.keys(accountMap) as LedgerAccountType[]).map((accKey) => {
      const cfg = accountConfigs[accKey];
      const data = accountMap[accKey];
      const balance = cfg.isDebitNormal ? data.debits - data.credits : data.credits - data.debits;

      return {
        account: accKey,
        name: cfg.name,
        debits: Math.round(data.debits * 100) / 100,
        credits: Math.round(data.credits * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        isDebitNormal: cfg.isDebitNormal,
      };
    });

    const diff = Math.abs(totalDebits - totalCredits);

    return {
      isBalanced: diff < 0.01,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      difference: diff,
      accounts,
      transferCount: this.transfers.length,
      idempotencyCollisionsPrevented: this.idempotencyCollisionsPrevented,
      generatedAt: new Date().toISOString(),
    };
  }

  public getTransfers(): LedgerTransfer[] {
    return [...this.transfers];
  }
}
