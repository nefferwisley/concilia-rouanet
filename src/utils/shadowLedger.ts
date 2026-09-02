import {
  BankTransaction,
  FiscalDocument,
  BudgetRubric,
  TripartiteEntry,
  PronacProject,
  AuditAlert,
} from "../types";

export interface ShadowLedgerSyncResult {
  transactions: BankTransaction[];
  documents: FiscalDocument[];
  rubrics: BudgetRubric[];
  tripartiteEntries: TripartiteEntry[];
  alerts: AuditAlert[];
  healedCount: number;
  matchedCount: number;
  totalReconciledValue: number;
}

/**
 * Extracts monetary value from filenames or text
 * Examples: "001 - Locacao_R$4500,00.pdf", "NF 245 - Som_1.250,50.pdf", "TED_3450.00"
 */
export function extractAmountFromText(text: string): number | null {
  if (!text) return null;

  // Pattern 1: R$ 1.500,00 or R$ 1500,00 or R$1500.00
  const matchR$ = text.match(/(?:R\$|RS|VLR|VALOR)[\s\:\_\-]*([0-9]{1,3}(?:\.[0-9]{3})*\,[0-9]{2}|[0-9]+[\.\,][0-9]{2})/i);
  if (matchR$) {
    const clean = matchR$[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) return val;
  }

  // Pattern 2: _1500,00_ or -1500.00-
  const matchNum = text.match(/[\_\-\s]([0-9]{1,3}(?:\.[0-9]{3})*\,[0-9]{2})[\_\-\s\.]/);
  if (matchNum) {
    const clean = matchNum[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

/**
 * Heals documents with R$ 0,00 or missing info using transactions and filename tokens
 */
export function selfHealDocumentsAndTransactions(
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  rubrics: BudgetRubric[]
): {
  healedDocs: FiscalDocument[];
  healedTxs: BankTransaction[];
  healedCount: number;
} {
  // Filter out any spreadsheet summary/footer rows
  const isSummaryItem = (item: any) => {
    if (!item) return false;
    const text = `${item.descricaoOriginalExtrato || ""} ${item.favorecido || ""} ${item.numeroDoc || ""} ${item.documentoNumero || ""} ${item.descricaoServico || ""}`.toLowerCase();
    return (
      text.includes("pagamentos realizados") ||
      text.includes("total rendimento") ||
      text.includes("total geral") ||
      text.includes("subtotal") ||
      (item.documentoNumero && String(item.documentoNumero).toLowerCase().includes("total"))
    );
  };

  const safeTxs = (Array.isArray(transactions) ? transactions : []).filter((t) => !isSummaryItem(t));
  const safeDocs = (Array.isArray(documents) ? documents : []).filter((d) => !isSummaryItem(d));
  void rubrics;

  let healedCount = 0;

  const healedDocs = safeDocs.map((doc) => {
    if (!doc) return doc;
    const docCopy = { ...doc };
    const currentVal = Number(docCopy.valorBruto) || 0;
    if (currentVal <= 0) {
      const nameVal =
        extractAmountFromText(docCopy.arquivoNotaNome || "") ||
        extractAmountFromText(docCopy.numeroDoc || "") ||
        extractAmountFromText(docCopy.descricaoServico || "");

      if (nameVal && nameVal > 0) {
        docCopy.valorBruto = nameVal;
        docCopy.valorLiquido = nameVal;
        healedCount++;
      }
    }
    return docCopy;
  });

  return { healedDocs, healedTxs: safeTxs, healedCount };
}

function normalizeReconciliationText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function meaningfulTokens(value: unknown): Set<string> {
  const ignored = new Set(["de", "da", "do", "das", "dos", "e", "ltda", "me", "eireli", "sa", "pdf", "nota", "fiscal", "recibo"]);
  return new Set(normalizeReconciliationText(value).split(" ").filter((token) => token.length >= 3 && !ignored.has(token)));
}

function providerSimilarity(transaction: BankTransaction, document: FiscalDocument): number {
  const txTokens = meaningfulTokens(`${transaction.favorecido || ""} ${transaction.descricaoExtrato || ""} ${transaction.descricaoOriginalExtrato || ""}`);
  if (txTokens.size === 0) return 0;
  const similarity = (documentText: unknown) => {
    const docTokens = meaningfulTokens(documentText);
    if (docTokens.size === 0) return 0;
    const intersection = [...docTokens].filter((token) =>
      [...txTokens].some((transactionToken) =>
        transactionToken === token ||
        (transactionToken.length >= 4 && token.length >= 4 && transactionToken.slice(0, 3) === token.slice(0, 3))
      )
    ).length;
    return intersection / Math.min(txTokens.size, docTokens.size);
  };
  return Math.max(similarity(document.fornecedorNome), similarity(document.arquivoNotaNome));
}

function rubricFilenameSimilarity(transaction: BankTransaction, document: FiscalDocument): number {
  const rubricTokens = meaningfulTokens(transaction.rubricaNome || transaction.rubrica || "");
  const filenameTokens = meaningfulTokens(document.arquivoNotaNome);
  if (rubricTokens.size === 0 || filenameTokens.size === 0) return 0;
  const intersection = [...rubricTokens].filter((token) => filenameTokens.has(token)).length;
  return intersection / Math.min(rubricTokens.size, filenameTokens.size);
}

function documentMatchScore(transaction: BankTransaction, document: FiscalDocument): number {
  if (transaction.matchedDocId === document.id || (transaction.id && document.idTransacao === transaction.id)) return 1000;

  const txValue = Number(transaction.valor) || 0;
  const gross = Number(document.valorBruto) || 0;
  const net = Number(document.valorLiquido) || gross;
  const valueMatches = txValue > 0 && (Math.abs(gross - txValue) < 0.05 || Math.abs(net - txValue) < 0.05);
  const txControl = normalizeReconciliationText(transaction.controleNumero || transaction.documentoNumero);
  const docControl = normalizeReconciliationText(document.controleNumero);
  const controlMatches = Boolean(txControl && docControl && txControl === docControl);
  const supplierScore = providerSimilarity(transaction, document);
  const rubricScore = rubricFilenameSimilarity(transaction, document);

  let score = 0;
  if (valueMatches) score += 55;
  if (controlMatches) score += 35;
  if (supplierScore >= 0.5) score += 35;
  else if (supplierScore > 0) score += 15;
  if (rubricScore >= 0.5) score += 35;
  else if (rubricScore > 0) score += 15;
  if (document.evidenciaBancariaExtraida) score += 5;
  if (document.evidenciaFiscalExtraida) score += 5;
  return score;
}

function semanticDocumentMatchScore(transaction: BankTransaction, document: FiscalDocument): number {
  const txValue = Number(transaction.valor) || 0;
  const gross = Number(document.valorBruto) || 0;
  const net = Number(document.valorLiquido) || gross;
  const valueMatches = txValue > 0 && (Math.abs(gross - txValue) < 0.05 || Math.abs(net - txValue) < 0.05);
  const supplierScore = providerSimilarity(transaction, document);
  const rubricScore = rubricFilenameSimilarity(transaction, document);
  let score = valueMatches ? 55 : 0;
  if (supplierScore >= 0.5) score += 35;
  else if (supplierScore > 0) score += 15;
  if (rubricScore >= 0.5) score += 35;
  else if (rubricScore > 0) score += 15;
  return score;
}

/**
 * Executes a full real-time Tripartite Shadow Ledger reconciliation (OFX x Fiscal Docs x SALIC Rubrics)
 */
export function runRealtimeTripartiteReconciliation(
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  rubrics: BudgetRubric[],
  project?: PronacProject
): ShadowLedgerSyncResult {
  // Step 1: Self-heal zero values and missing fields
  const { healedDocs, healedTxs, healedCount } = selfHealDocumentsAndTransactions(
    transactions,
    documents,
    rubrics
  );

  const safeRubrics = Array.isArray(rubrics) ? [...rubrics] : [];
  const debitTxs = healedTxs.filter((t) => t && (t.tipo === "DEBITO" || t.tipoMovimento === "DEBIT" || !t.tipo));

  const updatedTransactions: BankTransaction[] = [];
  const updatedDocuments: FiscalDocument[] = [...healedDocs];
  const tripartiteEntries: TripartiteEntry[] = [];
  const usedDocIds = new Set<string>();
  const controlLinkedDocs = new Map<string, FiscalDocument>();
  const transactionsByControl = new Map<string, BankTransaction[]>();
  const documentsByControl = new Map<string, FiscalDocument[]>();

  debitTxs.forEach((transaction) => {
    const control = normalizeReconciliationText(transaction.controleNumero || transaction.documentoNumero);
    if (!control) return;
    transactionsByControl.set(control, [...(transactionsByControl.get(control) || []), transaction]);
  });
  updatedDocuments.forEach((document) => {
    const control = normalizeReconciliationText(document.controleNumero);
    if (!control) return;
    documentsByControl.set(control, [...(documentsByControl.get(control) || []), document]);
  });
  transactionsByControl.forEach((controlTransactions, control) => {
    const controlDocuments = documentsByControl.get(control) || [];
    if (controlTransactions.length === 1 && controlDocuments.length === 1) {
      const transaction = controlTransactions[0];
      const bestAlternateSemanticScore = updatedDocuments
        .filter((document) => document.id !== controlDocuments[0].id)
        .reduce((bestScore, document) => Math.max(bestScore, semanticDocumentMatchScore(transaction, document)), 0);

      // A number printed in both the spreadsheet and filename is useful evidence,
      // but it must not override a stronger supplier/rubric match when a duplicated
      // control shifts later filename numbers.
      if (bestAlternateSemanticScore < 35) {
        controlLinkedDocs.set(transaction.id, controlDocuments[0]);
      }
    }
  });
  let matchedCount = 0;
  let totalReconciledValue = 0;

  // Track rubric execution totals
  const rubricExecutionMap = new Map<string, number>();

  // Process all transactions
  healedTxs.forEach((tx, txIndex) => {
    if (!tx) return;

    if (tx.tipo === "CREDITO" || tx.tipoMovimento === "CREDIT" || tx.tipo === "RESGATE") {
      updatedTransactions.push({ ...tx });
      return;
    }

    const txVal = Number(tx.valor) || 0;
    const txDate = tx.data || tx.dataTransacao || "";

    // 1. Find best document candidate
    let matchedDoc: FiscalDocument | undefined = undefined;

    // Strategy A: Exact matchedDocId or idTransacao
    if (tx.matchedDocId) {
      matchedDoc = updatedDocuments.find((d) => d.id === tx.matchedDocId);
    }
    if (!matchedDoc && tx.id) {
      matchedDoc = updatedDocuments.find((d) => d.idTransacao === tx.id && !usedDocIds.has(d.id));
    }
    if (!matchedDoc && tx.id) {
      const controlLinked = controlLinkedDocs.get(tx.id);
      if (controlLinked && !usedDocIds.has(controlLinked.id)) matchedDoc = controlLinked;
    }

    if (!matchedDoc) {
      const candidates = updatedDocuments
        .filter((document) => !usedDocIds.has(document.id))
        .map((document) => ({ document, score: documentMatchScore(tx, document) }))
        .sort((left, right) => right.score - left.score);
      if (candidates[0]?.score >= 70) matchedDoc = candidates[0].document;
    }

    if (matchedDoc) {
      usedDocIds.add(matchedDoc.id);

      // Find rubric
      const rubric =
        safeRubrics.find((r) => r.id === matchedDoc?.rubricaId) ||
        safeRubrics.find((r) => r.id === tx.matchedRubricId) ||
        safeRubrics.find((r) => r.id === tx.idRubricaVinculada);

      const rubricId = rubric?.id || "";
      const rubricName = rubric?.nome || rubric?.nomeRubrica || "Rubrica não identificada";
      const rubricStage = rubric?.etapa || "Não identificada nos arquivos";

      // Update rubric execution
      if (rubricId) {
        const currentExec = rubricExecutionMap.get(rubricId) || 0;
        rubricExecutionMap.set(rubricId, currentExec + txVal);
      }

      const hasDocumentAttachment = tx.documentoFiscalCompleto !== false && Boolean(matchedDoc.arquivoNotaNome || matchedDoc.evidenciaFiscalExtraida);
      const hasBankReceipt = Boolean(tx.comprovanteUrl || tx.temComprovante || matchedDoc.evidenciaBancariaExtraida);
      const isResourceReturn = /devolu[cç][aã]o\s+(?:de\s+)?recursos/i.test(`${tx.favorecido || ""} ${tx.descricaoOriginalExtrato || ""} ${matchedDoc.arquivoNotaNome || ""}`);
      const hasRequiredEvidence = hasDocumentAttachment && hasBankReceipt;
      const isFullyReconciled = hasRequiredEvidence && (Boolean(rubricId) || isResourceReturn);
      const statusFinal = isFullyReconciled ? "CONCILIADO" : "PENDENTE";

      if (isFullyReconciled) {
        matchedCount++;
        totalReconciledValue += txVal;
      }

      // Mark transaction with real status
      const updatedTx: BankTransaction = {
        ...tx,
        status: statusFinal,
        statusConciliacao: statusFinal,
        matchedDocId: matchedDoc.id,
        matchedRubricId: rubricId,
        idDocumentoFiscalVinculado: matchedDoc.id,
        idRubricaVinculada: rubricId,
        favorecido: tx.favorecido || matchedDoc.fornecedorNome,
      };
      updatedTransactions.push(updatedTx);

      // Update doc links
      matchedDoc.idTransacao = tx.id;
      matchedDoc.rubricaId = rubricId;
      matchedDoc.idRubrica = rubricId;
      matchedDoc.rubricaNome = rubricName;
      matchedDoc.etapa = rubricStage;
      matchedDoc.statusComprovacao = isFullyReconciled ? "Completo" : "Pendente";

      // Create Tripartite Shadow Entry
      const periodStr = txDate ? txDate.slice(0, 7) : "";
      const lancamentoId = `LANC-${String(txIndex + 1).padStart(4, "0")}`;

      tripartiteEntries.push({
        id: `trip-${tx.id || txIndex}`,
        idLancamento: lancamentoId,
        periodo: periodStr,
        itemNumero: rubric?.itemNumero || "",
        etapa: rubricStage as any,
        rubricaId: rubricId,
        idRubrica: rubricId,
        rubricaNome: rubricName,
        descricaoRubrica: rubricName,
        idDocFiscal: matchedDoc.id,
        idTransacaoBB: tx.id,
        fornecedor: matchedDoc.fornecedorNome || tx.favorecido || "",
        cnpjCpf: matchedDoc.fornecedorCnpjCpf || tx.cnpjCpfFavorecido || "",
        tipoDoc: (matchedDoc.tipo as any) || "Documento importado",
        numeroDoc: matchedDoc.numeroDoc || "",
        dataEmissao: matchedDoc.dataEmissao || "",
        dataEmissaoDoc: matchedDoc.dataEmissao || "",
        dataCompensacao: txDate,
        dataPagamento: txDate,
        valorDebitoBB: txVal,
        valorBrutoDoc: Number(matchedDoc.valorBruto) || 0,
        valorLiquidoPagar: Number(matchedDoc.valorLiquido) || 0,
        valorLiquidoPago: txVal,
        retencoes: {
          iss: Number(matchedDoc.retencaoIss) || 0,
          irrf: Number(matchedDoc.retencaoIrrf) || 0,
          inss: Number(matchedDoc.retencaoInss) || 0,
          outras: 0,
        },
        documentoBancarioNumero: tx.documentoBancario || tx.documentoNumero || "",
        saldoRubricaApos: Math.max(0, (rubric?.valorAprovado || 0) - (rubricExecutionMap.get(rubricId) || 0)),
        checkTripe: {
          fiscalDocAnexo: hasDocumentAttachment,
          comprovanteBancarioAnexo: hasBankReceipt,
          relatorioExecucaoAnexo: false,
          rubricaValida: Boolean(rubricId),
        },
        statusTripartite: isFullyReconciled ? "CONCILIADO_PERFEITO" : "PENDENTE DE VÍNCULO",
        statusSalic: isFullyReconciled ? "Comprovado 100%" : "Pendente",
        statusGeral: statusFinal,
        status: statusFinal,
        anexoFiscalUrl: matchedDoc.arquivoNotaNome,
        anexoComprovanteUrl: matchedDoc.arquivoComprovanteNome,
        gedArquivos: [
          ...(matchedDoc.arquivoNotaNome
            ? [
                {
                  tipo: "NOTA_FISCAL" as const,
                  nomeArquivo: matchedDoc.arquivoNotaNome,
                  tamanhoFormatado: "1.2 MB",
                  status: hasDocumentAttachment ? ("VALIDADO" as const) : ("PENDENTE" as const),
                },
              ]
            : []),
          ...(matchedDoc.arquivoComprovanteNome
            ? [
                {
                  tipo: "COMPROVANTE_BANCARIO" as const,
                  nomeArquivo: matchedDoc.arquivoComprovanteNome,
                  tamanhoFormatado: "340 KB",
                  status: hasBankReceipt ? ("VALIDADO" as const) : ("PENDENTE" as const),
                },
              ]
            : []),
        ],
        justificativaRemanejamento: undefined,
      });
    } else {
      // Transação órfã (débito bancário sem nenhum documento vinculado)
      const orphanTx: BankTransaction = {
        ...tx,
        status: "PENDENTE",
        statusConciliacao: "PENDENTE",
        matchedDocId: undefined,
        idDocumentoFiscalVinculado: undefined,
      };
      updatedTransactions.push(orphanTx);
      
      const periodStr = txDate ? txDate.slice(0, 7) : "";
      const lancamentoId = `LANC-${String(txIndex + 1).padStart(4, "0")}`;
      
      tripartiteEntries.push({
        id: `trip-${tx.id || txIndex}`,
        idLancamento: lancamentoId,
        periodo: periodStr,
        itemNumero: "",
        etapa: "Não identificada nos arquivos",
        rubricaId: "",
        idRubrica: "",
        rubricaNome: "Pendente de Vínculo",
        descricaoRubrica: "Pendente de Vínculo",
        idDocFiscal: "",
        idTransacaoBB: tx.id,
        fornecedor: tx.favorecido || "",
        cnpjCpf: tx.cnpjCpfFavorecido || "",
        tipoDoc: "Documento importado" as any,
        numeroDoc: "",
        dataEmissao: txDate,
        dataEmissaoDoc: txDate,
        dataCompensacao: txDate,
        dataPagamento: txDate,
        valorDebitoBB: txVal,
        valorBrutoDoc: 0,
        valorLiquidoPagar: 0,
        valorLiquidoPago: txVal,
        retencoes: { iss: 0, irrf: 0, inss: 0, outras: 0 },
        documentoBancarioNumero: tx.documentoBancario || tx.documentoNumero || "",
        saldoRubricaApos: 0,
        checkTripe: {
          fiscalDocAnexo: false,
          comprovanteBancarioAnexo: Boolean(tx.comprovanteUrl || tx.temComprovante),
          relatorioExecucaoAnexo: false,
          rubricaValida: false,
        },
        statusTripartite: "PENDENTE DE VÍNCULO",
        statusSalic: "Pendente",
        statusGeral: "PENDENTE",
        status: "PENDENTE",
        anexoFiscalUrl: undefined,
        anexoComprovanteUrl: undefined,
        gedArquivos: [],
      });
    }
  });

  // Update Rubrics with new executed totals
  const updatedRubrics = safeRubrics.map((r) => {
    const executed = rubricExecutionMap.get(r.id) || r.valorExecutado || 0;
    const aprovado = Number(r.valorAprovado) || Number(r.valorTotalAprovado) || 0;
    return {
      ...r,
      valorExecutado: executed,
      limiteRemanejamento20: aprovado > 0 ? aprovado * 1.2 : executed * 1.2,
      statusExecucao: executed >= aprovado && aprovado > 0 ? "Concluído" : executed > 0 ? "Em Execução" : "Não Iniciado",
    };
  });

  // Generate audit alerts for 20% limit exceedances or tariffs
  const alerts: AuditAlert[] = [];
  updatedRubrics.forEach((r) => {
    const aprovado = Number(r.valorAprovado) || Number(r.valorTotalAprovado) || 0;
    const executado = r.valorExecutado || 0;
    if (aprovado > 0 && executado > aprovado * 1.2) {
      alerts.push({
        id: `alert-rem-${r.id}`,
        gravidade: "ALTA",
        categoria: "Remanejamento Orçamentário",
        titulo: `Remanejamento acima de 20% no item ${r.nome || r.nomeRubrica}`,
        descricao: `Executado (R$ ${executado.toFixed(2)}) excedeu o teto legal de 20% sobre o aprovado (R$ ${aprovado.toFixed(2)}).`,
        itemAfetado: r.nome || r.nomeRubrica || r.id,
        baseLegal: "Art. 48 da IN MinC nº 01/2023 - Remanejamentos superiores a 20% exigem anuência prévia.",
        acaoRecomendada: "Submeter pedido de readequação orçamentária no SALIC ou justificar o remanejamento extraordinário.",
        justificativaSugeridaSalic: `Justifica-se a adequação orçamentária no item ${r.nome} devido à indispensabilidade técnica para a execução do plano aprovado.`,
        resolvido: false,
      });
    }
  });

  alerts.push({
    id: "alert-info-tripartite",
    gravidade: "INFO",
    categoria: "Conciliação Tripartite",
    titulo: "Resultado da conciliação por evidências",
    descricao: `${matchedCount} de ${debitTxs.length} débitos possuem documento, comprovante bancário e rubrica identificados nos arquivos importados.`,
    itemAfetado: "Extrato x Documentos x SALIC",
    baseLegal: "Art. 68 da IN MinC nº 01/2023",
    acaoRecomendada: matchedCount === debitTxs.length ? "Revisar a amostragem antes da exportação." : "Revisar os vínculos pendentes e anexar as evidências ausentes.",
    justificativaSugeridaSalic: "Resultado calculado exclusivamente a partir das evidências encontradas nos arquivos importados.",
    resolvido: matchedCount === debitTxs.length,
  });

  return {
    transactions: updatedTransactions,
    documents: updatedDocuments,
    rubrics: updatedRubrics,
    tripartiteEntries,
    alerts,
    healedCount,
    matchedCount,
    totalReconciledValue,
  };
}
