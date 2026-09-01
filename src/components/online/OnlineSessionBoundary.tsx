import type { ReactNode } from "react";
import type { OnlineSessionState } from "../../contracts/online";

export interface OnlineSessionBoundaryProps {
  session: OnlineSessionState;
  isDemoMode: boolean;
  onRetry: () => void;
  onSelectProject: (projectId: string) => void;
  children: ReactNode;
}

function SessionNotice({
  title,
  message,
  retry,
}: {
  title: string;
  message: string | null;
  retry?: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Concilia Rouanet</p>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        {message && <p className="mt-3 text-slate-300">{message}</p>}
        {retry && (
          <button
            type="button"
            onClick={retry}
            className="mt-6 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Tentar novamente
          </button>
        )}
      </section>
    </main>
  );
}

export function OnlineSessionBoundary({
  session,
  isDemoMode,
  onRetry,
  onSelectProject,
  children,
}: OnlineSessionBoundaryProps) {
  if (isDemoMode) return <>{children}</>;

  if (session.status === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
        <p className="mx-auto max-w-xl" aria-live="polite">Carregando dados online...</p>
      </main>
    );
  }

  if (session.status === "offline") {
    return <SessionNotice title="Sistema offline" message={session.message} retry={onRetry} />;
  }

  if (session.status === "error") {
    return <SessionNotice title="Não foi possível carregar os projetos" message={session.message} retry={onRetry} />;
  }

  if (session.status === "empty") {
    return <SessionNotice title="Nenhum projeto disponível" message={session.message} />;
  }

  const activeProject = session.projects.find((project) => project.id === session.activeProjectId)
    ?? session.projects[0];

  return (
    <>
      <section className="border-b border-slate-800 bg-slate-950 px-4 py-3 text-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-medium text-slate-300">
            Projeto online
            <select
              aria-label="Projeto online"
              value={activeProject?.id ?? ""}
              onChange={(event) => onSelectProject(event.target.value)}
              className="ml-3 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
            >
              {session.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.pronac} — {project.nome}
                </option>
              ))}
            </select>
          </label>
          {activeProject && (
            <p className="text-sm text-slate-300">
              <strong className="text-white">{activeProject.nome}</strong> · {activeProject.transacoesCount} lançamentos cadastrados
            </p>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-7xl text-xs text-slate-400">
          Dados financeiros detalhados serão carregados da API nas próximas etapas.
        </p>
      </section>
      {children}
    </>
  );
}
