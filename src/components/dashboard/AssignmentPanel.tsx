"use client";

import { useEffect, useMemo, useState } from "react";
import { Wand2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { RuleViolation } from "@/types";
import { Button, Card, CardContent, IconChip, Select, Badge } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { shiftCodeOptions, codeLabel } from "@/lib/shift-catalog";
import { datesOfMonth, shortLabel, weekdayName } from "@/lib/date-utils";

function ViolationRow({ v }: { v: RuleViolation }) {
  const isError = v.severity === "error";
  return (
    <li className="flex items-start gap-2 text-sm">
      {isError ? (
        <XCircle size={16} className="mt-0.5 shrink-0 text-accent" />
      ) : (
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
      )}
      <span className={isError ? "text-slate-700" : "text-slate-600"}>
        <Badge variant={isError ? "danger" : "warning"} className="mr-1.5">
          {v.code}
        </Badge>
        {v.message}
      </span>
    </li>
  );
}

/** Interfaz de asignación con validación en vivo del motor de reglas. */
export function AssignmentPanel() {
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const preview = useFleetStore((s) => s.preview);
  const assign = useFleetStore((s) => s.assign);
  const metrics = useFleetStore((s) => s.metrics);

  const month = useFleetStore((s) => s.month);
  const dates = useMemo(() => datesOfMonth(month.year, month.monthIndex), [month]);
  const customShiftCodes = useFleetStore((s) => s.customShiftCodes);
  const codes = useMemo(() => shiftCodeOptions(shifts, customShiftCodes), [shifts, customShiftCodes]);

  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [date, setDate] = useState(dates[Math.min(9, dates.length - 1)]!);
  const [code, setCode] = useState(codes[0] ?? "DESC");
  const [applied, setApplied] = useState<string | null>(null);

  // Al cambiar de mes, reencuadra la fecha seleccionada dentro del nuevo mes.
  useEffect(() => {
    if (!dates.includes(date)) setDate(dates[Math.min(9, dates.length - 1)]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  const driver = drivers.find((d) => d.id === driverId);

  const candidateInput = driver
    ? {
        driverId,
        date,
        weekday: weekdayName(date),
        code,
        zoneId: driver.zoneId,
        pointOfSaleId: driver.basePointOfSaleId,
      }
    : null;

  const result = useMemo(
    () =>
      candidateInput
        ? preview(candidateInput)
        : { ok: false, violations: [] as RuleViolation[] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [driverId, date, code, shifts, preview],
  );
  const m = metrics(driverId);

  async function onAssign() {
    if (!candidateInput) return;
    const r = await assign(candidateInput);
    if (r.ok) setApplied(`Turno ${code} asignado el ${shortLabel(date)}.`);
    else if (r.error) setApplied(null);
  }

  if (!driver) {
    return (
      <Card>
        <CardContent className="pt-5 text-slate-500">No hay repartidores.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
          <IconChip icon={<Wand2 size={16} />} /> Asignar turno
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          El motor valida choques, tope de horas, descanso semanal y cruce de zona antes de aplicar.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Repartidor</span>
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.id}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Fecha</span>
            <Select value={date} onChange={(e) => setDate(e.target.value)}>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {shortLabel(d)} · {weekdayName(d)}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Turno</span>
            <Select value={code} onChange={(e) => setCode(e.target.value)}>
              {codes.map((c) => (
                <option key={c} value={c}>
                  {codeLabel(c)}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-500">Acumulado del mes:</span>
          <span className="font-semibold text-slate-800">
            {m.hours}h / {driver.monthlyHourCap}h
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-600">{m.worked} laborados</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-600">{m.rest} descansos</span>
        </div>

        {result.violations.length > 0 ? (
          <ul className="mt-4 space-y-2 rounded-lg border border-slate-100 bg-white p-3">
            {result.violations.map((v, i) => (
              <ViolationRow key={`${v.code}-${i}`} v={v} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} /> Asignación válida, sin conflictos.
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={onAssign} disabled={!result.ok}>
            {result.ok ? "Aplicar asignación" : "Bloqueado por reglas"}
          </Button>
          {applied && <span className="text-sm text-emerald-600">{applied}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
