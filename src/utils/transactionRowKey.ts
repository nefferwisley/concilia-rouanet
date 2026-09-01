import type { BankTransaction } from "../types";

export const getTransactionRowKey = (transaction: BankTransaction, index: number): string =>
  [
    transaction.id || "transaction",
    transaction.documentoBancario || transaction.documentoNumero || "sem-documento",
    Number(transaction.valor) || 0,
    transaction.data || "sem-data",
    index,
  ].join("::");
