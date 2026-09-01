import type { BankTransaction } from "../types";

export const PROJECT_1961_PENDING_MAPPING_VERSION = "2026-08-22-v1";

const VERIFIED_PENDING_CONTROL_NUMBERS = new Set([
  8,
  23,
  24,
  ...Array.from({ length: 8 }, (_, index) => 25 + index),
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  ...Array.from({ length: 6 }, (_, index) => 45 + index),
  51,
  53,
  54,
  57,
  59,
  ...Array.from({ length: 5 }, (_, index) => 65 + index),
  70,
  75,
  76,
  77,
  ...Array.from({ length: 8 }, (_, index) => 78 + index),
  100,
  108,
  109,
  ...Array.from({ length: 5 }, (_, index) => 113 + index),
  118,
  122,
  ...Array.from({ length: 3 }, (_, index) => 131 + index),
  135,
  ...Array.from({ length: 6 }, (_, index) => 138 + index),
  147,
  149,
  153,
  158,
  159,
  164,
  ...Array.from({ length: 5 }, (_, index) => 166 + index),
  172,
  173,
  176,
]);

function getControlNumber(transaction: BankTransaction): number | null {
  const match = String(transaction.documentoNumero || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function applyProject1961PendingMapping(
  transactions: BankTransaction[],
): BankTransaction[] {
  return transactions.map((transaction) => {
    const controlNumber = getControlNumber(transaction);
    const isDebit =
      transaction.tipo === "DEBITO" ||
      transaction.tipo === "TARIFA" ||
      !transaction.tipo ||
      transaction.tipoMovimento === "DEBIT";

    if (!isDebit || controlNumber === null || !VERIFIED_PENDING_CONTROL_NUMBERS.has(controlNumber)) {
      return transaction;
    }

    return {
      ...transaction,
      status: "PENDENTE",
      statusConciliacao: "PENDENTE",
      documentoFiscalCompleto: false,
      pendenciaMotivo: "Comprovante fiscal incompleto: apenas comprovante bancário identificado",
      pendenciaOrigem: `AUDITORIA_VALIDADA_${PROJECT_1961_PENDING_MAPPING_VERSION}`,
    };
  });
}
