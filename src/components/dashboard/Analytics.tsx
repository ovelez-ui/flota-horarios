"use client";

import { useMemo, useState } from "react";
import {
  BarChart3, Users, Building2, Clock, Gauge, AlertTriangle, Plane,
  Search, ChevronRight, X,
} from "lucide-react";
import type { Driver, Shift, ShiftKind } from "@/types";
import { Card, CardContent, Input, Select } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { MONTH } from "@/lib/month";
import { totalHours, workedDays, restDays } from "@/lib/shift-rules";
import { shiftKind, isRestCode, specialMeta, SPECIAL_CODE_LIST, SPECIAL_CODES } from "@/lib/shift-catalog";
import {
  kindDistribution, noveltyCounts, dailyWorking, hoursInDates,
  KIND_LABEL, KIND_COLOR,
} from "@/lib/analytics";
import { datesOfMonth, monthWeeks, parseISO, isWeekend } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const KINDS: ShiftKind[] = ["MORNING", "MID", "AFTERNOON", "NIGHT"];

// ---------------------------------------------------------------------------
// Primitivas de gráfico (CSS puro)
// ---------------------------------------------------------------------------

function StatTile({ icon, label, value, sub, tint }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; tint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tint)}>{icon}</span>
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold leading-none text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-slate-500">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-slate-700">{value}</span>
    </div>
  );
}

