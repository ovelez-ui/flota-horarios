"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Building2, Search, X } from "lucide-react";
import type { Driver, Shift, ShiftKind } from "@/types";
import { Input, Select } from "@/components/ui";
import { CountUp, Magnetic, Reveal, spotlight, useOutOfView } from "@/components/ui/motion";
import { StoreMultiSelect } from "./StoreMultiSelect";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { shiftKind, isRestCode, specialMeta } from "@/lib/shift-catalog";
import { sundayCompensationAlerts } from "@/lib/shift-rules";
import { datesOfMonth, parseISO, shortLabel, weekdayName, toISO } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

/** Colores de franja: los mismos del calendario, para que un turno se lea igual en toda la app. */
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

const ESTADOS = [
  "En turno", "Descanso", "Vacaciones", "Incapacidad",
  "Licencia", "Compensatorio", "Día de familia", "Inactivo", "Sin turno",
] as const;
type Estado = (typeof ESTADOS)[number];

const NOVEDAD_ESTADOS: Estado[] = ["Vacaciones", "Incapacidad", "Licencia", "Compensatorio", "Día de familia"];

/** Una zona con menos de este % de su gente en turno se marca como baja. */
const LOW_COVERAGE_PCT = 60;
/** Tiendas sin cobertura que se listan antes de resumir el resto. */
const MAX_ALERTS = 5;

const ESTADO_BY_CODE: Record<string, Estado> = {
  DESC: "Descanso", VACAC: "Vacaciones", INC: "Incapacidad",
  LIC: "Licencia", COMP: "Compensatorio", FAM: "Día de familia",
};

function estadoDe(d: Driver, todayShift: Shift | undefined): Estado {
  if (d.status === "INACTIVE") return "Inactivo";
  if (!todayShift) {
    if (d.status === "VACATION") return "Vacaciones";
    if (d.status === "SICK_LEAVE") return "Incapacidad";
    return "Sin turno";
  }
  const sp = specialMeta(todayShift.code);
  return sp ? (ESTADO_BY_CODE[sp.code] ?? "En turno") : "En turno";
}

/** Un solo código de color para el estado: tinta = en turno, señal = novedad, gris = el resto. */
function estadoChipClass(estado: Estado): string {
  if (estado === "En turno") return "ed-chip is-on";
  if (NOVEDAD_ESTADOS.includes(estado)) return "ed-chip is-out";
  return "ed-chip";
}

const FRANJAS: { kind: ShiftKind; label: string }[] = [
  { kind: "MORNING", label: "Mañana" },
  { kind: "MID", label: "Mediodía" },
  { kind: "AFTERNOON", label: "Tarde" },
  { kind: "NIGHT", label: "Noche" },
];

/** Hora actual (0-23) en Bogotá, sin depender de la zona del navegador. */
function bogotaHour(): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Bogota", hour: "2-digit", hourCycle: "h23" }).format(new Date());
  return Number(h);
}

function previousDay(iso: string): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() - 1);
  return toISO(d);
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

