export function buildSupabaseAdminHeaders(
  apiKey: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { apikey: apiKey };

  // Legacy service_role keys are JWTs and may be sent as Bearer tokens.
  // New sb_secret_ keys must only use the apikey header.
  if (!apiKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return { ...headers, ...extra };
}
