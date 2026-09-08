import { MapPin, Building2, Users } from "lucide-react";
import type { Driver, PointOfSale, Zone } from "@/types";
import { Card } from "@/components/ui";

interface ZoneCardProps {
  zone: Zone;
  points: PointOfSale[];
  drivers: Driver[];
}

export function ZoneCard({ zone, points, drivers }: ZoneCardProps) {
  const active = drivers.filter((d) => d.status === "ACTIVE").length;

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: zone.color }}
      >
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span className="font-semibold">{zone.name}</span>
        </div>
        <span className="text-xs opacity-90">{zone.city}</span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="flex items-center gap-2 p-3">
          <Building2 size={16} className="text-slate-400" />
          <div>
            <p className="text-lg font-semibold leading-none text-slate-900">
              {points.length}
            </p>
            <p className="text-xs text-slate-500">Puntos de venta</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3">
          <Users size={16} className="text-slate-400" />
          <div>
            <p className="text-lg font-semibold leading-none text-slate-900">
              {active}
              <span className="text-sm font-normal text-slate-400">/{drivers.length}</span>
            </p>
            <p className="text-xs text-slate-500">Repartidores activos</p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-slate-50">
        {points.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="truncate text-slate-700" title={p.name}>
              {p.name}
            </span>
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              mín {p.minDriversPerShift}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
