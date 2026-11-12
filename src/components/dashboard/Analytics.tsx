"use client";

import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { Driver, Shift, ShiftKind } from "@/types";
import { Input, Select } from "@/components/ui";
import { Reveal, spotlight } from "@/components/ui/motion";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { totalHours, workedDays, restDays } from "@/lib/shift-rules";
import { shiftKind, isRestCode, specialMeta, SPECIAL_CODE_LIST, SPECIAL_CODES } from "@/lib/shift-catalog";
import {
  kindDistribution, noveltyCounts, dailyWorking, hoursInDates,
  KIND_LABEL, KIND_COLOR,
} from "@/lib/analytics";
import { datesOfMonth, monthWeeks, parseISO, isWeekend, shortLabel, weekdayName } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const KINDS: ShiftKind[] = ["MORNING", "MID", "AFTERNOON", "NIGHT"];

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;
const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ---------------------------------------------------------------------------
// Primitivas de gráfico (CSS puro, sin librerías → aptas para hosting estático)
// ---------------------------------------------------------------------------

/** Fila "etiqueta · barra · valor". La barra es tinta: el color queda para la muestra de franja. */
function TrackRow({ label, value, max, swatch, index = 0, unit = "" }: {
  label: string; value: number; max: number; swatch?: string; index?: number; unit?: string;
}) {
  return (
    <li>
      <span className="flex items-center gap-2">
        {swatch && <i className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: swatch }} aria-hidden />}
        {label}
      </span>
      <span className="ed-track"><i style={cssVars({ "--v": max > 0 ? value / max : 0, "--i": index })} /></span>
      <span className="ed-num text-right">{num(value)}{unit}</span>
    </li>
  );
}

/** Turnos trabajados por franja. La muestra de color es la misma del calendario. */
function KindDistribution({ shifts, label }: { shifts: Shift[]; label: string }) {
  const dist = kindDistribution(shifts);
  const max = Math.max(1, ...KINDS.map((k) => dist[k]));
  return (
    <ul className="ed-slots border-t border-line" aria-label={label}>
      {KINDS.map((k, i) => (
        <TrackRow key={k} label={KIND_LABEL[k]} value={dist[k]} max={max} swatch={KIND_COLOR[k]} index={i} />
      ))}
    </ul>
  );
}

