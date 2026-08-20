import { createClient } from "@supabase/supabase-js";
import { readPublicEnv } from "../config/publicEnv";

const env = readPublicEnv(import.meta.env);

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
