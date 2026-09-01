import type {
  OnlineProjectSummary,
  OnlineSessionApi,
  OnlineSessionState,
} from "../contracts/online";

export function chooseActiveProjectId(
  projects: OnlineProjectSummary[],
  preferredProjectId?: string | null,
): string | null {
  return projects.some((project) => project.id === preferredProjectId)
    ? preferredProjectId ?? null
    : projects[0]?.id ?? null;
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
  } catch {
    return {
      status: "error",
      projects: [],
      activeProjectId: null,
      message: "A conexão foi realizada, mas os projetos não puderam ser carregados.",
    };
  }
}
