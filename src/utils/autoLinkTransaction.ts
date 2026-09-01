import type { BankTransaction } from "../types";

export function linkFiscalDocumentForReview(
  transaction: BankTransaction,
  documentId: string,
): BankTransaction {
  return {
    ...transaction,
    matchedDocId: documentId,
    idDocumentoFiscalVinculado: documentId,
  };
}
