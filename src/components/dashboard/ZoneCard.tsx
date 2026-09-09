import { MapPin, Building2, Users } from "lucide-react";
import type { Driver, PointOfSale, Zone } from "@/types";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ZoneCardProps {
  zone: Zone;
  points: PointOfSale[];
  drivers: Driver[];
}

export function ZoneCard({ zone, points, drivers }: ZoneCardProps) {
  const active = drivers.filter((d) => d.status === "ACTIVE").length;

  // Repartidores con base en cada punto de venta.
  const driversByPos = new Map<string, number>();
  for (const d of drivers) {
    driversByPos.set(d.basePointOfSaleId, (driversByPos.get(d.basePointOfSaleId) ?? 0) + 1);
  }

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
        {points.map((p) => {
          const n = driversByPos.get(p.id) ?? 0;
          return (
            <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="truncate text-slate-700" title={p.name}>
                {p.name}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold",
                  n === 0 ? "bg-slate-100 text-slate-400" : "bg-brand-50 text-brand-700",
                )}
                title={`${n} repartidor(es) con base en este punto · mínimo ${p.minDriversPerShift}/franja`}
              >
                <Users size={12} className="opacity-70" /> {n}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
