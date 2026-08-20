export interface ReconciliationItem {
  id: string;
  projectId: string;
  declaredEntryId?: string | null;
  valorDeclarado?: number | null;
  valorConciliado?: number | null;
  status: "PENDING" | "HUMAN_CONFIRMATION_REQUIRED" | "APPROVED" | "REJECTED" | "DIVERGENT";
  confidence: number;
  fornecedorDeclarado?: string | null;
  dataDeclarada?: string | null;
  documentoDeclarado?: string | null;
  rubricaDeclarada?: string | null;
  createdAt: string;
}

export interface EvidenceLink {
  id: string;
  evidenceType: "DECLARED_ROW" | "BANK_MOVEMENT" | "FISCAL_DOCUMENT" | "PAYMENT_PROOF" | "CONTRACT";
  evidenceId: string;
  matchType: "DETERMINISTIC" | "PROBABILISTIC" | "MANUAL";
  score: number;
}

export interface ReconciliationDetailItem extends ReconciliationItem {
  links: EvidenceLink[];
  issues: Array<{
    id: string;
    issueCode: string;
    severity: "BLOCKER" | "WARNING" | "INFO";
    status: "OPEN" | "RESOLVED" | "JUSTIFIED";
    description: string;
    createdAt: string;
  }>;
}

export interface ReconciliationListResponse {
  items: ReconciliationItem[];
  nextCursor?: string | null;
  totalCount: number;
}
