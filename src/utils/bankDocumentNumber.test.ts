import { describe, expect, it } from "vitest";
import { formatBankDocumentNumber, resolveBankDocumentNumber } from "./bankDocumentNumber";

describe("bankDocumentNumber", () => {
  it("formats the six digits printed by SISBB", () => {
    expect(formatBankDocumentNumber("110401")).toBe("110.401");
  });

  it("uses the verified Project 1961 ledger instead of spreadsheet controls", () => {
    expect(resolveBankDocumentNumber({
      id: "tx-1961-1",
      tipo: "DEBITO",
      valor: 11_000,
      documentoNumero: "DOC-1",
    }, undefined, "proj-1961")).toBe("110.401");
  });

  it("does not present an unrelated spreadsheet control as a bank document", () => {
    expect(resolveBankDocumentNumber({
      id: "tx-other-1",
      tipo: "DEBITO",
      valor: 11_000,
      documentoNumero: "1",
    }, undefined, "proj-other")).toBe("");
  });

  it("prefers the number extracted from the linked payment proof", () => {
    expect(resolveBankDocumentNumber(
      { id: "tx-new", tipo: "DEBITO", valor: 100, documentoNumero: "7" },
      {
        id: "doc-new",
        tipo: "Documento importado",
        numeroDoc: "NF-9",
        dataEmissao: "2026-09-08",
        fornecedorNome: "Prestador",
        fornecedorCnpjCpf: "",
        descricaoServico: "Serviço",
        valorBruto: 100,
        documentoBancarioNumero: "110401",
      },
    )).toBe("110.401");
  });
});
