import type { ReactNode } from "react";
import type { OnlineSessionState } from "../../contracts/online";

export interface OnlineSessionBoundaryProps {
  session: OnlineSessionState;
  isDemoMode: boolean;
  onRetry: () => void;
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

  return <>{children}</>;
}
