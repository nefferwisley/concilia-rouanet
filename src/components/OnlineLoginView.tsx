import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import {
  SupabaseAuthConfiguration,
  SupabaseAuthError,
  signInWithSupabasePassword,
} from "../services/supabaseAuth";

interface OnlineLoginViewProps {
  configuration: SupabaseAuthConfiguration | null;
  onAuthenticated: (accessToken: string) => void;
}

export function OnlineLoginView({ configuration, onAuthenticated }: OnlineLoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configuration) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const session = await signInWithSupabasePassword(configuration, email.trim(), password);
      onAuthenticated(session.accessToken);
    } catch (caught) {
      setError(caught instanceof SupabaseAuthError ? caught.message : "Falha ao iniciar a sessão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="flex items-center gap-3 text-emerald-400">
          <LockKeyhole className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-wider">Concilia Rouanet</span>
        </div>
        <h1 className="mt-5 text-2xl font-bold">Acessar projetos online</h1>
        <p className="mt-2 text-sm text-slate-400">
          Entre para acessar projetos, documentos e importações vinculados à sua conta.
        </p>

        {!configuration ? (
          <p role="alert" className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            A autenticação online ainda não foi configurada neste ambiente.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-300">
              E-mail
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Senha
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-400"
              />
            </label>
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
