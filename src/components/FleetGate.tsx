"use client";

import { useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useFleetStore } from "@/hooks/use-shift-assignment";

/** Hidrata la flota desde el backend antes de renderizar el contenido. */
export function FleetGate({ children }: { children: React.ReactNode }) {
  const ready = useFleetStore((s) => s.ready);
  const error = useFleetStore((s) => s.error);
  const bootstrap = useFleetStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (error && !ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="text-accent" size={28} />
        <p className="text-slate-700">No se pudo cargar la flota.</p>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => void bootstrap()}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-brand-600" size={28} />
        <p className="text-sm">Cargando flota…</p>
      </div>
    );
  }

  return <>{children}</>;
}