/** Torre de Control: estado de la flota en el día (cifra, pulso de 24 h, alertas y detalle por tienda). */
export function ControlTower({ onOpenCalendar }: { onOpenCalendar?: () => void }) {
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

  // Coreografía de entrada y cifra en la sub-barra cuando el hero sale de pantalla.
  const [ready, setReady] = useState(false);
  const [miniSlot, setMiniSlot] = useState<HTMLElement | null>(null);
  const [figureRef, figureOut] = useOutOfView<HTMLSpanElement>();
  const tableRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setMiniSlot(document.getElementById("dash-mini"));
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isToday = day === todayISO;
  const nowHour = bogotaHour();

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

  // Toda la flota con su turno y estado del día.
  const fleet = useMemo(() => {
    const shiftOfDay = new Map<string, Shift>();
    const hours = new Map<string, number>();
    for (const s of shifts) {
      if (s.date === day) shiftOfDay.set(s.driverId, s);
      hours.set(s.driverId, (hours.get(s.driverId) ?? 0) + (s.hours || 0));
    }
    return drivers.map((d) => {
      const ts = shiftOfDay.get(d.id);
      return { d, ts, estado: estadoDe(d, ts), horas: Math.round((hours.get(d.id) ?? 0) * 10) / 10 };
    });
  }, [drivers, shifts, day]);

  // Alcance (zona + tiendas): de aquí salen la cifra, el pulso y las alertas.
  const scope = useMemo(
    () => fleet.filter((r) => (!zoneId || r.d.zoneId === zoneId) && (posIds.length === 0 || posIds.includes(r.d.basePointOfSaleId))),
    [fleet, zoneId, posIds],
  );

  // Filas de la tabla: el alcance, afinado por estado y búsqueda.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scope.filter((r) => {
      if (estado && r.estado !== estado) return false;
      if (!q) return true;
      const hay = `${r.d.name} ${r.d.id} ${zoneName.get(r.d.zoneId) ?? ""} ${posName.get(r.d.basePointOfSaleId) ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [scope, estado, query, zoneName, posName]);

  const compAlerts = useMemo(() => {
    const ids = new Set(scope.map((r) => r.d.id));
    return sundayCompensationAlerts(shifts.filter((s) => ids.has(s.driverId)), rules).filter((a) => !a.compensated);
  }, [scope, shifts, rules]);

  const kpi = useMemo(() => {
    let enTurno = 0, descansos = 0, novedades = 0, activos = 0;
    for (const r of scope) {
      if (r.estado === "En turno") enTurno++;
      else if (r.estado === "Descanso") descansos++;
      if (NOVEDAD_ESTADOS.includes(r.estado)) novedades++;
      if (r.d.status === "ACTIVE") activos++;
    }
    const cobertura = scope.length ? Math.round((enTurno / scope.length) * 100) : 0;
    return { enTurno, descansos, novedades, activos, total: scope.length, cobertura };
  }, [scope]);

  // Pulso de 24 h: repartidores del alcance trabajando en cada hora del día
  // (incluye la cola de los turnos nocturnos que empezaron el día anterior).
  const byHour = useMemo(() => {
    const ids = new Set(scope.map((r) => r.d.id));
    const prev = previousDay(day);
    const counts = Array.from({ length: 24 }, () => 0);
    for (const s of shifts) {
      if (s.start === null || s.end === null || isRestCode(s.code) || !ids.has(s.driverId)) continue;
      const end = s.end <= s.start ? s.end + 24 : s.end;
      const [from, to] = s.date === day ? [s.start, Math.min(end, 24)] : s.date === prev ? [0, end - 24] : [0, 0];
      for (let h = Math.floor(from); h < to; h++) counts[h]!++;
    }
    const peak = Math.max(...counts);
    return { counts, peak, peakHour: counts.indexOf(peak) };
  }, [scope, shifts, day]);

  const porFranja = useMemo(() => {
    const m = new Map<ShiftKind, number>();
    for (const r of scope) {
      if (!r.ts || isRestCode(r.ts.code)) continue;
      const k = shiftKind(r.ts);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return { m, max: Math.max(1, ...m.values()) };
  }, [scope]);

  // Sin ningún turno cargado ese día no hay nada que alertar: falta la malla, no la cobertura.
  const sinMalla = scope.length > 0 && scope.every((r) => !r.ts);

  // Tiendas del alcance sin nadie en turno ese día, con el motivo dominante.
  const uncovered = useMemo(() => {
    if (sinMalla) return [];
    const byPos = new Map<string, typeof scope>();
    for (const r of scope) byPos.set(r.d.basePointOfSaleId, [...(byPos.get(r.d.basePointOfSaleId) ?? []), r]);
    return [...byPos.entries()]
      .filter(([, rs]) => rs.every((r) => r.estado !== "En turno"))
      .map(([pid, rs]) => {
        const tally = new Map<Estado, number>();
        for (const r of rs) tally.set(r.estado, (tally.get(r.estado) ?? 0) + 1);
        const motivo = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([e, n]) => `${n} ${e.toLowerCase()}`).join(" · ");
        return { id: pid, name: posName.get(pid) ?? "Sin punto de venta", zone: zoneName.get(rs[0]!.d.zoneId) ?? "", motivo };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scope, sinMalla, posName, zoneName]);

  // Cobertura por zona sobre toda la flota (no depende del filtro de zona: es el mapa para elegirla).
  const zoneStats = useMemo(() => {
    const tally = new Map<string, { total: number; on: number }>();
    for (const r of fleet) {
      const t = tally.get(r.d.zoneId) ?? { total: 0, on: 0 };
      t.total++;
      if (r.estado === "En turno") t.on++;
      tally.set(r.d.zoneId, t);
    }
    return zones
      .filter((z) => tally.has(z.id))
      .map((z, i) => {
        const t = tally.get(z.id)!;
        return { id: z.id, name: z.name, short: String(i + 1).padStart(2, "0"), pct: Math.round((t.on / t.total) * 100), ...t };
      });
  }, [fleet, zones]);
  const lowZones = sinMalla ? 0 : zoneStats.filter((z) => z.pct < LOW_COVERAGE_PCT).length;

  const novedades = useMemo(
    () => NOVEDAD_ESTADOS.map((e) => ({ estado: e, n: scope.filter((r) => r.estado === e).length })),
    [scope],
  );

  const pendientes = useMemo(() => {
    const byId = new Map(scope.map((r) => [r.d.id, r.d]));
    return compAlerts.slice(0, 6).map((a) => {
      const d = byId.get(a.driverId);
      return { ...a, name: d?.name ?? a.driverId, pos: d ? (posName.get(d.basePointOfSaleId) ?? "") : "" };
    });
  }, [compAlerts, scope, posName]);

  // Filas agrupadas por tienda.
  const groups = useMemo(() => {
    const byPos = new Map<string, typeof rows>();
    for (const r of rows) byPos.set(r.d.basePointOfSaleId, [...(byPos.get(r.d.basePointOfSaleId) ?? []), r]);
    return [...byPos.entries()]
      .map(([pid, rs]) => ({ id: pid, name: posName.get(pid) ?? "Sin punto de venta", rows: rs }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, posName]);

  /** Lleva la tabla a una tienda sin tocar el alcance (la cifra del hero no cambia). */
  function showStore(name: string) {
    setEstado("");
    setQuery(name);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const dayText = isToday ? "hoy" : `el ${shortLabel(day)}`;
  const leadAlert =
    uncovered.length === 0
      ? "Todas las tiendas tienen repartidor en turno."
      : `${uncovered.length} ${plural(uncovered.length, "tienda queda", "tiendas quedan")} sin repartidor en turno.`;

  return (
    <div>
      {/* ================= HERO ================= */}
      <section className={cn("ed-hero", ready && "ed-ready")} aria-labelledby="torre-title">
        <div className="min-w-0">
          <p className="ed-eyebrow ed-rise flex flex-wrap items-center gap-x-4 gap-y-2" style={cssVars({ "--i": 0 })}>
            {isToday ? (
              <span className="ed-live"><i aria-hidden />En vivo</span>
            ) : (
              <span>Consulta</span>
            )}
            <span>Torre de control</span>
            <span>{weekdayName(day)} {shortLabel(day)}</span>
          </p>

          <h2 className="ed-figure" id="torre-title">
            <span className="sr-only">{kpi.enTurno} de {kpi.total} repartidores con turno {dayText}</span>
            <span ref={figureRef} className="ed-figure-num" aria-hidden><CountUp value={kpi.enTurno} /></span>
            <span className="ed-figure-cap ed-rise" style={cssVars({ "--i": 3 })} aria-hidden>
              de {kpi.total} repartidores<b>con turno {dayText}</b>
            </span>
          </h2>

          <p className="ed-lead ed-rise" style={cssVars({ "--i": 4 })}>
            {kpi.total === 0 ? (
              "No hay repartidores en este alcance."
            ) : sinMalla ? (
              `Aún no hay malla cargada para ${dayText}.`
            ) : (
              <>Cobertura del {kpi.cobertura}&nbsp;%. {uncovered.length > 0 ? <em>{leadAlert}</em> : leadAlert}</>
            )}
          </p>

          <div className="ed-rise mt-8 flex flex-wrap items-center gap-x-7 gap-y-4" style={cssVars({ "--i": 5 })}>
            {uncovered.length > 0 ? (
              <>
                <Magnetic>
                  <a className="ed-cta" href="#torre-alertas">
                    Revisar {uncovered.length} {plural(uncovered.length, "alerta", "alertas")}
                    <ArrowUpRight size={18} strokeWidth={2.25} aria-hidden />
                  </a>
                </Magnetic>
                {onOpenCalendar && (
                  <button type="button" className="ed-link" onClick={onOpenCalendar}>Abrir el calendario</button>
                )}
              </>
            ) : (
              onOpenCalendar && (
                <Magnetic>
                  <button type="button" className="ed-cta" onClick={onOpenCalendar}>
                    Abrir el calendario
                    <ArrowUpRight size={18} strokeWidth={2.25} aria-hidden />
                  </button>
                </Magnetic>
              )
            )}
          </div>

          <dl className="ed-facts ed-rise" style={cssVars({ "--i": 6 })}>
            <div><dt className="ed-eyebrow">Descansos</dt><dd>{kpi.descansos}</dd></div>
            <div><dt className="ed-eyebrow">Novedades</dt><dd>{kpi.novedades}</dd></div>
            <div><dt className="ed-eyebrow">Dom. sin compensar</dt><dd>{compAlerts.length}</dd></div>
            <div><dt className="ed-eyebrow">Activos</dt><dd>{kpi.activos}</dd></div>
          </dl>

          {/* Alcance: define de quién habla la cifra. */}
          <div className="ed-rise mt-8 flex flex-wrap items-end gap-3" style={cssVars({ "--i": 7 })}>
            <label className="text-sm">
              <span className="ed-eyebrow mb-1.5 block">Día</span>
              <Select value={day} onChange={(e) => setDay(e.target.value)} className="h-10 w-auto">
                {dates.map((d) => (
                  <option key={d} value={d}>{shortLabel(d)} · {weekdayName(d)}</option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="ed-eyebrow mb-1.5 block">Zona</span>
              <Select value={zoneId} onChange={(e) => { setZoneId(e.target.value); setPosIds([]); }} className="h-10 w-48">
                <option value="">Todas las zonas</option>
                {zones.map((z) => (<option key={z.id} value={z.id}>{z.name}</option>))}
              </Select>
            </label>
            <div className="text-sm">
              <span className="ed-eyebrow mb-1.5 block">Tiendas</span>
              <StoreMultiSelect options={storeOptions} selected={posIds} onChange={setPosIds} />
            </div>
          </div>
        </div>

        <aside className="ed-rise min-w-0 self-end" style={cssVars({ "--i": 2 })} aria-labelledby="torre-pulso">
          <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3.5">
            <h3 id="torre-pulso" className="ed-serif text-[1.375rem] leading-tight text-ink">Pulso de 24 horas</h3>
            <p className="ed-eyebrow">
              {isToday ? `Ahora · ${byHour.counts[nowHour]} en turno` : "Repartidores por hora"}
            </p>
          </div>
          <ol
            className="ed-hours"
            role="img"
            aria-label={`Repartidores en turno por hora ${dayText}. Máximo de ${byHour.peak} a las ${byHour.peakHour}:00.`}
          >
            {byHour.counts.map((n, h) => {
              const state = !isToday ? (day > todayISO ? "is-next" : "") : h === nowHour ? "is-now" : h > nowHour ? "is-next" : "";
              return (
                <li key={h} className={state} title={`${String(h).padStart(2, "0")}:00 · ${n} ${plural(n, "repartidor", "repartidores")}`}>
                  <i style={cssVars({ "--v": byHour.peak ? n / byHour.peak : 0, "--i": h })} />
                </li>
              );
            })}
          </ol>
          <div className="ed-num mt-2 flex justify-between text-[0.6875rem] text-muted" aria-hidden>
            <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
          </div>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.8125rem] text-muted" aria-hidden>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 bg-data" />Transcurrido</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 bg-signal" />Ahora</span>
            <span className="inline-flex items-center gap-2"><i className="ed-key-next h-3 w-3" />Programado</span>
          </p>

          <ul className="ed-slots mt-7 border-t border-line" aria-label={`Repartidores programados ${dayText} por franja`}>
            {FRANJAS.map((f, i) => {
              const n = porFranja.m.get(f.kind) ?? 0;
              return (
                <li key={f.kind}>
                  <span>{f.label}</span>
                  <span className="ed-track"><i style={cssVars({ "--v": n / porFranja.max, "--i": i })} /></span>
                  <span className="ed-num text-right">{n}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </section>

      {/* ================= BENTO ================= */}
      <section className="pb-12 lg:px-[2.5vw]" aria-labelledby="torre-atencion">
        <Reveal as="header" className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-5">
          <h3 id="torre-atencion" className="ed-serif text-[clamp(1.75rem,3.4vw,3rem)] leading-none tracking-tight text-ink">
            Lo que pide atención
          </h3>
          <p className="ed-eyebrow">
            {uncovered.length} {plural(uncovered.length, "tienda", "tiendas")} sin cobertura · {lowZones} {plural(lowZones, "zona", "zonas")} bajo {LOW_COVERAGE_PCT}&nbsp;%
          </p>
        </Reveal>

        <div className="ed-bento">
          <Reveal as="article" id="torre-alertas" className="ed-cell ed-cell--ink scroll-mt-40" onPointerMove={spotlight}>
            <p className="ed-eyebrow">Alertas · {shortLabel(day)}</p>
            <h4 className="ed-serif mt-2 text-[1.375rem] leading-tight">Tiendas sin cobertura</h4>
            {uncovered.length === 0 ? (
              <p className="mt-6 text-muted">
                {sinMalla ? "Sin malla cargada para este día: no hay cobertura que evaluar." : "Ninguna tienda del alcance queda sin repartidor en turno."}
              </p>
            ) : (
              <ol className="mt-6">
                {uncovered.slice(0, MAX_ALERTS).map((u, i) => (
                  <li key={u.id} className="border-t border-line-soft">
                    <button type="button" className="ed-alert" onClick={() => showStore(u.name)}>
                      <span className="n" aria-hidden>{i + 1}</span>
                      <span className="min-w-0">
                        <strong className="block truncate font-black">{u.name}</strong>
                        <small className="block truncate text-sm text-muted">{u.zone} · {u.motivo}</small>
                      </span>
                      <ArrowUpRight size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {uncovered.length > MAX_ALERTS && (
              <p className="border-t border-line-soft pt-4 text-sm text-muted">
                y {uncovered.length - MAX_ALERTS} más · filtra la tabla por estado para verlas todas.
              </p>
            )}
          </Reveal>

          <Reveal as="article" index={1} className="ed-cell" onPointerMove={spotlight}>
            <p className="ed-eyebrow">Cobertura por zona · elige una para acotar</p>
            <h4 className="ed-serif mt-2 text-[1.375rem] leading-tight">
              {zoneStats.length} {plural(zoneStats.length, "zona", "zonas")}, {lowZones} bajo {LOW_COVERAGE_PCT}&nbsp;%
            </h4>
            <ul className="ed-zones">
              {zoneStats.map((z) => (
                <li key={z.id}>
                  <button
                    type="button"
                    className={cn("ed-zone", !sinMalla && z.pct < LOW_COVERAGE_PCT && "is-low")}
                    style={cssVars({ "--c": z.pct })}
                    aria-pressed={zoneId === z.id}
                    title={`${z.name} · ${z.on} de ${z.total} en turno`}
                    onClick={() => { setZoneId(zoneId === z.id ? "" : z.id); setPosIds([]); }}
                  >
                    <span><span className="sr-only">{z.name}: </span>{z.short}</span>
                    <small>{z.pct}&nbsp;%{!sinMalla && z.pct < LOW_COVERAGE_PCT && <span className="sr-only"> · cobertura baja</span>}</small>
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal as="article" index={2} className="ed-cell" onPointerMove={spotlight}>
            <p className="ed-eyebrow">Novedades · {shortLabel(day)}</p>
            <h4 className="ed-serif mt-2 text-[1.375rem] leading-tight">
              {kpi.novedades} {plural(kpi.novedades, "repartidor fuera", "repartidores fuera")} por novedad
            </h4>
            <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-5">
              {novedades.map((nv) => (
                <div key={nv.estado} className={cn(nv.n === 0 && "opacity-45")}>
                  <dd className="font-serif text-[2.5rem] font-light leading-none tabular-nums">{nv.n}</dd>
                  <dt className="mt-1 text-sm text-muted">{nv.estado}</dt>
                </div>
              ))}
            </dl>

            <h5 className="ed-eyebrow mt-8 border-t border-line-soft pt-5">Compensatorios pendientes · {compAlerts.length}</h5>
            {pendientes.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Sin pendientes en el alcance.</p>
            ) : (
              <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                {pendientes.map((a) => (
                  <li key={`${a.driverId}-${a.sundayDate}`} className="min-w-0">
                    <div className="truncate text-sm font-bold">{a.name} · dom {shortLabel(a.sundayDate)}</div>
                    <div className="truncate text-xs text-muted">{a.pos} · vence {shortLabel(a.dueBy)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </section>

      {/* ================= DETALLE POR TIENDA ================= */}
      <section ref={tableRef} className="scroll-mt-36 pb-10 lg:px-[2.5vw]" aria-labelledby="torre-detalle">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-4">
          <div>
            <p className="ed-eyebrow">Operación · {shortLabel(day)} · {rows.length} {plural(rows.length, "repartidor", "repartidores")}</p>
            <h3 id="torre-detalle" className="ed-serif mt-1.5 text-2xl text-ink">Repartidores por tienda</h3>
          </div>
          <div className="flex flex-1 flex-wrap items-end justify-end gap-3">
            <label className="text-sm">
              <span className="ed-eyebrow mb-1.5 block">Estado</span>
              <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-10 w-44">
                <option value="">Todos</option>
                {ESTADOS.map((e) => (<option key={e} value={e}>{e}</option>))}
              </Select>
            </label>
            <label className="min-w-[200px] max-w-md flex-1 text-sm">
              <span className="ed-eyebrow mb-1.5 block">Buscar</span>
              <span className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cédula, nombre, zona o tienda…" className="h-10 pl-9 pr-10" />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink" aria-label="Limpiar búsqueda">
                    <X size={14} />
                  </button>
                )}
              </span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto border border-line bg-surface">
          <table className="w-full border-collapse text-sm text-ink">
            <thead>
              <tr className="ed-eyebrow border-b border-line text-left">
                <th className="px-4 py-3 font-medium">Repartidor</th>
                <th className="px-4 py-3 font-medium">Zona</th>
                <th className="px-4 py-3 text-center font-medium">Turno</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Horas mes</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.id}>
                  <tr>
                    <th colSpan={5} scope="colgroup" className="border-y border-line-soft bg-paper px-4 py-2 text-left">
                      <span className="ed-eyebrow flex items-center gap-2">
                        <Building2 size={12} aria-hidden /> {g.name} · {g.rows.length}
                      </span>
                    </th>
                  </tr>
                  {g.rows.map(({ d, ts, estado: est, horas }) => (
                    <tr key={d.id} className="border-b border-line-soft last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="font-bold leading-tight">{d.name}</div>
                        <div className="ed-num text-[0.6875rem] text-muted">C.C. {d.id}</div>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{zoneName.get(d.zoneId) ?? d.zoneId}</td>
                      <td className="px-4 py-2.5 text-center">
                        {ts ? (
                          <span className={cn("ed-num inline-flex h-6 min-w-[52px] items-center justify-center rounded px-2 text-[0.6875rem] font-medium", turnoChipClass(ts.code))}>
                            {specialMeta(ts.code)?.abbr ?? ts.code}
                          </span>
                        ) : (
                          <span className="text-muted" aria-label="Sin turno">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center"><span className={estadoChipClass(est)}>{est}</span></td>
                      <td className="ed-num px-4 py-2.5 text-right">{horas} h</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    Ningún repartidor coincide con el filtro.{" "}
                    <button type="button" className="font-bold text-ink underline" onClick={() => { setEstado(""); setQuery(""); }}>
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Continuidad: la cifra viaja a la sub-barra cuando el hero sale de pantalla. */}
      {miniSlot &&
        createPortal(
          <span className={cn("ed-mini", figureOut && "is-on")} aria-hidden>
            <b>{kpi.enTurno}</b>/{kpi.total} con turno · {kpi.cobertura}&nbsp;%
          </span>,
          miniSlot,
        )}
    </div>
  );
}
