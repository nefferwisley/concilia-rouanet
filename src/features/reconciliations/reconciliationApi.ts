import type {
  ReconciliationDetailItem,
  ReconciliationListResponse,
} from "./reconciliationTypes";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchReconciliations(
  projectId: string,
  accessToken: string,
  options: { limit?: number; after?: string; status?: string; search?: string } = {},
): Promise<ReconciliationListResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.after) params.set("after", options.after);
  if (options.status) params.set("status", options.status);
  if (options.search) params.set("search", options.search);

  const res = await fetch(
    `${API_URL}/api/v1/projetos/${projectId}/conciliacoes?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error("Erro ao buscar lançamentos de conciliação.");
  }

  const data = await res.json();
  return {
    items: data.items.map((i: any) => ({
      id: i.id,
      projectId: i.projeto_id,
      declaredEntryId: i.declared_entry_id,
      valorDeclarado: i.valor_declarado,
      valorConciliado: i.valor_conciliado,
      status: i.status,
      confidence: i.confidence,
      fornecedorDeclarado: i.fornecedor_declarado,
      dataDeclarada: i.data_declarada,
      documentoDeclarado: i.documento_declarado,
      rubricaDeclarada: i.rubrica_declarada,
      createdAt: i.created_at,
    })),
    nextCursor: data.next_cursor,
    totalCount: data.total_count,
  };
}

export async function fetchReconciliationDetail(
  reconciliationId: string,
  accessToken: string,
): Promise<ReconciliationDetailItem> {
  const res = await fetch(`${API_URL}/api/v1/conciliacoes/${reconciliationId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Erro ao carregar detalhes da conciliação.");
  }

  const data = await res.json();
  return {
    id: data.id,
    projectId: data.projeto_id,
    declaredEntryId: data.declared_entry_id,
    valorDeclarado: data.valor_declarado,
    valorConciliado: data.valor_conciliado,
    status: data.status,
    confidence: data.confidence,
    fornecedorDeclarado: data.fornecedor_declarado,
    dataDeclarada: data.data_declarada,
    documentoDeclarado: data.documento_declarado,
    rubricaDeclarada: data.rubrica_declarada,
    createdAt: data.created_at || "",
    links: data.links.map((l: any) => ({
      id: l.id,
      evidenceType: l.evidence_type,
      evidenceId: l.evidence_id,
      matchType: l.match_type,
      score: l.score,
    })),
    issues: data.issues.map((issue: any) => ({
      id: issue.id,
      issueCode: issue.issue_code,
      severity: issue.severity,
      status: issue.status,
      description: issue.description,
      createdAt: issue.created_at,
    })),
  };
}

export async function getDocumentSignedUrl(
  documentId: string,
  accessToken: string,
): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/documentos/${documentId}/signed-url`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Erro ao obter URL assinada do documento.");
  }

  const data = await res.json();
  return data.signed_url;
}
