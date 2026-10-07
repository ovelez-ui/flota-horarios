"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Search, Building2, X, Radio } from "lucide-react";
import type { Driver, Shift, ShiftKind } from "@/types";
import { Card, CardContent, Eyebrow, IconChip, Input, Select } from "@/components/ui";
import { StoreMultiSelect } from "./StoreMultiSelect";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { shiftKind, isRestCode, specialMeta } from "@/lib/shift-catalog";
import { totalHours, sundayCompensationAlerts } from "@/lib/shift-rules";
import { datesOfMonth, shortLabel, weekdayName, toISO } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const KIND_BG: Record<ShiftKind, string> = {
  MORNING: "bg-sky-100 text-sky-800",
  MID: "bg-violet-100 text-violet-800",
  AFTERNOON: "bg-amber-100 text-amber-800",
  NIGHT: "bg-indigo-100 text-indigo-800",
  REST: "bg-slate-100 text-slate-400",
};

function turnoChipClass(code: string): string {
  return specialMeta(code)?.cell ?? KIND_BG[shiftKind({ code })];
}

type Estado =
  | "En turno" | "Descanso" | "Vacaciones" | "Incapacidad"
  | "Licencia" | "Compensatorio" | "Día de familia" | "Inactivo" | "Sin turno";

const ESTADO_CLASS: Record<Estado, string> = {
  "En turno": "bg-sky-100 text-sky-800",
  "Descanso": "bg-slate-200 text-slate-600",
  "Vacaciones": "bg-emerald-100 text-emerald-700",
  "Incapacidad": "bg-rose-100 text-rose-700",
  "Licencia": "bg-teal-100 text-teal-700",
  "Compensatorio": "bg-cyan-100 text-cyan-700",
  "Día de familia": "bg-fuchsia-100 text-fuchsia-700",
  "Inactivo": "bg-slate-200 text-slate-500",
  "Sin turno": "bg-slate-100 text-slate-400",
};

const NOVEDAD_ESTADOS: Estado[] = ["Vacaciones", "Incapacidad", "Licencia", "Compensatorio", "Día de familia"];

function estadoDe(d: Driver, todayShift: Shift | undefined): Estado {
  if (d.status === "INACTIVE") return "Inactivo";
  if (!todayShift) {
    if (d.status === "VACATION") return "Vacaciones";
    if (d.status === "SICK_LEAVE") return "Incapacidad";
    return "Sin turno";
  }
  const sp = specialMeta(todayShift.code);
  if (sp) {
    const m: Record<string, Estado> = {
      DESC: "Descanso", VACAC: "Vacaciones", INC: "Incapacidad",
      LIC: "Licencia", COMP: "Compensatorio", FAM: "Día de familia",
    };
    return m[sp.code] ?? "En turno";
  }
  return "En turno";
}

const FRANJAS: { kind: ShiftKind; label: string; bar: string }[] = [
  { kind: "MORNING", label: "Mañana", bar: "bg-sky-500" },
  { kind: "MID", label: "Mediodía", bar: "bg-violet-500" },
  { kind: "AFTERNOON", label: "Tarde", bar: "bg-amber-500" },
  { kind: "NIGHT", label: "Noche", bar: "bg-indigo-500" },
];

