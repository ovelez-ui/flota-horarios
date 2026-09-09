"use client";

import { useMemo, useState } from "react";
import { Search, CreditCard, AlertCircle } from "lucide-react";
import type { DriverMonthlySummary } from "@/types";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { totalHours, workedDays, restDays } from "@/lib/shift-rules";
import { DriverInfoCard } from "./DriverInfoCard";
import { ShiftTable } from "./ShiftTable";

export function DriverConsole() {
  const drivers = useFleetStore((s) => s.drivers);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const zones = useFleetStore((s) => s.zones);
  const driverShifts = useFleetStore((s) => s.driverShifts);

  const [cedula, setCedula] = useState("");
  const [query, setQuery] = useState<string | null>(null);

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
      shifts,
    };
  }, [query, drivers, pointsOfSale, zones, driverShifts]);

  const notFound = query !== null && summary === null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Consulta de turnos</h1>
        <p className="text-sm text-slate-600">
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
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Turnos del mes</h2>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                    {summary.workedDays} laborados
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500">
                    {summary.restDays} descansos
                  </span>
                </div>
              </div>
              <ShiftTable shifts={summary.shifts} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
