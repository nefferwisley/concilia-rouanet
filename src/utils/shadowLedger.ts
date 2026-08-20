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

const isSummaryItem = (item: BankTransaction | FiscalDocument): boolean => {
  const text = [
    item.descricaoOriginalExtrato,
    item.favorecido,
    item.numeroDoc,
    item.documentoNumero,
    item.descricaoServico,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ["pagamentos realizados", "total rendimento", "total geral", "subtotal"].some(
    (marker) => text.includes(marker),
  );
};

/**
 * Kept as a compatibility boundary for callers that used the old "self-heal" flow.
 * Missing financial evidence is never inferred or manufactured.
 */
export function selfHealDocumentsAndTransactions(
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  _rubrics: BudgetRubric[],
): {
  healedDocs: FiscalDocument[];
  healedTxs: BankTransaction[];
  healedCount: number;
} {
  return {
    healedDocs: (Array.isArray(documents) ? documents : []).filter((doc) => !isSummaryItem(doc)),
    healedTxs: (Array.isArray(transactions) ? transactions : []).filter((tx) => !isSummaryItem(tx)),
    healedCount: 0,
  };
}

const nonBlank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const transactionDate = (transaction: BankTransaction): string | undefined => {
  const value = transaction.data || transaction.dataTransacao;
  return nonBlank(value) ? value : undefined;
};

/**
 * Reconciles only explicit source links. Values, file names, suppliers and rubrics
 * are never guessed from position, similarity, defaults or generated identifiers.
 */
export function runRealtimeTripartiteReconciliation(
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  rubrics: BudgetRubric[],
  _project?: PronacProject,
): ShadowLedgerSyncResult {
  const { healedDocs, healedTxs } = selfHealDocumentsAndTransactions(
    transactions,
    documents,
    rubrics,
  );
  const safeRubrics = Array.isArray(rubrics) ? rubrics : [];
  const tripartiteEntries: TripartiteEntry[] = [];
  let matchedCount = 0;
  let totalReconciledValue = 0;

  const updatedTransactions = healedTxs.map((transaction) => {
    const isDebit =
      transaction.tipo === "DEBITO" ||
      transaction.tipoMovimento === "DEBIT" ||
      transaction.tipo === "TARIFA";
    if (!isDebit) return transaction;

    const explicitlyLinkedDocument =
      (nonBlank(transaction.matchedDocId) &&
        healedDocs.find((document) => document.id === transaction.matchedDocId)) ||
      (nonBlank(transaction.idDocumentoFiscalVinculado) &&
        healedDocs.find(
          (document) => document.id === transaction.idDocumentoFiscalVinculado,
        )) ||
      healedDocs.find(
        (document) => nonBlank(document.idTransacao) && document.idTransacao === transaction.id,
      );

    if (!explicitlyLinkedDocument) return transaction;

    const explicitRubricId =
      transaction.matchedRubricId ||
      transaction.idRubricaVinculada ||
      explicitlyLinkedDocument.rubricaId ||
      explicitlyLinkedDocument.idRubrica;
    const explicitRubric = nonBlank(explicitRubricId)
      ? safeRubrics.find((rubric) => rubric.id === explicitRubricId)
      : undefined;

    const hasFiscalDocument =
      nonBlank(explicitlyLinkedDocument.numeroDoc) &&
      Number(explicitlyLinkedDocument.valorBruto) > 0 &&
      nonBlank(explicitlyLinkedDocument.arquivoNotaNome);
    const hasBankReceipt = Boolean(
      transaction.temComprovante ||
        nonBlank(transaction.comprovanteUrl) ||
        nonBlank(explicitlyLinkedDocument.arquivoComprovanteNome),
    );
    const isFullyReconciled = hasFiscalDocument && hasBankReceipt && Boolean(explicitRubric);
    const status = isFullyReconciled ? "CONCILIADO" : "PENDENTE";
    const amount = Number(transaction.valor) || 0;

    if (isFullyReconciled) {
      matchedCount += 1;
      totalReconciledValue += amount;
    }

    const date = transactionDate(transaction);
    const retentions = {
      irrf: Number(explicitlyLinkedDocument.retencaoIrrf) || 0,
      iss: Number(explicitlyLinkedDocument.retencaoIss) || 0,
      inss: Number(explicitlyLinkedDocument.retencaoInss) || 0,
      outras: Number(explicitlyLinkedDocument.retencoes?.outras) || 0,
    };
    const hasRetentions = Object.values(retentions).some((value) => value > 0);

    tripartiteEntries.push({
      id: `trip-${transaction.id}-${explicitlyLinkedDocument.id}`,
      ...(date ? { periodo: date.slice(0, 7), dataCompensacao: date } : {}),
      ...(explicitRubric
        ? {
            idRubrica: explicitRubric.id,
            descricaoRubrica: explicitRubric.nome || explicitRubric.nomeRubrica,
          }
        : {}),
      idDocFiscal: explicitlyLinkedDocument.id,
      idTransacaoBB: transaction.id,
      ...(nonBlank(explicitlyLinkedDocument.tipo)
        ? { tipoDoc: explicitlyLinkedDocument.tipo }
        : {}),
      ...(nonBlank(explicitlyLinkedDocument.numeroDoc)
        ? { numeroDoc: explicitlyLinkedDocument.numeroDoc }
        : {}),
      ...(nonBlank(explicitlyLinkedDocument.dataEmissao)
        ? { dataEmissao: explicitlyLinkedDocument.dataEmissao }
        : {}),
      ...(nonBlank(explicitlyLinkedDocument.fornecedorNome)
        ? { fornecedor: explicitlyLinkedDocument.fornecedorNome }
        : {}),
      ...(nonBlank(explicitlyLinkedDocument.fornecedorCnpjCpf)
        ? { cnpjCpf: explicitlyLinkedDocument.fornecedorCnpjCpf }
        : {}),
      valorDebitoBB: amount,
      valorBrutoDoc: Number(explicitlyLinkedDocument.valorBruto) || 0,
      valorLiquidoPagar: Number(explicitlyLinkedDocument.valorLiquido) || 0,
      ...(hasRetentions ? { retencoes: retentions } : {}),
      ...(nonBlank(transaction.documentoBancario)
        ? { documentoBancarioNumero: transaction.documentoBancario }
        : {}),
      statusTripartite: isFullyReconciled ? "CONCILIADO_PERFEITO" : "PENDENTE DE VÍNCULO",
      statusSalic: "Pendente",
      checkTripe: {
        fiscalDocAnexo: hasFiscalDocument,
        comprovanteBancarioAnexo: hasBankReceipt,
        relatorioExecucaoAnexo: Boolean(transaction.relatorioExecucaoAnexo),
        rubricaValida: Boolean(explicitRubric),
      },
      statusGeral: status,
      status,
      ...(nonBlank(explicitlyLinkedDocument.arquivoNotaNome)
        ? { anexoFiscalUrl: explicitlyLinkedDocument.arquivoNotaNome }
        : {}),
      ...(nonBlank(explicitlyLinkedDocument.arquivoComprovanteNome)
        ? { anexoComprovanteUrl: explicitlyLinkedDocument.arquivoComprovanteNome }
        : {}),
      gedArquivos: [],
    });

    return {
      ...transaction,
      status,
      statusConciliacao: status,
      matchedDocId: explicitlyLinkedDocument.id,
      idDocumentoFiscalVinculado: explicitlyLinkedDocument.id,
      ...(explicitRubric
        ? {
            matchedRubricId: explicitRubric.id,
            idRubricaVinculada: explicitRubric.id,
          }
        : {}),
    };
  });

  return {
    transactions: updatedTransactions,
    documents: healedDocs,
    rubrics: safeRubrics,
    tripartiteEntries,
    alerts: [],
    healedCount: 0,
    matchedCount,
    totalReconciledValue,
  };
}
