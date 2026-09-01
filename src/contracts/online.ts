export type OnlineSessionStatus = "loading" | "offline" | "empty" | "ready" | "error";

export interface OnlineProjectSummary {
  id: string;
  pronac: string;
  nome: string;
  transacoesCount: number;
  criadoEm: string;
}

export interface OnlineProjectList {
  total: number;
  page: number;
  projetos: OnlineProjectSummary[];
}

export interface OnlineSessionState {
  status: OnlineSessionStatus;
  projects: OnlineProjectSummary[];
  activeProjectId: string | null;
  message: string | null;
}

export interface OnlineSessionApi {
  checkHealth(): Promise<{ online: boolean; version?: string }>;
  listProjects(): Promise<OnlineProjectList>;
}