/** Torre de Control: resumen operativo del día (estado de la flota por tienda). */
export function ControlTower() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const rules = useFleetStore((s) => s.rules);
  const month = useFleetStore((s) => s.month);

  const dates = useMemo(() => datesOfMonth(month.year, month.monthIndex), [month]);
  const todayISO = toISO(new Date());
  const [day, setDay] = useState(() => (dates.includes(todayISO) ? todayISO : dates[0]!));
  const [zoneId, setZoneId] = useState<string>(""); // "" = todas las zonas
  const [posIds, setPosIds] = useState<string[]>([]);
  const [estado, setEstado] = useState<string>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!dates.includes(day)) setDay(dates.includes(todayISO) ? todayISO : dates[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  const zoneName = useMemo(() => new Map(zones.map((z) => [z.id, z.name])), [zones]);
  const posName = useMemo(() => new Map(pointsOfSale.map((p) => [p.id, p.name])), [pointsOfSale]);

  // Tiendas para el filtro (de la zona elegida o todas).
  const storeOptions = useMemo(
    () =>
      (zoneId ? pointsOfSale.filter((p) => p.zoneId === zoneId) : pointsOfSale)
        .map((p) => ({ id: p.id, name: p.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [pointsOfSale, zoneId],
  );

  // Turno del día y horas del mes por repartidor.
  const shiftOfDay = useMemo(() => {
    const m = new Map<string, Shift>();
    for (const s of shifts) if (s.date === day) m.set(s.driverId, s);
    return m;
  }, [shifts, day]);

  const hoursByDriver = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shifts) m.set(s.driverId, (m.get(s.driverId) ?? 0) + (s.hours || 0));
    return m;
  }, [shifts]);

  // Repartidores en alcance (zona + tiendas) con sus datos del día.
  const scope = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers
      .filter((d) => (!zoneId || d.zoneId === zoneId) && (posIds.length === 0 || posIds.includes(d.basePointOfSaleId)))
      .map((d) => {
        const ts = shiftOfDay.get(d.id);
        return {
          d,
          ts,
          estado: estadoDe(d, ts),
          horas: Math.round((hoursByDriver.get(d.id) ?? 0) * 10) / 10,
        };
      })
      .filter((r) => (!estado || r.estado === estado))
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.d.name} ${r.d.id} ${zoneName.get(r.d.zoneId) ?? ""} ${posName.get(r.d.basePointOfSaleId) ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [drivers, zoneId, posIds, estado, query, shiftOfDay, hoursByDriver, zoneName, posName]);

  // KPIs del día sobre el alcance.
  const kpi = useMemo(() => {
    let enTurno = 0, descansos = 0, novedades = 0, activos = 0;
    for (const r of scope) {
      if (r.estado === "En turno") enTurno++;
      else if (r.estado === "Descanso") descansos++;
      if (NOVEDAD_ESTADOS.includes(r.estado)) novedades++;
      if (r.d.status === "ACTIVE") activos++;
    }
    const ids = new Set(scope.map((r) => r.d.id));
    const pend = sundayCompensationAlerts(shifts.filter((s) => ids.has(s.driverId)), rules).filter((a) => !a.compensated).length;
    const cobertura = scope.length ? Math.round((enTurno / scope.length) * 100) : 0;
    return { enTurno, descansos, novedades, activos, total: scope.length, pend, cobertura };
  }, [scope, shifts, rules]);

  // Cobertura por franja (del día, en alcance).
  const porFranja = useMemo(() => {
    const m = new Map<ShiftKind, number>();
    let max = 1;
    for (const r of scope) {
      if (!r.ts || isRestCode(r.ts.code)) continue;
      const k = shiftKind(r.ts);
      const n = (m.get(k) ?? 0) + 1;
      m.set(k, n);
      if (n > max) max = n;
    }
    return { m, max };
  }, [scope]);

  // Pendientes de compensatorio (para el panel lateral).
  const pendientes = useMemo(() => {
    const ids = new Set(scope.map((r) => r.d.id));
    const nameById = new Map(scope.map((r) => [r.d.id, r.d.name]));
    const posById = new Map(scope.map((r) => [r.d.id, posName.get(r.d.basePointOfSaleId) ?? ""]));
    return sundayCompensationAlerts(shifts.filter((s) => ids.has(s.driverId)), rules)
      .filter((a) => !a.compensated)
      .slice(0, 6)
      .map((a) => ({ ...a, name: nameById.get(a.driverId) ?? a.driverId, pos: posById.get(a.driverId) ?? "" }));
  }, [scope, shifts, rules, posName]);

  // Agrupar el alcance por tienda.
  const groups = useMemo(() => {
    const byPos = new Map<string, typeof scope>();
    for (const r of scope) {
      const arr = byPos.get(r.d.basePointOfSaleId) ?? [];
      arr.push(r);
      byPos.set(r.d.basePointOfSaleId, arr);
    }
    return [...byPos.entries()]
      .map(([pid, rows]) => ({ id: pid, name: posName.get(pid) ?? "Sin punto de venta", rows }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scope, posName]);

  const kpis = [
    { cap: "En turno hoy", val: String(kpi.enTurno), dot: "bg-sky-500", foot: `de ${kpi.total} en alcance` },
    { cap: "Descansos", val: String(kpi.descansos), dot: "bg-slate-400", foot: "del día" },
    { cap: "Novedades", val: String(kpi.novedades), dot: "bg-emerald-500", foot: "vac · inc · lic · comp" },
    { cap: "Cobertura", val: `${kpi.cobertura}%`, dot: "bg-emerald-500", foot: "en turno / alcance" },
    { cap: "Dom. sin compensar", val: String(kpi.pend), dot: "bg-amber-500", foot: "del mes" },
    { cap: "Activos", val: String(kpi.activos), dot: "bg-brand-600", foot: `${kpi.total ? Math.round((kpi.activos / kpi.total) * 100) : 0}% del alcance` },
  ];

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Pasteur · resumen operativo</Eyebrow>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-light tracking-tight text-slate-900 sm:text-2xl">
            <IconChip icon={<Radio size={16} />} /> Torre de Control
          </h2>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Día</span>
          <Select value={day} onChange={(e) => setDay(e.target.value)} className="h-9 w-auto">
            {dates.map((d) => (
              <option key={d} value={d}>{shortLabel(d)} · {weekdayName(d)}</option>
            ))}
          </Select>
        </label>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <label className="text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Zona</span>
            <Select value={zoneId} onChange={(e) => { setZoneId(e.target.value); setPosIds([]); }} className="h-9 w-48">
              <option value="">Todas las zonas</option>
              {zones.map((z) => (<option key={z.id} value={z.id}>{z.name}</option>))}
            </Select>
          </label>
          <div className="text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tiendas</span>
            <StoreMultiSelect options={storeOptions} selected={posIds} onChange={setPosIds} />
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Estado</span>
            <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-9 w-44">
              <option value="">Todos</option>
              {(Object.keys(ESTADO_CLASS) as Estado[]).map((e) => (<option key={e} value={e}>{e}</option>))}
            </Select>
          </label>
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Buscar</span>
            <span className="relative block">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cédula, nombre, zona o tienda…" className="h-9 pl-9 pr-9" />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Limpiar">
                  <X size={14} />
                </button>
              )}
            </span>
          </label>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.cap}>
            <CardContent className="pt-5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <span className={cn("h-2 w-2 rounded", k.dot)} /> {k.cap}
              </p>
              <p className="mt-1.5 text-3xl font-light leading-none tracking-tight tabular-nums text-slate-900">{k.val}</p>
              <p className="mt-1.5 text-[11px] text-slate-400">{k.foot}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cuerpo: tabla + panel lateral */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="min-w-0">
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <Eyebrow>Operación · {shortLabel(day)}</Eyebrow>
                <h3 className="mt-0.5 font-semibold text-slate-900">Repartidores por tienda</h3>
              </div>
              <span className="text-xs text-slate-400">{scope.length} repartidor(es)</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Repartidor</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2 text-center">Turno hoy</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-right">Horas mes</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <Fragment key={g.id}>
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="border-y border-slate-200 px-3 py-1.5">
                          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            <Building2 size={12} className="text-slate-400" /> {g.name}
                            <span className="font-normal text-slate-400">· {g.rows.length}</span>
                          </span>
                        </td>
                      </tr>
                      {g.rows.map(({ d, ts, estado: est, horas }) => (
                        <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                          <td className="px-3 py-2">
                            <div className="font-medium leading-tight text-slate-800">{d.name}</div>
                            <div className="text-[11px] tabular-nums text-slate-400">C.C. {d.id}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-500">{zoneName.get(d.zoneId) ?? d.zoneId}</td>
                          <td className="px-3 py-2 text-center">
                            {ts ? (
                              <span className={cn("inline-flex h-6 min-w-[52px] items-center justify-center rounded-md px-2 text-[11px] font-semibold", turnoChipClass(ts.code))}>
                                {specialMeta(ts.code)?.abbr ?? ts.code}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold", ESTADO_CLASS[est])}>{est}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600">{horas} h</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {groups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-slate-400">No hay repartidores para el filtro.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="pt-5">
              <Eyebrow>Cobertura · {shortLabel(day)}</Eyebrow>
              <h3 className="mt-0.5 font-semibold text-slate-900">Por franja horaria</h3>
              <div className="mt-3 space-y-2.5">
                {FRANJAS.map((f) => {
                  const n = porFranja.m.get(f.kind) ?? 0;
                  const pct = Math.round((n / porFranja.max) * 100);
                  return (
                    <div key={f.kind} className="grid grid-cols-[70px_1fr_34px] items-center gap-2.5">
                      <span className="text-xs font-medium text-slate-500">{f.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <span className={cn("block h-full rounded-full", f.bar)} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-right text-xs font-semibold tabular-nums text-slate-700">{n}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <Eyebrow className="text-amber-600 dark:text-amber-300">Atención</Eyebrow>
              <h3 className="mt-0.5 font-semibold text-slate-900">Compensatorios pendientes</h3>
              {pendientes.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Sin pendientes en el alcance.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {pendientes.map((a) => (
                    <li key={`${a.driverId}-${a.sundayDate}`} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-amber-50 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">!</span>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-slate-700">{a.name} · dom {shortLabel(a.sundayDate)}</div>
                        <div className="truncate text-[11px] text-slate-400">{a.pos} · vence {shortLabel(a.dueBy)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