/** Barras verticales de cobertura diaria. */
function DailyBars({ dates, counts }: { dates: string[]; counts: Map<string, number> }) {
  const max = Math.max(1, ...dates.map((d) => counts.get(d) ?? 0));
  return (
    <div className="flex gap-[3px]" style={{ height: 110 }}>
      {dates.map((d) => {
        const c = counts.get(d) ?? 0;
        const h = Math.round((c / max) * 100);
        const wknd = isWeekend(d);
        return (
          <div key={d} className="flex h-full flex-1 flex-col items-center gap-1" title={`${d}: ${c} repartidor(es)`}>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn("w-full rounded-t", c === 0 ? "bg-accent" : wknd ? "bg-brand-400" : "bg-brand-600")}
                style={{ height: `${Math.max(c === 0 ? 4 : 8, h)}%` }}
              />
            </div>
            <span className="text-[8px] leading-none text-slate-400">{parseISO(d).getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function NoveltyChips({ shifts }: { shifts: Shift[] }) {
  const counts = noveltyCounts(shifts);
  return (
    <div className="flex flex-wrap gap-2">
      {SPECIAL_CODE_LIST.map((code) => {
        const meta = SPECIAL_CODES[code]!;
        const n = counts[code] ?? 0;
        return (
          <span
            key={code}
            className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
              n > 0 ? meta.cell : "bg-slate-50 text-slate-400")}
            title={`${meta.label}: ${n} día(s)`}
          >
            <span className="tabular-nums text-base font-bold">{n}</span>
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function KindDistribution({ shifts }: { shifts: Shift[] }) {
  const dist = kindDistribution(shifts);
  const max = Math.max(1, ...KINDS.map((k) => dist[k]));
  return (
    <div className="space-y-2">
      {KINDS.map((k) => (
        <BarRow key={k} label={KIND_LABEL[k]} value={dist[k]} max={max} color={KIND_COLOR[k]} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalle por repartidor
// ---------------------------------------------------------------------------

function DriverDetail({ driver, shifts, onClose }: { driver: Driver; shifts: Shift[]; onClose: () => void }) {
  const dates = useMemo(() => datesOfMonth(MONTH.year, MONTH.monthIndex), []);
  const weeks = useMemo(() => monthWeeks(dates), [dates]);
  const hours = totalHours(shifts);
  const cap = driver.monthlyHourCap;
  const pct = Math.min(100, Math.round((hours / cap) * 100));
  const byDate = new Map(shifts.map((s) => [s.date, s]));

  return (
    <Card className="border-brand-200 ring-1 ring-brand-100">
      <CardContent className="pt-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{driver.name}</h3>
            <p className="text-xs text-slate-400">C.C. {driver.id}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Horas vs tope */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-500">Horas del mes</span>
            <span className="font-semibold text-slate-800">{hours}h / {cap}h</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full", pct >= 100 ? "bg-accent" : "bg-brand-600")} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Horas por semana</p>
            <div className="space-y-2">
              {weeks.map((w) => {
                const set = new Set(w.dates);
                const h = hoursInDates(shifts, set);
                const maxW = Math.max(1, ...weeks.map((x) => hoursInDates(shifts, new Set(x.dates))));
                return <BarRow key={w.label} label={`${w.label}`} value={h} max={maxW} color="#0b5a94" />;
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Distribución de turnos</p>
            <KindDistribution shifts={shifts} />
          </div>
        </div>

        {/* Tira del mes */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Mes</p>
          <div className="flex flex-wrap gap-[3px]">
            {dates.map((d) => {
              const s = byDate.get(d);
              const special = s ? specialMeta(s.code) : undefined;
              const bg = !s ? "#f1f5f9" : special ? undefined : KIND_COLOR[shiftKind(s)];
              return (
                <div
                  key={d}
                  className={cn("grid h-6 w-6 place-items-center rounded text-[9px] font-semibold", special?.cell)}
                  style={bg ? { backgroundColor: bg, color: "#fff" } : undefined}
                  title={`${d}: ${s ? (special ? special.label : `${s.code} (${s.hours}h)`) : "—"}`}
                >
                  {s ? (special ? special.abbr : Math.floor(s.start ?? 0)) : ""}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <NoveltyChips shifts={shifts} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dashboard principal (por zona, con drill a repartidor)
// ---------------------------------------------------------------------------

export function Analytics() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);

  const dates = useMemo(() => datesOfMonth(MONTH.year, MONTH.monthIndex), []);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const zoneDrivers = useMemo(() => drivers.filter((d) => d.zoneId === zoneId), [drivers, zoneId]);
  const zoneDriverIds = useMemo(() => new Set(zoneDrivers.map((d) => d.id)), [zoneDrivers]);
  const zoneShifts = useMemo(() => shifts.filter((s) => zoneDriverIds.has(s.driverId)), [shifts, zoneDriverIds]);

  const coverage = useMemo(() => dailyWorking(zoneShifts), [zoneShifts]);
  const zonePos = pointsOfSale.filter((p) => p.zoneId === zoneId).length;
  const activeCount = zoneDrivers.filter((d) => d.status === "ACTIVE").length;
  const zoneHours = totalHours(zoneShifts);
  const gaps = dates.filter((d) => (coverage.get(d) ?? 0) === 0).length;
  const avgCoverage = dates.length
    ? Math.round((dates.reduce((a, d) => a + (coverage.get(d) ?? 0), 0) / dates.length) * 10) / 10
    : 0;
  const noveltyTotal = zoneShifts.filter((s) => isRestCode(s.code) && specialMeta(s.code)?.code !== "DESC").length;

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return zoneDrivers.filter((d) => !q || d.name.toLowerCase().includes(q) || d.id.includes(q));
  }, [zoneDrivers, query]);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) ?? null;
  const selectedDriverShifts = useMemo(
    () => (selectedDriverId ? shifts.filter((s) => s.driverId === selectedDriverId).sort((a, b) => a.date.localeCompare(b.date)) : []),
    [shifts, selectedDriverId],
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <BarChart3 size={18} className="text-brand-600" /> Analítica por zona · {MONTH.label}
            </h2>
            <Select value={zoneId} onChange={(e) => { setZoneId(e.target.value); setSelectedDriverId(null); }} className="h-9 w-auto">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatTile icon={<Users size={16} className="text-brand-700" />} label="Repartidores" value={String(zoneDrivers.length)} sub={`${activeCount} activos`} tint="bg-brand-50" />
            <StatTile icon={<Building2 size={16} className="text-violet-700" />} label="Puntos venta" value={String(zonePos)} tint="bg-violet-50" />
            <StatTile icon={<Clock size={16} className="text-emerald-700" />} label="Horas mes" value={`${zoneHours}`} sub="programadas" tint="bg-emerald-50" />
            <StatTile icon={<Gauge size={16} className="text-sky-700" />} label="Cobertura/día" value={`${avgCoverage}`} sub="promedio" tint="bg-sky-50" />
            <StatTile icon={<AlertTriangle size={16} className="text-accent" />} label="Días sin cobertura" value={String(gaps)} tint="bg-accent-soft" />
            <StatTile icon={<Plane size={16} className="text-amber-600" />} label="Novedades" value={String(noveltyTotal)} sub="días (vac/inc/…)" tint="bg-amber-50" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Cobertura diaria</p>
              <DailyBars dates={dates} counts={coverage} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Distribución de turnos</p>
              <KindDistribution shifts={zoneShifts} />
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Novedades del mes</p>
              <NoveltyChips shifts={zoneShifts} />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDriver && (
        <DriverDetail driver={selectedDriver} shifts={selectedDriverShifts} onClose={() => setSelectedDriverId(null)} />
      )}

      {/* Tabla de repartidores de la zona */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Repartidores de la zona ({zoneDrivers.length})</h2>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className="h-9 w-48 pl-8" />
            </div>
          </div>

          <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
            {filteredDrivers.map((d) => {
              const ds = shifts.filter((s) => s.driverId === d.id);
              const h = totalHours(ds);
              const pct = Math.min(100, Math.round((h / d.monthlyHourCap) * 100));
              const over = h > d.monthlyHourCap;
              const nov = noveltyCounts(ds);
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDriverId(d.id === selectedDriverId ? null : d.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition",
                    d.id === selectedDriverId ? "border-brand-300 bg-brand-50/50" : "border-slate-100 hover:bg-slate-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{d.name}</p>
                    <p className="text-xs text-slate-400">
                      {workedDays(ds)} laborados · {restDays(ds)} descansos
                      {nov.VACAC ? ` · ${nov.VACAC} vacac.` : ""}
                      {nov.INC ? ` · ${nov.INC} incap.` : ""}
                    </p>
                  </div>
                  <div className="hidden w-40 sm:block">
                    <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                      <span>{h}h</span><span>{d.monthlyHourCap}h</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={cn("h-full rounded-full", over ? "bg-accent" : "bg-brand-600")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" />
                </button>
              );
            })}
            {filteredDrivers.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Sin repartidores.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
