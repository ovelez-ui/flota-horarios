"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, Plane, Search, X } from "lucide-react";
import { Button, Card, CardContent, Field, IconChip, Input, Select } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { SPECIAL_CODES } from "@/lib/shift-catalog";
import { datesOfMonth, shortLabel, weekdayName, datesBetween } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// Novedades registrables por rango (el descanso se maneja en el calendario).
const NOVELTIES = ["VACAC", "INC", "COMP", "LIC", "FAM"] as const;

/** Registro de vacaciones y novedades por rango de fechas. */
export function VacationPanel() {
  const drivers = useFleetStore((s) => s.drivers);
  const assignRange = useFleetStore((s) => s.assignRange);
  const month = useFleetStore((s) => s.month);

  const dates = useMemo(() => datesOfMonth(month.year, month.monthIndex), [month]);
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [driverQuery, setDriverQuery] = useState("");
  const [code, setCode] = useState<string>("VACAC");
  const [from, setFrom] = useState(dates[0]!);
  const [to, setTo] = useState(dates[Math.min(6, dates.length - 1)]!);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reencuadra el rango al cambiar de mes.
  useEffect(() => {
    if (!dates.includes(from)) setFrom(dates[0]!);
    if (!dates.includes(to)) setTo(dates[Math.min(6, dates.length - 1)]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  // Filtra repartidores por nombre o cédula para asignar más ágil.
  const filteredDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => d.name.toLowerCase().includes(q) || d.id.includes(q));
  }, [drivers, driverQuery]);

  // Si el repartidor seleccionado sale del filtro, selecciona el primer resultado.
  useEffect(() => {
    if (filteredDrivers.length > 0 && !filteredDrivers.some((d) => d.id === driverId)) {
      setDriverId(filteredDrivers[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDrivers]);

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
          <IconChip icon={<Plane size={16} />} /> Vacaciones y novedades
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Registra un rango de días de vacaciones, incapacidad, compensatorio o día de la familia.
        </p>

        {/* Buscador de repartidor (por nombre o cédula) */}
        <div className="mb-3">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={driverQuery}
              onChange={(e) => setDriverQuery(e.target.value)}
              placeholder="Buscar repartidor por nombre o cédula…"
              className="pl-9 pr-9"
            />
            {driverQuery && (
              <button
                type="button"
                onClick={() => setDriverQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </label>
          {driverQuery && (
            <p className="mt-1 text-xs text-slate-400">
              {filteredDrivers.length} resultado(s)
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Repartidor">
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              {filteredDrivers.length === 0 && <option value="">Sin resultados</option>}
              {filteredDrivers.map((d) => (
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
          <Button onClick={submit} disabled={saving || from > to || filteredDrivers.length === 0}>
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
