"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, Plane } from "lucide-react";
import { Button, Card, CardContent, Field, Select } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { MONTH } from "@/lib/month";
import { SPECIAL_CODES } from "@/lib/shift-catalog";
import { datesOfMonth, shortLabel, weekdayName, datesBetween } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// Novedades registrables por rango (el descanso se maneja en el calendario).
const NOVELTIES = ["VACAC", "INC", "COMP", "FAM"] as const;

/** Registro de vacaciones y novedades por rango de fechas. */
export function VacationPanel() {
  const drivers = useFleetStore((s) => s.drivers);
  const assignRange = useFleetStore((s) => s.assignRange);

  const dates = useMemo(() => datesOfMonth(MONTH.year, MONTH.monthIndex), []);
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [code, setCode] = useState<string>("VACAC");
  const [from, setFrom] = useState(dates[0]!);
  const [to, setTo] = useState(dates[Math.min(6, dates.length - 1)]!);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dayCount = useMemo(() => datesBetween(from, to).length, [from, to]);
  const meta = SPECIAL_CODES[code]!;

  async function submit() {
    setError(null);
    setMsg(null);
    if (from > to) {
      setError("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    setSaving(true);
    const r = await assignRange({ driverId, from, to, code });
    setSaving(false);
    if (r.ok) {
      const driver = drivers.find((d) => d.id === driverId);
      setMsg(`${meta.label}: ${r.count} día(s) registrados para ${driver?.name ?? driverId}.`);
    } else {
      setError(r.error ?? "No se pudo registrar.");
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
          <Plane size={18} className="text-brand-600" /> Vacaciones y novedades
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Registra un rango de días de vacaciones, incapacidad, compensatorio o día de la familia.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Repartidor">
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} · {d.id}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={code} onChange={(e) => setCode(e.target.value)}>
              {NOVELTIES.map((c) => (
                <option key={c} value={c}>{SPECIAL_CODES[c]!.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Desde">
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {dates.map((d) => (
                <option key={d} value={d}>{shortLabel(d)} · {weekdayName(d)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hasta">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {dates.map((d) => (
                <option key={d} value={d}>{shortLabel(d)} · {weekdayName(d)}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium", meta.cell)}>
            {meta.label}
          </span>
          <span className="text-sm text-slate-500">
            {from > to ? "rango inválido" : `${dayCount} día(s)`}
          </span>
          <Button onClick={submit} disabled={saving || from > to}>
            <CalendarPlus size={16} /> {saving ? "Registrando…" : "Registrar"}
          </Button>
          {msg && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 size={16} /> {msg}
            </span>
          )}
          {error && <span className="text-sm text-accent">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
