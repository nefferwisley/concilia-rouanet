import type {
  BankTransaction,
  BudgetRubric,
  FiscalDocument,
  PronacProject,
  TripartiteEntry,
} from "../types";

export const FINANCIAL_METRICS_UNAVAILABLE_MESSAGE = "Ainda não calculado";

export interface FinancialEvidence {
  rubrics?: BudgetRubric[];
  transactions?: BankTransaction[];
  documents?: FiscalDocument[];
  tripartiteEntries?: TripartiteEntry[];
}

export class FinancialMetricsUnavailableError extends Error {
  constructor() {
    super(
      "Ainda não calculado: a exportação financeira exige status REVIEW ou READY e evidência real.",
    );
    this.name = "FinancialMetricsUnavailableError";
  }
}

export function hasRealFinancialEvidence(evidence: FinancialEvidence): boolean {
  return [
    evidence.rubrics,
    evidence.transactions,
    evidence.documents,
    evidence.tripartiteEntries,
  ].some((collection) => Array.isArray(collection) && collection.length > 0);
}

export function canRevealFinancialMetrics(
  project: PronacProject,
  evidence: FinancialEvidence,
): boolean {
  const statusAllowsMetrics = project.status === "REVIEW" || project.status === "READY";
  return statusAllowsMetrics && hasRealFinancialEvidence(evidence);
}

export function assertFinancialMetricsAvailable(
  project: PronacProject,
  evidence: FinancialEvidence,
): void {
  if (!canRevealFinancialMetrics(project, evidence)) {
    throw new FinancialMetricsUnavailableError();
  }
}
