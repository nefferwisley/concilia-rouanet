import { describe, it, expect } from "vitest";
import {
  sortTransactionsActionOriented,
  filterTransactions,
  type SortCriteria,
  type FilterPreset,
} from "./reconciliationFilters";
import type { BankTransaction, BudgetRubric } from "../types";

describe("reconciliationFilters", () => {
  const mockTransactions: BankTransaction[] = [
    {
      id: "tx-reconciled",
      data: "2024-05-15",
      tipo: "DEBITO",
      valor: 500,
      status: "CONCILIADO",
      matchedDocId: "doc-1",
      favorecido: "Fornecedor Regular",
    },
    {
      id: "tx-glosa",
      data: "2024-05-20",
      tipo: "DEBITO",
      valor: 1000,
      status: "ALERTA_GLOSA",
      alertaRisco: "Despesa fora da vigência",
      favorecido: "Fornecedor com Glosa",
    },
    {
      id: "tx-no-nf",
      data: "2024-05-10",
      tipo: "DEBITO",
      valor: 8000,
      status: "PENDENTE",
      favorecido: "Fornecedor Sem Nota",
    },
    {
      id: "tx-no-nf-older",
      data: "2024-05-01",
      tipo: "DEBITO",
      valor: 2000,
      status: "PENDENTE",
      favorecido: "Fornecedor Mais Antigo",
    },
  ];

  it("applies canonical action order: glosa -> sem NF -> maior valor -> mais antigo", () => {
    const sorted = sortTransactionsActionOriented(mockTransactions, "ACTION_DEFAULT", true);

    // 1st must be glosa
    expect(sorted[0].id).toBe("tx-glosa");

    // Next must be sem NF ordered by higher value
    expect(sorted[1].id).toBe("tx-no-nf"); // 8000 vs 2000
    expect(sorted[2].id).toBe("tx-no-nf-older");

    // Last is reconciled
    expect(sorted[3].id).toBe("tx-reconciled");
  });

  it("filters with SEM_NF preset accurately", () => {
    const rubrics: BudgetRubric[] = [];
    const filtered = filterTransactions(mockTransactions, rubrics, {
      preset: "SEM_NF",
    });

    expect(filtered.length).toBe(3);
    expect(filtered.some((t) => t.id === "tx-reconciled")).toBe(false);
  });

  it("sorts by VALUE_DESC when requested", () => {
    const sorted = sortTransactionsActionOriented(mockTransactions, "VALUE_DESC", true);
    expect(sorted[0].valor).toBe(8000);
    expect(sorted[1].valor).toBe(2000);
    expect(sorted[2].valor).toBe(1000);
    expect(sorted[3].valor).toBe(500);
  });
});
