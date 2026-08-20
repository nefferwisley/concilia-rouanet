const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface DocumentItem {
  id: string;
  projectId: string;
  fileId: string;
  fileName: string;
  relativePath: string;
  documentType: string;
  classificationMethod: string;
  confidence: number;
  status: string;
  createdAt: string;
}

export interface IssueItem {
  id: string;
  projectId: string;
  reconciliationId?: string | null;
  issueCode: string;
  severity: "BLOCKER" | "WARNING" | "INFO";
  status: "OPEN" | "RESOLVED" | "JUSTIFIED";
  description: string;
  createdAt: string;
}

export async function fetchProjectDocuments(
  projectId: string,
  accessToken: string,
): Promise<DocumentItem[]> {
  const res = await fetch(`${API_URL}/api/v1/projetos/${projectId}/documentos`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Erro ao buscar documentos do projeto.");
  }

  const data = await res.json();
  return (data.documentos || []).map((d: any) => ({
    id: d.id,
    projectId: d.projeto_id,
    fileId: d.file_id,
    fileName: d.file_name || d.nome || "Documento",
    relativePath: d.relative_path || "",
    documentType: d.document_type || "UNKNOWN",
    classificationMethod: d.classification_method || "DETERMINISTIC",
    confidence: d.confidence || 1.0,
    status: d.status || "IDENTIFIED",
    createdAt: d.created_at || "",
  }));
}

export async function fetchProjectIssues(
  projectId: string,
  accessToken: string,
): Promise<IssueItem[]> {
  const res = await fetch(`${API_URL}/api/v1/projetos/${projectId}/issues`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return (data.items || []).map((i: any) => ({
    id: i.id,
    projectId: i.project_id,
    reconciliationId: i.reconciliation_id,
    issueCode: i.issue_code,
    severity: i.severity,
    status: i.status,
    description: i.description,
    createdAt: i.created_at,
  }));
}
