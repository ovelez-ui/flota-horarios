"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/** Restringe el contenido a administradores; el resto ve un aviso. */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const role = useAuth((s) => s.role);

  if (role !== "admin") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="text-amber-500" size={28} />
        <p className="font-medium text-slate-700">Acceso restringido</p>
        <p className="text-sm text-slate-500">
          Esta sección es solo para el equipo dispatcher.
        </p>
        <Link
          href="/calendario"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          Ir al calendario
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
