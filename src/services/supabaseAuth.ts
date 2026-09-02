export interface SupabaseAuthConfiguration {
  url: string;
  publishableKey: string;
}

export interface SupabaseAccessSession {
  accessToken: string;
  email: string | null;
}

export class SupabaseAuthError extends Error {}

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
