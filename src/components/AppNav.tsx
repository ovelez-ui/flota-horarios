"use client";

import Link from "next/link";
import { LayoutDashboard, UserSearch, Settings2, CalendarDays, LogOut, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const linkClass =
  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 sm:px-3";

/** Navegación del encabezado según el rol del usuario. */
export function AppNav() {
  const role = useAuth((s) => s.role);
  const email = useAuth((s) => s.email);
  const signOut = useAuth((s) => s.signOut);

  if (role === null) return null; // sin sesión → solo el login

  return (
    <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
      <Link href="/repartidor" className={linkClass}>
        <UserSearch size={16} /> <span className="hidden sm:inline">Repartidor</span>
      </Link>

      {role === "admin" && (
        <>
          <Link href="/dashboard" className={linkClass}>
            <LayoutDashboard size={16} /> <span className="hidden sm:inline">Dispatcher</span>
          </Link>
          <Link href="/admin" className={linkClass}>
            <Settings2 size={16} /> <span className="hidden sm:inline">Admin</span>
          </Link>
        </>
      )}

      {role === "supervisor" && (
        <Link href="/dashboard" className={linkClass}>
          <Eye size={16} /> <span className="hidden sm:inline">Supervisión</span>
        </Link>
      )}

      {role === "tienda" && (
        <Link href="/calendario" className={linkClass}>
          <CalendarDays size={16} /> <span className="hidden sm:inline">Calendario</span>
        </Link>
      )}

      <span className="mx-1 hidden text-xs text-slate-400 lg:inline">{email}</span>
      <button
        onClick={() => void signOut()}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-500 hover:bg-slate-100"
        title="Cerrar sesión"
      >
        <LogOut size={16} />
      </button>
    </nav>
  );
}
