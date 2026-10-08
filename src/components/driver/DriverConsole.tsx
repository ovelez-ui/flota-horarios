"use client";

import { useMemo, useState } from "react";
import { Search, CreditCard, AlertCircle, CalendarDays, List } from "lucide-react";
import type { DriverMonthlySummary } from "@/types";
import { Button, Card, CardContent, Eyebrow, Input } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { totalHours, workedDays, restDays, totalBreakHours } from "@/lib/shift-rules";
import { cn } from "@/lib/utils";
import { DriverInfoCard } from "./DriverInfoCard";
import { ShiftTable } from "./ShiftTable";
import { ShiftCalendar } from "./ShiftCalendar";

export function DriverConsole() {
  const drivers = useFleetStore((s) => s.drivers);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const zones = useFleetStore((s) => s.zones);
  const driverShifts = useFleetStore((s) => s.driverShifts);

  const [cedula, setCedula] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [view, setView] = useState<"calendario" | "lista">("calendario");

  const summary = useMemo<DriverMonthlySummary | null>(() => {
    if (!query) return null;
    const driver = drivers.find((d) => d.id === query.trim());
    if (!driver) return null;
    const pointOfSale = pointsOfSale.find((p) => p.id === driver.basePointOfSaleId);
    const zone = zones.find((z) => z.id === driver.zoneId);
    if (!pointOfSale || !zone) return null;
    const shifts = driverShifts(driver.id);
    return {
      driver,
      pointOfSale,
      zone,
      accumulatedHours: Math.round(totalHours(shifts) * 10) / 10,
      workedDays: workedDays(shifts),
      restDays: restDays(shifts),
      breakHours: totalBreakHours(shifts),
      shifts,
    };
  }, [query, drivers, pointsOfSale, zones, driverShifts]);

  const notFound = query !== null && summary === null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Eyebrow>Vista repartidor</Eyebrow>
        <h1 className="mt-1.5 text-2xl font-light tracking-tight text-slate-900 sm:text-3xl">Consulta de turnos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ingresa tu cédula para ver tu malla del mes.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(cedula.trim() || null);
            }}
          >
            <label className="flex-1">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CreditCard size={16} /> Cédula
              </span>
              <Input
                inputMode="numeric"
                placeholder="Ej. 1152693314"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
              />
            </label>
            <Button type="submit" className="sm:w-auto">
              <Search size={16} /> Consultar
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-400">Prueba:</span>
            {drivers.slice(0, 4).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setCedula(d.id);
                  setQuery(d.id);
                }}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
              >
                {d.id}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {notFound && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 text-slate-600">
            <AlertCircle className="text-accent" size={20} />
            No se encontró un repartidor con la cédula <strong>{query}</strong>.
          </CardContent>
        </Card>
      )}

      {summary && (
        <div className="space-y-5">
          <DriverInfoCard summary={summary} />
          <Card>
            <CardContent className="pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-900">Malla del mes</h2>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                    {summary.workedDays} laborados
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                    {summary.restDays} descansos
                  </span>
                </div>
                {/* Toggle Calendario / Lista */}
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                  {([
                    { id: "calendario", label: "Calendario", icon: CalendarDays },
                    { id: "lista", label: "Lista", icon: List },
                  ] as const).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setView(v.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        view === v.id ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      <v.icon size={15} /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {view === "calendario" ? (
                <ShiftCalendar shifts={summary.shifts} />
              ) : (
                <ShiftTable shifts={summary.shifts} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
