import type {
  OnlineProjectSummary,
  OnlineSessionApi,
  OnlineSessionState,
} from "../contracts/online";

export function chooseActiveProjectId(
  projects: OnlineProjectSummary[],
  preferredProjectId?: string | null,
): string | null {
  const preferred = projects.find((project) => project.id === preferredProjectId);
  // A stale saved selection can point at the automatically-created empty
  // project while the real project already contains the user's launches.
  // Keep an explicitly selected project when it has data; otherwise choose
  // the populated project with the largest transaction count.
  if (preferred && (preferred.transacoesCount > 0 || projects.every((project) => project.transacoesCount === 0))) {
    return preferred.id;
  }

  return projects.reduce<OnlineProjectSummary | null>((current, project) => {
    if (!current || project.transacoesCount > current.transacoesCount) return project;
    return current;
  }, null)?.id ?? null;
}

export async function loadOnlineSession(
  api: OnlineSessionApi,
  preferredProjectId?: string | null,
): Promise<OnlineSessionState> {
  const health = await api.checkHealth();

  if (!health.online) {
    return {
      status: "offline",
      projects: [],
      activeProjectId: null,
      message: "Não foi possível conectar ao serviço online.",
    };
  }

  try {
    const result = await api.listProjects();

    if (result.projetos.length === 0) {
      return {
        status: "empty",
        projects: [],
        activeProjectId: null,
        message: "Nenhum projeto disponível para esta conta.",
      };
    }

    return {
      status: "ready",
      projects: result.projetos,
      activeProjectId: chooseActiveProjectId(result.projetos, preferredProjectId),
      message: null,
    };
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
    return {
      status: "error",
      projects: [],
      activeProjectId: null,
      message: status === 401
        ? "Sua sessão expirou ou não é mais válida. Entre novamente para acessar os projetos."
        : "A conexão foi realizada, mas os projetos não puderam ser carregados.",
    };
  }
}
