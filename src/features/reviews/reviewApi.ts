const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface ReviewCommandPayload {
  action: "APPROVE" | "REJECT" | "REPLACE" | "CORRECT";
  expectedVersion: number;
  reason?: string;
  evidenceLinkId?: string;
}

export interface ReviewResultResponse {
  decisionId: string;
  reconciliationId: string;
  action: string;
  newStatus: string;
  newVersion: number;
}

export async function submitReviewDecision(
  reconciliationId: string,
  payload: ReviewCommandPayload,
  accessToken: string,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<ReviewResultResponse> {
  const res = await fetch(`${API_URL}/api/v1/reconciliacoes/${reconciliationId}/decisoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      action: payload.action,
      expected_version: payload.expectedVersion,
      reason: payload.reason || "",
      evidence_link_id: payload.evidenceLinkId,
    }),
  });

  if (res.status === 409) {
    throw new Error("CONFLICT_RELOAD_REQUIRED");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao registrar decisão de revisão.");
  }

  const data = await res.json();
  return {
    decisionId: data.decision_id,
    reconciliationId: data.reconciliation_id,
    action: data.action,
    newStatus: data.new_status,
    newVersion: data.new_version,
  };
}
