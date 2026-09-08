import { describe, expect, it } from "vitest";
import { applyTripartiteRateio } from "./tripartiteRateio";

const entry = {
  id: "trip-1",
  idLancamento: "LANC-0002",
  idRubrica: "rub-origem",
  idDocFiscal: "doc-262",
  valorDebitoBB: 11000,
  valorBrutoDoc: 11000,
  valorLiquidoPagar: 10000,
  retencoes: { irrf: 500, iss: 500, inss: 0, outras: 0 },
};

describe("applyTripartiteRateio", () => {
  it("creates a searchable child entry and preserves all financial totals", () => {
    const result = applyTripartiteRateio({
      entries: [entry],
      documents: [{ id: "doc-262", splits: [] } as any],
      entry,
      destinationRubric: { id: "rub-destino", nome: "Direção", etapa: "Produção" } as any,
      amount: 5500,
      justification: "Divisão aprovada do serviço",
    });

    expect(result.entries.map((item) => item.idLancamento)).toEqual(["LANC-0002", "LANC-0002-R01"]);
    expect(result.entries.reduce((sum, item) => sum + Number(item.valorDebitoBB), 0)).toBe(11000);
    expect(result.entries.reduce((sum, item) => sum + Number(item.valorBrutoDoc), 0)).toBe(11000);
    expect(result.createdEntry.idRubrica).toBe("rub-destino");
    expect(result.createdEntry.observacoes).toContain("Divisão aprovada do serviço");
    expect(result.documents[0].splits).toEqual([
      { rubricId: "rub-destino", value: 5500, justification: "Divisão aprovada do serviço" },
    ]);
  });

  it("rejects the current rubric, invalid amounts and missing justification", () => {
    expect(() => applyTripartiteRateio({
      entries: [entry], documents: [], entry,
      destinationRubric: { id: "rub-origem", nome: "Origem" } as any,
      amount: 5500, justification: "Teste",
    })).toThrow("diferente da atual");

    expect(() => applyTripartiteRateio({
      entries: [entry], documents: [], entry,
      destinationRubric: { id: "rub-destino", nome: "Destino" } as any,
      amount: 11000, justification: "Teste",
    })).toThrow("menor que o valor");

    expect(() => applyTripartiteRateio({
      entries: [entry], documents: [], entry,
      destinationRubric: { id: "rub-destino", nome: "Destino" } as any,
      amount: 5500, justification: "",
    })).toThrow("justificativa");
  });
});
