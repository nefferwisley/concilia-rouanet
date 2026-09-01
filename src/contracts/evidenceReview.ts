export type ReviewDecisionAction = "APPROVE" | "REJECT" | "REPLACE" | "MANUAL_LINK";

export interface ReviewQueueItem {
  id: string;
  transacao_id: string;
  fornecedor: string;
  data_pagamento: string;
  valor_bruto: number;
  documento_id?: string | null;
  documento_nome?: string | null;
  confianca_ocr?: number | null;
  status_revisao: "PENDENTE" | "CONFIRMADO" | "CORRIGIDO" | "DESCARTADO";
  motivos?: string[];
  signed_url?: string | null;
}

export interface AuditEventItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state?: any;
  after_state?: any;
  reason?: string | null;
  actor_id?: string | null;
  created_at: string;
}

export interface EvidenceReviewQueueProps {
  items: ReviewQueueItem[];
  auditEvents?: AuditEventItem[];
  onApprove: (item: ReviewQueueItem) => void;
  onReject: (item: ReviewQueueItem, reason: string) => void;
  onReplace?: (item: ReviewQueueItem, newDocId: string, reason: string) => void;
  isLoading?: boolean;
}
