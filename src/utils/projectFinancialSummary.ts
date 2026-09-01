import type { BankTransaction } from "../types";

export interface ProjectFinancialSummary {
  totalExecutado: number;
  totalConciliado: number;
  totalAConciliar: number;
  debitCount: number;
  reconciledDebitCount: number;
  pendingDebitCount: number;
}

function isDebit(transaction: BankTransaction): boolean {
  return (
    transaction.tipo === "DEBITO" ||
    transaction.tipo === "TARIFA" ||
    !transaction.tipo ||
    transaction.tipoMovimento === "DEBIT"
  );
}

export function isTransactionReconciled(transaction: BankTransaction): boolean {
  if (transaction.documentoFiscalCompleto === false) return false;

  const hasReconciledStatus =
    transaction.status === "CONCILIADO" ||
    transaction.statusConciliacao === "CONCILIADO" ||
    transaction.statusConciliacao === "Conciliado";
  const hasFiscalDocument = Boolean(
    transaction.matchedDocId || transaction.idDocumentoFiscalVinculado,
  );

  return hasReconciledStatus && hasFiscalDocument;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateProjectFinancialSummary(
  transactions: BankTransaction[],
): ProjectFinancialSummary {
  const debits = transactions.filter(isDebit);
  const reconciledDebits = debits.filter(isTransactionReconciled);
  const totalExecutado = roundCurrency(
    debits.reduce((sum, transaction) => sum + (Number(transaction.valor) || 0), 0),
  );
  const totalConciliado = roundCurrency(
    reconciledDebits.reduce((sum, transaction) => sum + (Number(transaction.valor) || 0), 0),
  );

  return {
    totalExecutado,
    totalConciliado,
    totalAConciliar: roundCurrency(Math.max(0, totalExecutado - totalConciliado)),
    debitCount: debits.length,
    reconciledDebitCount: reconciledDebits.length,
    pendingDebitCount: debits.length - reconciledDebits.length,
  };
}
