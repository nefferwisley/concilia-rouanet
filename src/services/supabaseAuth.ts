export interface SupabaseAuthConfiguration {
  url: string;
  publishableKey: string;
}

export interface SupabaseAccessSession {
  accessToken: string;
  email: string | null;
}

export class SupabaseAuthError extends Error {}

export function getSupabaseInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const type = params.get("type");
  return accessToken && (type === "invite" || type === "recovery") ? accessToken : null;
}

export async function setSupabasePassword(
  configuration: SupabaseAuthConfiguration,
  accessToken: string,
  password: string,
): Promise<void> {
  const response = await fetch(`${configuration.url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: configuration.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; msg?: string } | null;
    throw new SupabaseAuthError(payload?.message || payload?.msg || "Não foi possível definir a senha.");
  }
}

export function getSupabaseAuthConfiguration(): SupabaseAuthConfiguration | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
  const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  return url && publishableKey ? { url, publishableKey } : null;
}

export async function signInWithSupabasePassword(
  configuration: SupabaseAuthConfiguration,
  email: string,
  password: string,
): Promise<SupabaseAccessSession> {
  const response = await fetch(`${configuration.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: configuration.publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => null) as {
    access_token?: string;
    user?: { email?: string | null };
    msg?: string;
    error_description?: string;
    message?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    throw new SupabaseAuthError(
      payload?.error_description || payload?.msg || payload?.message || "Não foi possível iniciar a sessão.",
    );
  }

  return { accessToken: payload.access_token, email: payload.user?.email ?? null };
}
