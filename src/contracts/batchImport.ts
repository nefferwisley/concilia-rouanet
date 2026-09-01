export type BatchImportFileStatus =
  | "RECEIVING"
  | "UPLOADED"
  | "EXTRACTING"
  | "CLASSIFIED"
  | "REVIEW_REQUIRED"
  | "DONE"
  | "COMPLETED"
  | "FAILED"
  | "ERROR"
  | "CANCELED";

export interface BatchImportFileItem {
  id: string;
  nome: string;
  caminho: string;
  tamanho_bytes: number;
  sha256: string;
  status: BatchImportFileStatus;
  erro?: string | null;
}

export interface BatchSummaryState {
  importacao_id: string;
  projeto_id: string;
  status_geral: string;
  total_arquivos: number;
  concluidos: number;
  erros: number;
  processando: number;
  aguardando: number;
  revisao_pendente: number;
  progresso_pct: number;
  detalhe_status: Record<string, number>;
  arquivos: BatchImportFileItem[];
}

export interface BatchImportProgressProps {
  summary: BatchSummaryState;
  onRetryFailed?: () => void;
  onRefresh?: () => void;
  onSelectFile?: (fileId: string) => void;
  isRetrying?: boolean;
}
