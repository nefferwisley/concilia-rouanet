import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const sessionIdentity = session?.user?.id ?? session?.access_token ?? null;
  const [projectState, setProjectState] = useState<{
    identity: string | null;
    projects: OnlineProject[];
  }>({ identity: null, projects: [] });
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(getPreferredProjectId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestGeneration = useRef(0);

  const reload = useCallback(async () => {
    const generation = ++requestGeneration.current;
    const requestIdentity = sessionIdentity;

    if (!session?.access_token) {
      if (generation === requestGeneration.current) {
        setProjectState({ identity: null, projects: [] });
        setError(null);
        setLoading(false);
      }
      return;
    }

    setProjectState({ identity: requestIdentity, projects: [] });
    setLoading(true);
    setError(null);

    try {
      const nextProjects = await listProjects(session.access_token);
      if (generation === requestGeneration.current) {
        setProjectState({ identity: requestIdentity, projects: nextProjects });
      }
    } catch (reason) {
      if (generation === requestGeneration.current) {
        setProjectState({ identity: requestIdentity, projects: [] });
        setError(reason instanceof Error ? reason : new Error("Não foi possível carregar os projetos."));
      }
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
      }
    }
  }, [session?.access_token, sessionIdentity]);

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    void reload();
    return () => {
      requestGeneration.current += 1;
    };
  }, [reload, sessionLoading]);

  useEffect(() => () => {
    requestGeneration.current += 1;
  }, []);

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

  const projects = projectState.identity === sessionIdentity ? projectState.projects : [];
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );

  return { projects, activeProject, activeProjectId, loading: sessionLoading || loading, error, setActiveProjectId, reload };
}
