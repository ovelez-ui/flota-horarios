"use client";

import { useState } from "react";
import { MapPin, Building2, Users, RotateCcw } from "lucide-react";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { Button } from "@/components/ui";
import { ZonesAdmin } from "./ZonesAdmin";
import { PointsAdmin } from "./PointsAdmin";
import { DriversAdmin } from "./DriversAdmin";
import { cn } from "@/lib/utils";

type Tab = "zonas" | "puntos" | "repartidores";

const TABS: { id: Tab; label: string; icon: typeof MapPin }[] = [
  { id: "zonas", label: "Zonas", icon: MapPin },
  { id: "puntos", label: "Puntos de venta", icon: Building2 },
  { id: "repartidores", label: "Repartidores", icon: Users },
];

export function EntityAdmin() {
  const [tab, setTab] = useState<Tab>("zonas");
  const refresh = useFleetStore((s) => s.refresh);
  const loading = useFleetStore((s) => s.loading);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Administración</h1>
          <p className="text-sm text-slate-600">
            Gestiona zonas, puntos de venta y repartidores. Los cambios se guardan en el servidor.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RotateCcw size={15} className={loading ? "animate-spin" : ""} /> Refrescar
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium",
              tab === id
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "zonas" && <ZonesAdmin />}
      {tab === "puntos" && <PointsAdmin />}
      {tab === "repartidores" && <DriversAdmin />}
    </div>
  );
}
