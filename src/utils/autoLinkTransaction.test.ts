import { describe, expect, it } from "vitest";
import type { BankTransaction } from "../types";
import { linkFiscalDocumentForReview } from "./autoLinkTransaction";

describe("linkFiscalDocumentForReview", () => {
  it("attaches the document without completing reconciliation", () => {
    const transaction: BankTransaction = {
      id: "tx-1",
      tipo: "DEBITO",
      valor: 1_200,
      status: "PENDENTE",
      statusConciliacao: "Pendente",
    };

    const linked = linkFiscalDocumentForReview(transaction, "doc-1");

    expect(linked).toEqual({
      ...transaction,
      matchedDocId: "doc-1",
      idDocumentoFiscalVinculado: "doc-1",
    });
    expect(linked.status).toBe("PENDENTE");
    expect(linked.statusConciliacao).toBe("Pendente");
  });
});
