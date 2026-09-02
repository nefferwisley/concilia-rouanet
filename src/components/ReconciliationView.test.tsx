import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialDocuments, initialProjects, initialRubrics, initialTransactions } from "../data/mockData";
import { isTransactionReconciled } from "../utils/projectFinancialSummary";
import { getTransactionRowKey } from "../utils/transactionRowKey";
import { ReconciliationView } from "./ReconciliationView";

describe("ReconciliationView verified pending transactions", () => {
  it("uses the same 96 reconciled and 82 pending rule as the project dashboard", () => {
    const project = initialProjects.find((item) => item.id === "proj-1961");
    expect(project).toBeDefined();

    const markup = renderToStaticMarkup(
      <ReconciliationView
        project={project!}
        transactions={initialTransactions["proj-1961"]}
        documents={initialDocuments["proj-1961"]}
        rubrics={initialRubrics["proj-1961"]}
        onUpdateTransactions={() => undefined}
        onUpdateDocuments={() => undefined}
      />,
    );

    expect(markup).toContain("96 de 178 comprovados");
    expect(markup).toContain("Movimentos sem extrato bancário");
    expect(markup).toContain("Aguardando extrato OFX/CSV");
    expect(markup).toContain("🟡 Pendentes (82)");
    expect(markup).toContain("Categoria da despesa");
    expect(markup).toContain("Alimentação e diárias (25)");
    expect(markup).toContain("Passagens aéreas (8)");
  });

  it("gives every pending row a stable unique visual identity", () => {
    const pending = initialTransactions["proj-1961"].filter(
      (transaction) => transaction.tipo === "DEBITO" && !isTransactionReconciled(transaction),
    );
    const rowKeys = pending.map(getTransactionRowKey);

    expect(new Set(rowKeys).size).toBe(82);
    expect(rowKeys).toHaveLength(82);
  });
});
