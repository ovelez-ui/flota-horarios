"use client";

import { useState } from "react";
import { MapPin, Building2, Users, RotateCcw } from "lucide-react";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { Button, Eyebrow } from "@/components/ui";
import { ZonesAdmin } from "./ZonesAdmin";
import { PointsAdmin } from "./PointsAdmin";
import { DriversAdmin } from "./DriversAdmin";

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
          <Eyebrow>Configuración</Eyebrow>
          <h1 className="mt-1.5 text-2xl font-serif font-normal tracking-tight text-ink sm:text-3xl">Administración</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestiona zonas, puntos de venta y repartidores. Los cambios se guardan en el servidor.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RotateCcw size={15} className={loading ? "animate-spin" : ""} /> Refrescar
        </Button>
      </div>

      <div className="ed-noscroll flex gap-6 overflow-x-auto border-b border-line" role="tablist" aria-label="Entidades">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
            className="ed-subtab inline-flex items-center gap-2"
          >
            <Icon size={14} aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === "zonas" && <ZonesAdmin />}
        {tab === "puntos" && <PointsAdmin />}
        {tab === "repartidores" && <DriversAdmin />}
      </div>
    </div>
  );
}
