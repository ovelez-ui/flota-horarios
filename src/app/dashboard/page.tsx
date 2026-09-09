"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { useAuth } from "@/hooks/use-auth";

/** Dispatcher (edición) y supervisores (solo lectura) acceden al panel. */
export default function DashboardPage() {
  const role = useAuth((s) => s.role);

  if (role === "admin") return <DashboardTabs />;
  if (role === "supervisor") return <DashboardTabs readOnly />;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="text-amber-500" size={28} />
      <p className="font-medium text-slate-700">Acceso restringido</p>
      <p className="text-sm text-slate-500">Esta sección es para el equipo dispatcher y supervisores.</p>
      <Link
        href="/calendario"
        className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
      >
        Ir al calendario
      </Link>
    </div>
  );
}
