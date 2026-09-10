import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BudgetBulletChart } from "./BudgetBulletChart";
import { MonthlyReconciliationChart } from "./MonthlyReconciliationChart";
import { BalanceEvolutionChart } from "./BalanceEvolutionChart";
import { initialProjects, initialTransactions } from "../../data/mockData";

describe("Visual Charts Suite", () => {
  describe("BudgetBulletChart", () => {
    it("renders unclipped bar for overspend without throwing", () => {
      const markup = renderToStaticMarkup(
        <BudgetBulletChart
          label="Produção / Execução"
          approved={100_000}
          executed={120_000}
          limit20={120_000}
        />
      );

      expect(markup).toContain("Produção / Execução");
      expect(markup).toContain("Estouro Orçamentário");
      expect(markup).toContain("120.0% executado");
    });

    it("renders normal execution within budget", () => {
      const markup = renderToStaticMarkup(
        <BudgetBulletChart
          label="Pré-Produção"
          approved={50_000}
          executed={30_000}
        />
      );

      expect(markup).toContain("Pré-Produção");
      expect(markup).toContain("60.0% executado");
      expect(markup).not.toContain("Estouro Orçamentário");
    });
  });

  describe("MonthlyReconciliationChart", () => {
    it("aggregates transactions by month and shows compliance", () => {
      const projectTransactions = initialTransactions["proj-1961"] || [];
      const markup = renderToStaticMarkup(
        <MonthlyReconciliationChart transactions={projectTransactions} />
      );

      expect(markup).toContain("Evolução Mensal de Conciliação");
      expect(markup).toContain("Conciliado");
      expect(markup).toContain("Pendente");
    });
  });

  describe("BalanceEvolutionChart", () => {
    it("renders temporal SVG trajectory of project balance", () => {
      const project = initialProjects.find((p) => p.id === "proj-1961")!;
      const projectTransactions = initialTransactions["proj-1961"] || [];
      const markup = renderToStaticMarkup(
        <BalanceEvolutionChart transactions={projectTransactions} project={project} />
      );

      expect(markup).toContain("Linha Temporal do Saldo em Conta");
      expect(markup).toContain("svg");
    });
  });
});