/** Novedades como cifras: las que están en cero se atenúan para que resalte lo que sí pasó. */
function NoveltyFigures({ shifts, compact = false }: { shifts: Shift[]; compact?: boolean }) {
  const counts = noveltyCounts(shifts);
  return (
    <dl className={cn("grid grid-cols-3 gap-x-6 gap-y-5", compact ? "sm:grid-cols-6" : "sm:grid-cols-3")}>
      {SPECIAL_CODE_LIST.map((code) => {
        const n = counts[code] ?? 0;
        return (
          <div key={code} className={cn(n === 0 && "opacity-45")}>
            <dd className={cn("font-serif font-light leading-none tabular-nums", compact ? "text-3xl" : "text-[2.5rem]")}>{n}</dd>
            <dt className="mt-1 text-sm text-muted">{SPECIAL_CODES[code]!.label}</dt>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Cobertura diaria: una barra por día. El fin de semana va atenuado y un día
 * sin nadie en turno se marca en rojo de señal (y con texto para lectores).
 */
function DailyBars({ dates, counts }: { dates: string[]; counts: Map<string, number> }) {
  const max = Math.max(1, ...dates.map((d) => counts.get(d) ?? 0));
  const columns = cssVars({ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` });
  return (
    <>
      <ol className="ed-hours" style={columns} role="img" aria-label={`Repartidores en turno por día. Máximo de ${max} en un día.`}>
        {dates.map((d, i) => {
          const c = counts.get(d) ?? 0;
          return (
            <li
              key={d}
              className={cn(c === 0 ? "is-gap" : isWeekend(d) && "is-weekend")}
              title={`${weekdayName(d)} ${shortLabel(d)} · ${c === 0 ? "sin cobertura" : `${c} ${plural(c, "repartidor", "repartidores")}`}`}
            >
              <i style={cssVars({ "--v": c / max, "--i": i })} />
            </li>
          );
        })}
      </ol>
      {/* Eje: solo el inicio de cada semana del mes, para no llenar de números. */}
      <div className="ed-num mt-2 grid text-[0.6875rem] text-muted" style={columns} aria-hidden>
        {dates.map((d, i) => (
          <span key={d}>{i % 7 === 0 ? parseISO(d).getDate() : ""}</span>
        ))}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.8125rem] text-muted" aria-hidden>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 bg-data" />Entre semana</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 bg-data opacity-50" />Fin de semana</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 bg-signal" />Sin cobertura</span>
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Detalle por repartidor (se abre debajo de su fila)
// ---------------------------------------------------------------------------

function HoursBar({ hours, cap }: { hours: number; cap: number }) {
  const over = hours > cap;
  return (
    <div>
      <div className="ed-num mb-1.5 flex justify-between text-xs">
        <span className={cn(over ? "font-medium text-signal" : "text-ink")}>
          {num(hours)} h{over && " · sobre el tope"}
        </span>
        <span className="text-muted">{cap} h</span>
      </div>
      <div className="h-[3px] bg-line-soft">
        <div className={cn("h-full", over ? "bg-signal" : "bg-ink")} style={{ width: `${Math.min(100, (hours / cap) * 100)}%` }} />
      </div>
    </div>
  );
}

function DriverDetail({ driver, shifts, onClose }: { driver: Driver; shifts: Shift[]; onClose: () => void }) {
  const month = useFleetStore((s) => s.month);
  const dates = useMemo(() => datesOfMonth(month.year, month.monthIndex), [month]);
  const weeks = useMemo(() => monthWeeks(dates), [dates]);
  const weekHours = weeks.map((w) => ({ label: w.label, hours: hoursInDates(shifts, new Set(w.dates)) }));
  const maxWeek = Math.max(1, ...weekHours.map((w) => w.hours));
  const byDate = new Map(shifts.map((s) => [s.date, s]));

  return (
    <div className="ed-ready border-b border-line bg-paper px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="ed-eyebrow">Detalle del mes · C.C. {driver.id}</p>
          <h4 className="ed-serif mt-1.5 text-2xl leading-tight text-ink">{driver.name}</h4>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-line-soft hover:text-ink" aria-label="Cerrar detalle">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-x-12 gap-y-7 md:grid-cols-2">
        <div>
          <p className="ed-eyebrow mb-3">Horas por semana</p>
          <ul className="ed-slots border-t border-line">
            {weekHours.map((w, i) => (
              <TrackRow key={w.label} label={w.label} value={w.hours} max={maxWeek} index={i} unit=" h" />
            ))}
          </ul>
        </div>
        <div>
          <p className="ed-eyebrow mb-3">Turnos por franja</p>
          <KindDistribution shifts={shifts} label={`Turnos de ${driver.name} por franja`} />
        </div>
      </div>

      <p className="ed-eyebrow mb-3 mt-7">El mes, día a día</p>
      <ol className="flex flex-wrap gap-1" aria-label="Turno de cada día del mes">
        {dates.map((d) => {
          const s = byDate.get(d);
          const special = s ? specialMeta(s.code) : undefined;
          const solid = s && !special ? KIND_COLOR[shiftKind(s)] : undefined;
          const text = s ? (special ? special.label : `${s.code} (${s.hours} h)`) : "sin turno";
          return (
            <li
              key={d}
              className={cn("ed-num grid h-8 w-8 place-items-center text-[0.625rem] font-medium", special?.cell, !s && "border border-line-soft text-muted")}
              style={solid ? { backgroundColor: solid, color: "#fff" } : undefined}
              title={`${weekdayName(d)} ${shortLabel(d)} · ${text}`}
            >
              <span aria-hidden>{s ? (special ? special.abbr : Math.floor(s.start ?? 0)) : "·"}</span>
              <span className="sr-only">{shortLabel(d)}: {text}</span>
            </li>
          );
        })}
      </ol>

      <p className="ed-eyebrow mb-4 mt-7">Novedades del mes</p>
      <NoveltyFigures shifts={shifts} compact />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analítica por zona (con detalle por repartidor)
// ---------------------------------------------------------------------------

export function Analytics() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const month = useFleetStore((s) => s.month);

  const dates = useMemo(() => datesOfMonth(month.year, month.monthIndex), [month]);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const zoneDrivers = useMemo(() => drivers.filter((d) => d.zoneId === zoneId), [drivers, zoneId]);

  // Turnos de la zona, agrupados por repartidor una sola vez.
  const shiftsByDriver = useMemo(() => {
    const ids = new Set(zoneDrivers.map((d) => d.id));
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      if (!ids.has(s.driverId)) continue;
      m.set(s.driverId, [...(m.get(s.driverId) ?? []), s]);
    }
    return m;
  }, [shifts, zoneDrivers]);
  const zoneShifts = useMemo(() => [...shiftsByDriver.values()].flat(), [shiftsByDriver]);

  const coverage = useMemo(() => dailyWorking(zoneShifts), [zoneShifts]);
  const zonePos = pointsOfSale.filter((p) => p.zoneId === zoneId).length;
  const activeCount = zoneDrivers.filter((d) => d.status === "ACTIVE").length;
  const gapDates = dates.filter((d) => (coverage.get(d) ?? 0) === 0);
  const avgCoverage = dates.length
    ? Math.round((dates.reduce((a, d) => a + (coverage.get(d) ?? 0), 0) / dates.length) * 10) / 10
    : 0;
  const noveltyTotal = zoneShifts.filter((s) => isRestCode(s.code) && specialMeta(s.code)?.code !== "DESC").length;
  const sinMalla = zoneShifts.length === 0;

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return zoneDrivers.filter((d) => !q || d.name.toLowerCase().includes(q) || d.id.includes(q));
  }, [zoneDrivers, query]);

  return (
    <div>
      {/* ================= HERO ================= */}
      <section className={cn("ed-hero", ready && "ed-ready")} aria-labelledby="analitica-title">
        <div className="min-w-0">
          <div className="ed-rise flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <p className="ed-eyebrow">Analítica por zona · {month.label}</p>
            <label className="text-sm">
              <span className="sr-only">Zona</span>
              <Select value={zoneId} onChange={(e) => { setZoneId(e.target.value); setSelectedDriverId(null); }} className="h-10 w-auto max-w-full font-bold">
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </Select>
            </label>
          </div>

          <h2 className="ed-figure" id="analitica-title">
            <span className="sr-only">
              {num(avgCoverage)} de {zoneDrivers.length} repartidores en turno por día, en promedio
            </span>
            <span className="ed-figure-num" aria-hidden>{num(avgCoverage)}</span>
            <span className="ed-figure-cap ed-rise" style={cssVars({ "--i": 3 })} aria-hidden>
              de {zoneDrivers.length} {plural(zoneDrivers.length, "repartidor", "repartidores")}<b>en turno por día</b>
            </span>
          </h2>

          <p className="ed-lead ed-rise" style={cssVars({ "--i": 4 })}>
            {sinMalla ? (
              `Aún no hay malla cargada para ${month.label}.`
            ) : gapDates.length === 0 ? (
              "Todos los días del mes tienen al menos un repartidor."
            ) : (
              <em>
                {gapDates.length} {plural(gapDates.length, "día queda", "días quedan")} sin cobertura:{" "}
                {gapDates.slice(0, 4).map((d) => parseISO(d).getDate()).join(", ")}
                {gapDates.length > 4 && "…"}
              </em>
            )}
          </p>

          <dl className="ed-facts ed-rise" style={cssVars({ "--i": 5 })}>
            <div><dt className="ed-eyebrow">Repartidores</dt><dd>{zoneDrivers.length}<small className="ml-2 text-xs font-normal text-muted">{activeCount} activos</small></dd></div>
            <div><dt className="ed-eyebrow">Puntos de venta</dt><dd>{zonePos}</dd></div>
            <div><dt className="ed-eyebrow">Horas programadas</dt><dd>{num(totalHours(zoneShifts))}</dd></div>
            <div><dt className="ed-eyebrow">Días con novedad</dt><dd>{noveltyTotal}</dd></div>
          </dl>
        </div>

        <aside className="ed-rise min-w-0 self-end" style={cssVars({ "--i": 2 })} aria-labelledby="analitica-cobertura">
          <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3.5">
            <h3 id="analitica-cobertura" className="ed-serif text-[1.375rem] leading-tight text-ink">Cobertura diaria</h3>
            <p className="ed-eyebrow">Repartidores por día</p>
          </div>
          <DailyBars dates={dates} counts={coverage} />
        </aside>
      </section>

      {/* ================= MEZCLA DEL MES ================= */}
      <section className="pb-12 lg:px-[2.5vw]" aria-label="Turnos y novedades de la zona">
        <div className="ed-bento ed-ready lg:!grid-cols-2">
          <Reveal as="article" className="ed-cell" onPointerMove={spotlight}>
            <p className="ed-eyebrow">Turnos trabajados</p>
            <h3 className="ed-serif mb-5 mt-2 text-[1.375rem] leading-tight">¿En qué franja se trabaja?</h3>
            <KindDistribution shifts={zoneShifts} label="Turnos de la zona por franja" />
          </Reveal>
          <Reveal as="article" index={1} className="ed-cell" onPointerMove={spotlight}>
            <p className="ed-eyebrow">Novedades del mes · días</p>
            <h3 className="ed-serif mb-6 mt-2 text-[1.375rem] leading-tight">¿Por qué no se trabajó?</h3>
            <NoveltyFigures shifts={zoneShifts} />
          </Reveal>
        </div>
      </section>

      {/* ================= REPARTIDORES ================= */}
      <section className="pb-10 lg:px-[2.5vw]" aria-labelledby="analitica-repartidores">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-4">
          <div>
            <p className="ed-eyebrow">
              {filteredDrivers.length} de {zoneDrivers.length} · elige uno para ver su mes
            </p>
            <h3 id="analitica-repartidores" className="ed-serif mt-1.5 text-2xl text-ink">Repartidores de la zona</h3>
          </div>
          <label className="relative block w-full max-w-xs text-sm">
            <span className="sr-only">Buscar repartidor</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o cédula…" className="pl-9" />
          </label>
        </div>

        <div className="border border-line bg-surface">
          {filteredDrivers.map((d) => {
            const ds = shiftsByDriver.get(d.id) ?? [];
            const nov = noveltyCounts(ds);
            const open = d.id === selectedDriverId;
            return (
              <Fragment key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDriverId(open ? null : d.id)}
                  aria-expanded={open}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,1fr)_1.25rem] items-center gap-x-6 gap-y-2 border-b border-line-soft px-4 py-3.5 text-left last:border-0 sm:grid-cols-[minmax(0,1fr)_14rem_1.25rem] sm:px-6",
                    open ? "bg-paper" : "hover:bg-paper",
                  )}
                >
                  <span className="col-start-1 row-start-1 min-w-0">
                    <span className="block truncate font-bold text-ink">{d.name}</span>
                    <span className="block text-sm text-muted">
                      {workedDays(ds)} laborados · {restDays(ds)} descansos
                      {nov.VACAC ? ` · ${nov.VACAC} vacaciones` : ""}
                      {nov.INC ? ` · ${nov.INC} incapacidad` : ""}
                    </span>
                  </span>
                  <span className="col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                    <HoursBar hours={totalHours(ds)} cap={d.monthlyHourCap} />
                  </span>
                  <ChevronDown size={18} className={cn("col-start-2 row-start-1 shrink-0 text-muted transition-transform sm:col-start-3", open && "rotate-180")} aria-hidden />
                </button>
                {open && (
                  <DriverDetail
                    driver={d}
                    shifts={[...ds].sort((a, b) => a.date.localeCompare(b.date))}
                    onClose={() => setSelectedDriverId(null)}
                  />
                )}
              </Fragment>
            );
          })}
          {filteredDrivers.length === 0 && (
            <p className="px-4 py-12 text-center text-muted">
              {zoneDrivers.length === 0 ? "Esta zona no tiene repartidores." : "Ningún repartidor coincide con la búsqueda."}{" "}
              {query && (
                <button type="button" className="font-bold text-ink underline" onClick={() => setQuery("")}>Limpiar búsqueda</button>
              )}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
