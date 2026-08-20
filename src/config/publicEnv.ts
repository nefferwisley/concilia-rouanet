export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  apiUrl: string;
};

function hasServiceRoleJwt(key: string): boolean {
  const [, payload] = key.split(".");
  if (!payload) return false;
  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const decodedPayload = globalThis.atob(paddedPayload);
    const claims = JSON.parse(decodedPayload) as { role?: unknown };
    return claims.role === "service_role";
  } catch {
    return false;
  }
}

export function isPrivilegedSupabaseKey(key: string): boolean {
  return /service[_-]?role/i.test(key) || /^sb_secret_/i.test(key) || hasServiceRoleJwt(key);
}

export function assertPublicEnvSafe(env: Record<string, string | undefined>): void {
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (isPrivilegedSupabaseKey(supabasePublishableKey)) {
    throw new Error("Chave privilegiada não pode ser usada no navegador.");
  }
}

export function readPublicEnv(env: Record<string, string | undefined>): PublicEnv {
  assertPublicEnvSafe(env);
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? "";
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const apiUrl = env.VITE_API_URL?.trim() ?? "http://localhost:8000/api/v1";
  return { supabaseUrl, supabasePublishableKey, apiUrl };
}
