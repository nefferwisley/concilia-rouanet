import { Fragment, type FormEvent, type ReactNode, useState } from "react";
import { useSession } from "../hooks/useSession";
import { supabase } from "../services/supabaseClient";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({ email });
    setMessage(error ? error.message : "Verifique seu e-mail para continuar.");
    setSubmitting(false);
  }

  if (loading) {
    return <p role="status">Carregando sessão…</p>;
  }

  if (session) {
    const identityKey = session.user?.id || session.access_token || "authenticated-session";
    return <Fragment key={identityKey}>{children}</Fragment>;
  }

  return (
    <main>
      <h1>Acesso à plataforma</h1>
      <p>Use seu e-mail para receber um link de acesso.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Enviando…" : "Entrar"}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
