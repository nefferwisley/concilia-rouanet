import React from "react";
import type {
  BankTransaction,
  BudgetRubric,
  FiscalDocument,
  PronacProject,
  TripartiteEntry,
} from "../types";
import {
  canRevealFinancialMetrics,
  FINANCIAL_METRICS_UNAVAILABLE_MESSAGE,
} from "../utils/financialMetricGate";

interface FinancialDataGateProps {
  project: PronacProject;
  rubrics?: BudgetRubric[];
  transactions?: BankTransaction[];
  documents?: FiscalDocument[];
  tripartiteEntries?: TripartiteEntry[];
  children: React.ReactNode;
}

export const FinancialDataGate: React.FC<FinancialDataGateProps> = ({
  project,
  rubrics,
  transactions,
  documents,
  tripartiteEntries,
  children,
}) => {
  const available = canRevealFinancialMetrics(project, {
    rubrics,
    transactions,
    documents,
    tripartiteEntries,
  });

  if (available) return <>{children}</>;

  return (
    <section
      role="status"
      className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"
    >
      <h2 className="text-lg font-bold text-slate-100">
        {FINANCIAL_METRICS_UNAVAILABLE_MESSAGE}
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Os valores e relatórios serão liberados após o processamento, a revisão e a presença de
        evidências financeiras reais.
      </p>
    </section>
  );
};
