"use client";

import { MapPin, Building2, Users, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { ZoneCard } from "./ZoneCard";

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: string;
}

function Kpi({ icon, label, value, tint }: KpiProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${tint}`}>{icon}</span>
        <div>
          <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EntitiesOverview() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);

  const activeDrivers = drivers.filter((d) => d.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<MapPin size={20} className="text-brand-700" />} label="Zonas" value={zones.length} tint="bg-brand-50" />
        <Kpi icon={<Building2 size={20} className="text-violet-700" />} label="Puntos de venta" value={pointsOfSale.length} tint="bg-violet-50" />
        <Kpi icon={<Users size={20} className="text-slate-700" />} label="Repartidores" value={drivers.length} tint="bg-slate-100" />
        <Kpi icon={<UserCheck size={20} className="text-emerald-700" />} label="Activos" value={activeDrivers} tint="bg-emerald-50" />
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Zonas y puntos de venta</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              points={pointsOfSale.filter((p) => p.zoneId === zone.id)}
              drivers={drivers.filter((d) => d.zoneId === zone.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
