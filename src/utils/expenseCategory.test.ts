import { describe, expect, it } from "vitest";
import { initialRubrics, initialTransactions } from "../data/mockData";
import { getExpenseCategoryCounts, resolveExpenseCategory } from "./expenseCategory";
import { isTransactionReconciled } from "./projectFinancialSummary";

describe("expense category classification", () => {
  it("classifies every Project 1961 pending transaction exactly once by expense nature", () => {
    const pending = initialTransactions["proj-1961"].filter(
      (transaction) => transaction.tipo === "DEBITO" && !isTransactionReconciled(transaction),
    );
    const rubrics = initialRubrics["proj-1961"];
    const counts = getExpenseCategoryCounts(pending, rubrics);

    expect(Object.fromEntries(counts)).toEqual({
      ALIMENTACAO_DIARIAS: 25,
      ROTEIRO_DIRECAO: 21,
      HOSPEDAGEM: 10,
      PASSAGENS_AEREAS: 8,
      PRODUCAO_EQUIPE: 8,
      TRANSPORTE_TERRESTRE: 3,
      PRESTACAO_CONTAS: 3,
      MATERIAL_CONSUMO: 2,
      EDICAO_FINALIZACAO: 2,
    });
    expect(pending.map((transaction) => resolveExpenseCategory(transaction, rubrics))).toHaveLength(82);
  });
});
