"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ShiftKind } from "@/types";
import { Card, CardContent, IconChip, Select } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { shiftKind, isRestCode } from "@/lib/shift-catalog";
import { datesOfMonth, shortLabel, weekdayName } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const FRANJAS: { kind: ShiftKind; label: string }[] = [
  { kind: "MORNING", label: "Mañana" },
  { kind: "MID", label: "Mediodía" },
  { kind: "AFTERNOON", label: "Tarde" },
  { kind: "NIGHT", label: "Noche" },
];

/** Tablero de cobertura diaria por punto de venta y franja horaria. */
export function CoverageBoard() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const month = useFleetStore((s) => s.month);

  const dates = useMemo(() => datesOfMonth(month.year, month.monthIndex), [month]);
  const [date, setDate] = useState(dates[0]!);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");

  // Reencuadra el día seleccionado al cambiar de mes.
  useEffect(() => {
    if (!dates.includes(date)) setDate(dates[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  const driverIds = useMemo(() => new Set(drivers.map((d) => d.id)), [drivers]);
  const visiblePos = useMemo(
    () => pointsOfSale.filter((p) => p.zoneId === zoneId),
    [pointsOfSale, zoneId],
  );

  // posId -> kind -> nº de repartidores.
  const coverage = useMemo(() => {
    const map = new Map<string, Map<ShiftKind, number>>();
    for (const s of shifts) {
      if (s.date !== date || !s.pointOfSaleId || isRestCode(s.code)) continue;
      if (!driverIds.has(s.driverId)) continue;
      const kind = shiftKind(s);
      const perPos = map.get(s.pointOfSaleId) ?? new Map<ShiftKind, number>();
      perPos.set(kind, (perPos.get(kind) ?? 0) + 1);
      map.set(s.pointOfSaleId, perPos);
    }
    return map;
  }, [shifts, date, driverIds]);

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <IconChip icon={<CalendarRange size={16} />} /> Cobertura por día
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="h-9 w-auto">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
            <Select value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-auto">
              {dates.map((d) => (
                <option key={d} value={d}>
                  {shortLabel(d)} · {weekdayName(d)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Punto de venta</th>
                {FRANJAS.map((f) => (
                  <th key={f.kind} className="px-3 py-2 text-center">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePos.map((pos) => {
                const perPos = coverage.get(pos.id);
                return (
                  <tr key={pos.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">{pos.name}</p>
                      <p className="text-xs text-slate-400">mín {pos.minDriversPerShift}/franja</p>
                    </td>
                    {FRANJAS.map((f) => {
                      const count = perPos?.get(f.kind) ?? 0;
                      const gap = count > 0 && count < pos.minDriversPerShift;
                      return (
                        <td key={f.kind} className="px-3 py-2 text-center">
                          <span
                            className={cn(
                              "inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-md px-2 text-xs font-semibold",
                              count === 0
                                ? "bg-slate-50 text-slate-300"
                                : gap
                                  ? "bg-accent-soft text-accent ring-1 ring-inset ring-red-100"
                                  : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
                            )}
                            title={
                              count === 0
                                ? "Sin cobertura"
                                : gap
                                  ? `Hueco: ${count}/${pos.minDriversPerShift}`
                                  : `Cubierto: ${count}`
                            }
                          >
                            {count === 0 ? "—" : count}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {visiblePos.length === 0 && (
                <tr>
                  <td colSpan={FRANJAS.length + 1} className="px-3 py-8 text-center text-slate-400">
                    La zona no tiene puntos de venta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" /> Cobertura suficiente
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-accent" /> Hueco operativo (bajo el mínimo)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
