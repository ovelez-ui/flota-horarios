import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el modo estático (GitHub Pages).
 * Las variables se inyectan en build/runtime del cliente:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true si la app está configurada para usar Supabase como backend. */
export const hasSupabase = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!hasSupabase) {
    throw new Error("Supabase no configurado (falta NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).");
  }
  if (!client) client = createClient(url!, anon!, { auth: { persistSession: false } });
  return client;
}
