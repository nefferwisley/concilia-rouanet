export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  apiUrl: string;
};

const PUBLIC_VITE_ENV_ALLOWLIST = new Set([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_API_URL",
]);

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
  const nonEmptyViteEntries = Object.entries(env).filter(
    ([name, value]) => name.startsWith("VITE_") && Boolean(value?.trim()),
  );

  for (const [, value] of nonEmptyViteEntries) {
    if (isPrivilegedSupabaseKey(value!.trim())) {
      throw new Error("Chave privilegiada não pode ser usada no navegador.");
    }
  }

  const unexpectedName = nonEmptyViteEntries.find(
    ([name]) => !PUBLIC_VITE_ENV_ALLOWLIST.has(name),
  )?.[0];
  if (unexpectedName) {
    throw new Error(`Variável pública não permitida no bundle: ${unexpectedName}.`);
  }
}

export function readPublicEnv(env: Record<string, string | undefined>): PublicEnv {
  assertPublicEnvSafe(env);
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? "";
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const apiUrl = env.VITE_API_URL?.trim() ?? "http://localhost:8000/api/v1";
  return { supabaseUrl, supabasePublishableKey, apiUrl };
}
