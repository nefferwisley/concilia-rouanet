import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../hooks/useSession";
import { listProjects } from "./projectApi";
import type { OnlineProject } from "./projectTypes";

const ACTIVE_PROJECT_ID_KEY = "concilia_rouanet_active_project_id";

function getPreferredProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
  } catch {
    return null;
  }
}

export function useProjects(): {
  projects: OnlineProject[];
  activeProject: OnlineProject | null;
  activeProjectId: string | null;
  loading: boolean;
  error: Error | null;
  setActiveProjectId: (id: string | null) => void;
  reload: () => Promise<void>;
} {
  const { session, loading: sessionLoading } = useSession();
  const [projects, setProjects] = useState<OnlineProject[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(getPreferredProjectId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = async () => {
    if (!session?.access_token) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setProjects(await listProjects(session.access_token));
    } catch (reason) {
      setProjects([]);
      setError(reason instanceof Error ? reason : new Error("Não foi possível carregar os projetos."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    void reload();
  }, [session?.access_token, sessionLoading]);

  const setActiveProjectId = (id: string | null) => {
    setActiveProjectIdState(id);

    try {
      if (id) {
        localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
      }
    } catch {
      // A UI remains functional when browser storage is unavailable.
    }
  };

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );

  return { projects, activeProject, activeProjectId, loading: sessionLoading || loading, error, setActiveProjectId, reload };
}
