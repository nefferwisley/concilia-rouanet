import { describe, it, expect } from "vitest";
import { sanitizeTransactions, sanitizeDocuments } from "./sanitizeFinancialData";
import { initialTransactions, initialDocuments } from "../data/mockData";

describe("sanitizeFinancialData", () => {
  it("eliminates all 00.000.000/0000-00 CNPJ/CPF entries and formats authentic identifiers", () => {
    const rawTxs = initialTransactions["proj-1961"] || [];
    const sanitizedTxs = sanitizeTransactions(rawTxs);

    expect(sanitizedTxs.length).toBeGreaterThan(0);

    const zeroCount = sanitizedTxs.filter(
      (t) =>
        !t.cnpjCpfFavorecido ||
        t.cnpjCpfFavorecido === "00.000.000/0000-00" ||
        t.cnpjCpfFavorecido === "000.000.000-00"
    ).length;

    expect(zeroCount).toBe(0);

    // Verify Amir Labaki has authentic CNPJ
    const amirTx = sanitizedTxs.find((t) => t.favorecido?.includes("Amir Labaki"));
    expect(amirTx).toBeDefined();
    expect(amirTx?.cnpjCpfFavorecido).toBe("05.518.874/0001-41");
  });

  it("sanitizes documents and guarantees valid supplier CNPJ/CPF", () => {
    const rawDocs = initialDocuments["proj-1961"] || [];
    const sanitizedDocs = sanitizeDocuments(rawDocs);

    expect(sanitizedDocs.length).toBeGreaterThan(0);

    const zeroCount = sanitizedDocs.filter(
      (d) =>
        !d.fornecedorCnpjCpf ||
        d.fornecedorCnpjCpf === "00.000.000/0000-00" ||
        d.fornecedorCnpjCpf === "000.000.000-00"
    ).length;

    expect(zeroCount).toBe(0);

    // Verify Monica Guimaraes has authentic CNPJ
    const monicaDoc = sanitizedDocs.find((d) => d.fornecedorNome?.includes("Mônica Guimarães"));
    expect(monicaDoc).toBeDefined();
    expect(monicaDoc?.fornecedorCnpjCpf).toBe("05.518.874/0001-41");
  });
});
