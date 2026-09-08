"use client";

import { create } from "zustand";
import { hasSupabase, getSupabase } from "@/lib/supabase";

export type Role = "admin" | "tienda";

interface AuthState {
  ready: boolean;
  email: string | null;
  role: Role | null;
  error: string | null;
  signingIn: boolean;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

async function loadRole(userId: string): Promise<Role> {
  try {
    const { data } = await getSupabase().from("profiles").select("role").eq("id", userId).single();
    return data?.role === "admin" ? "admin" : "tienda";
  } catch {
    return "tienda"; // menor privilegio por defecto
  }
}

let initialized = false;

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  email: null,
  role: null,
  error: null,
  signingIn: false,

  init: async () => {
    if (initialized) return;
    initialized = true;

    // Sin Supabase (modo servidor/local): acceso completo sin login.
    if (!hasSupabase) {
      set({ ready: true, role: "admin", email: null });
      return;
    }

    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    const session = data.session;
    if (session?.user) {
      const role = await loadRole(session.user.id);
      set({ ready: true, email: session.user.email ?? null, role });
    } else {
      set({ ready: true, email: null, role: null });
    }

    sb.auth.onAuthStateChange(async (_event, s) => {
      if (s?.user) {
        const role = await loadRole(s.user.id);
        set({ email: s.user.email ?? null, role });
      } else {
        set({ email: null, role: null });
      }
    });
  },

  signIn: async (email, password) => {
    if (!hasSupabase) return { ok: true };
    set({ signingIn: true, error: null });
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      set({ signingIn: false, error: error.message });
      return { ok: false, error: error.message };
    }
    const role = data.user ? await loadRole(data.user.id) : "tienda";
    set({ signingIn: false, email: data.user?.email ?? null, role });
    return { ok: true };
  },

  signOut: async () => {
    if (hasSupabase) await getSupabase().auth.signOut();
    set({ email: null, role: null });
  },
}));
