export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  apiUrl: string;
};

export function readPublicEnv(env: Record<string, string | undefined>): PublicEnv {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? "";
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const apiUrl = env.VITE_API_URL?.trim() ?? "http://localhost:8000/api/v1";
  if (/service[_-]?role/i.test(supabasePublishableKey)) {
    throw new Error("Chave privilegiada não pode ser usada no navegador.");
  }
  return { supabaseUrl, supabasePublishableKey, apiUrl };
}
