import { api } from "@/lib/api-client";
import { hasSupabase } from "@/lib/supabase";
import { supabaseSource } from "@/lib/data-source-supabase";

/**
 * Fuente de datos activa:
 * - Supabase (modo estático / GitHub Pages) si hay credenciales configuradas.
 * - API REST + SQLite (modo servidor) en caso contrario.
 *
 * Ambas implementaciones exponen la misma superficie que consume el store.
 */
export const source = hasSupabase ? supabaseSource : api;

export const backend: "supabase" | "api" = hasSupabase ? "supabase" : "api";
