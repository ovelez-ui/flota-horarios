"use client";

import { Fragment, useMemo, useState, useRef, useEffect } from "react";
import { AlertTriangle, XCircle, CheckCircle2, Paintbrush, MousePointer2, ChevronDown, ChevronRight, Copy, Plus, Building2, Check, Undo2, Eraser, ArrowRightLeft, Search, X } from "lucide-react";
import type { Driver, RuleViolation, Shift, ShiftKind } from "@/types";
import { REST_CODE } from "@/types";
import { Badge, Button, Field, Input, Modal, Select } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { MONTHS } from "@/lib/month";
import { MonthSwitcher } from "./MonthSwitcher";
import {
  shiftKind,
  isRestCode,
  specialMeta,
  codeLabel,
  shiftCodeOptions,
  SPECIAL_CODE_LIST,
  SPECIAL_CODES,
} from "@/lib/shift-catalog";
import { datesOfMonth, parseISO, isWeekend, weekdayName, shortLabel, toISO } from "@/lib/date-utils";
import { sundayCompensationAlerts } from "@/lib/shift-rules";
import { isHoliday, holidayName } from "@/lib/holidays";
import { cn } from "@/lib/utils";

const WEEKDAY_LETTER = ["D", "L", "M", "X", "J", "V", "S"]; // getDay(): 0=Dom

const KIND_BG: Record<ShiftKind, string> = {
  MORNING: "bg-sky-100 text-sky-800",
  MID: "bg-violet-100 text-violet-800",
  AFTERNOON: "bg-amber-100 text-amber-800",
  NIGHT: "bg-indigo-100 text-indigo-800",
  REST: "bg-slate-50 text-slate-300",
};

/** Clase de color de una celda según su turno/novedad. */
function cellClass(shift: Shift | undefined): string {
  if (!shift) return "";
  return specialMeta(shift.code)?.cell ?? KIND_BG[shiftKind(shift)];
}

/** Etiqueta de una celda: código inicio-fin del turno, o abreviatura de novedad. */
function cellLabel(shift: Shift): string {
  const special = specialMeta(shift.code);
  if (special) return special.abbr;
  return shift.code; // ej. "08-15" (hora inicio - hora fin)
}

// Ancho mínimo de columna de día: suficiente para "08-15" (compacto para que quepa el mes).
const COL_MIN = 34;
// Ancho fijo de la primera columna (nombre del repartidor / tienda).
const NAME_COL = 240;
// Valor de pincel especial para borrar (vaciar) una celda.
const ERASE = "__ERASE__";

interface EditState {
  driver: Driver;
  date: string;
  code: string;
  /** Tienda que cubre ese día (por defecto la base del repartidor). */
  posId: string;
  /** Nota libre del día (supernumerario, etc.). */
  note: string;
}

/**
 * Malla mensual tipo Gantt. `readOnly` desactiva la edición (vista tiendas).
 * `monthSwitcher` se apaga cuando la página que la aloja ya ofrece el selector de mes.
 */
export function ScheduleCalendar({ readOnly = false, monthSwitcher = true }: { readOnly?: boolean; monthSwitcher?: boolean }) {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const preview = useFleetStore((s) => s.preview);
  const assign = useFleetStore((s) => s.assign);
  const paint = useFleetStore((s) => s.paint);
  const paintUndo = useFleetStore((s) => s.paintUndo);
  const undoPaint = useFleetStore((s) => s.undoPaint);
  const clearCell = useFleetStore((s) => s.clearCell);
  const rules = useFleetStore((s) => s.rules);
  const month = useFleetStore((s) => s.month);
  const copyPreviousMonth = useFleetStore((s) => s.copyPreviousMonth);
  const addShiftCode = useFleetStore((s) => s.addShiftCode);
  const customShiftCodes = useFleetStore((s) => s.customShiftCodes);

  // Mes anterior planificable (para "copiar como plantilla").
  const prevMonth = useMemo(() => {
    const i = MONTHS.findIndex((m) => m.prefix === month.prefix);
    return i > 0 ? MONTHS[i - 1] : undefined;
  }, [month]);

  const dates = useMemo(() => datesOfMonth(month.year, month.monthIndex), [month]);

  // Agrupa el mes en semanas (lunes a domingo) para navegar por secciones.
  const weeks = useMemo(() => {
    const groups: string[][] = [];
    for (const d of dates) {
      if (groups.length === 0 || parseISO(d).getDay() === 1) groups.push([]);
      groups[groups.length - 1]!.push(d);
    }
    return groups.map((g, i) => ({
      label: `Sem ${i + 1}`,
      range: `${parseISO(g[0]!).getDate()}–${parseISO(g[g.length - 1]!).getDate()}`,
      dates: g,
    }));
  }, [dates]);

  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [posIds, setPosIds] = useState<string[]>([]); // vacío = todas las tiendas
  const [driverQuery, setDriverQuery] = useState(""); // búsqueda de repartidor
  const [zoneQuery, setZoneQuery] = useState(""); // búsqueda dentro del selector de zona
  const [posQuery, setPosQuery] = useState(""); // búsqueda dentro del selector de tiendas
  const zoneDetails = useRef<HTMLDetailsElement>(null);
  const [showComp, setShowComp] = useState(false); // detalle de compensatorios pendientes
  const [view, setView] = useState<number | "all">(0); // índice de semana o "all"
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Copiar mes anterior como plantilla.
  const [copyOpen, setCopyOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  async function runCopy() {
    setCopying(true);
    setCopyMsg(null);
    const r = await copyPreviousMonth();
    setCopying(false);
    setCopyOpen(false);
    if (r.ok) {
      setCopyMsg(
        `Se copiaron ${r.count ?? 0} turno(s) de ${prevMonth?.label ?? "el mes anterior"}` +
          (r.skipped ? ` · ${r.skipped} omitido(s) por ya existir o no tener día equivalente.` : "."),
      );
    } else {
      setCopyMsg(r.error ?? "No se pudo copiar el mes.");
    }
  }

  // Modo pintar: pincel activo (código) y arrastre.
  const [brush, setBrush] = useState<string | null>(null);
  const [paintMsg, setPaintMsg] = useState<string | null>(null);
  const [undoMsg, setUndoMsg] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);
  const painting = useRef(false);

  // Paso atrás: revierte la última marcación (pincel o editor).
  async function handleUndo() {
    if (readOnly || undoing || paintUndo.length === 0) return;
    setUndoing(true);
    setPaintMsg(null);
    const r = await undoPaint();
    setUndoing(false);
    if (r.ok) {
      setUndoMsg(`Se deshizo ${r.label ?? "la última marcación"}${r.empty ? " (celda vaciada)" : ""}.`);
    } else {
      setUndoMsg(null);
      setPaintMsg(r.error ?? "No se pudo deshacer.");
    }
  }

  // Atajo Ctrl+Z / Cmd+Z (ignora cuando se escribe en un campo).
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey && !typing) {
        e.preventDefault();
        void handleUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, undoing, paintUndo.length]);

  // Crear un turno nuevo al vuelo desde la paleta.
  const [newCode, setNewCode] = useState("");
  const [newCodeErr, setNewCodeErr] = useState<string | null>(null);
  function addBrush() {
    const r = addShiftCode(newCode);
    if (r.ok && r.code) {
      setBrush(r.code);
      setNewCode("");
      setNewCodeErr(null);
    } else {
      setNewCodeErr(r.error ?? "Código inválido. Ej: 09-18, 07-16*, 22-06, 13:40-21.");
    }
  }

  useEffect(() => {
    const stop = () => (painting.current = false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  async function applyBrush(driver: Driver, date: string) {
    if (readOnly || !brush) return;
    if (brush === ERASE) {
      const r = await clearCell({ driverId: driver.id, date });
      if (!r.ok) setPaintMsg(`${driver.name} · ${shortLabel(date)}: ${r.error ?? "no se pudo vaciar"}`);
      return;
    }
    const r = await paint({
      driverId: driver.id,
      date,
      weekday: weekdayName(date),
      code: brush,
      zoneId: driver.zoneId,
      pointOfSaleId: driver.basePointOfSaleId,
    });
    if (!r.ok) {
      const v = r.violations.find((x) => x.severity === "error");
      setPaintMsg(`${driver.name} · ${shortLabel(date)}: ${v?.message ?? r.error ?? "bloqueado"}`);
    }
  }

  function onCellDown(driver: Driver, date: string, shift: Shift | undefined) {
    if (readOnly) return;
    if (brush) {
      setPaintMsg(null);
      setUndoMsg(null);
      painting.current = true;
      void applyBrush(driver, date);
    } else {
      openEdit(driver, date, shift);
    }
  }

  const visibleDates = view === "all" ? dates : (weeks[view]?.dates ?? dates);
  const codes = useMemo(() => shiftCodeOptions(shifts, customShiftCodes), [shifts, customShiftCodes]);

  // Puntos de venta de la zona seleccionada (para el filtro).
  const zonePos = useMemo(
    () => pointsOfSale.filter((p) => p.zoneId === zoneId),
    [pointsOfSale, zoneId],
  );

  // Nombre de punto de venta por id (para etiquetas y grupos).
  const posNameById = useMemo(() => new Map(pointsOfSale.map((p) => [p.id, p.name])), [pointsOfSale]);

  const zoneDrivers = useMemo(
    () =>
      drivers.filter(
        (d) => d.zoneId === zoneId && (posIds.length === 0 || posIds.includes(d.basePointOfSaleId)),
      ),
    [drivers, zoneId, posIds],
  );

  // Repartidores visibles tras la búsqueda (solo oculta filas; la cobertura
  // sigue calculándose sobre toda la zona con `zoneDrivers`).
  const visibleDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    if (!q) return zoneDrivers;
    return zoneDrivers.filter((d) => `${d.name} ${d.id}`.toLowerCase().includes(q));
  }, [zoneDrivers, driverQuery]);

  // Repartidores agrupados por tienda (punto de venta base), en el orden de la zona.
  const groups = useMemo(() => {
    const byPos = new Map<string, Driver[]>();
    for (const d of visibleDrivers) {
      const arr = byPos.get(d.basePointOfSaleId) ?? [];
      arr.push(d);
      byPos.set(d.basePointOfSaleId, arr);
    }
    const out: { id: string; name: string; drivers: Driver[] }[] = [];
    for (const p of zonePos) {
      const ds = byPos.get(p.id);
      if (ds && ds.length) { out.push({ id: p.id, name: p.name, drivers: ds }); byPos.delete(p.id); }
    }
    for (const [pid, ds] of byPos) out.push({ id: pid, name: posNameById.get(pid) ?? "Sin punto de venta", drivers: ds });
    return out;
  }, [visibleDrivers, zonePos, posNameById]);

  // Alerta: domingos trabajados en la zona sin compensatorio dentro de la ventana.
  // Se agrupa por repartidor para no saturar la malla.
  const compAlert = useMemo(() => {
    const ids = new Set(zoneDrivers.map((d) => d.id));
    const nameById = new Map(zoneDrivers.map((d) => [d.id, d.name]));
    const pending = sundayCompensationAlerts(shifts.filter((s) => ids.has(s.driverId)), rules)
      .filter((a) => !a.compensated);

    const groups = new Map<string, { name: string; items: { sundayDate: string; dueBy: string }[] }>();
    for (const a of pending) {
      const g = groups.get(a.driverId) ?? { name: nameById.get(a.driverId) ?? a.driverId, items: [] };
      g.items.push({ sundayDate: a.sundayDate, dueBy: a.dueBy });
      groups.set(a.driverId, g);
    }
    const byDriver = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { total: pending.length, drivers: byDriver };
  }, [shifts, zoneDrivers, rules]);

  // driverId -> (date -> shift)
  const byDriver = useMemo(() => {
    const ids = new Set(zoneDrivers.map((d) => d.id));
    const map = new Map<string, Map<string, Shift>>();
    for (const s of shifts) {
      if (!ids.has(s.driverId)) continue;
      const m = map.get(s.driverId) ?? new Map<string, Shift>();
      m.set(s.date, s);
      map.set(s.driverId, m);
    }
    return map;
  }, [shifts, zoneDrivers]);

  const coverage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of zoneDrivers) {
      const m = byDriver.get(d.id);
      if (!m) continue;
      for (const [date, s] of m) {
        if (!isRestCode(s.code)) counts.set(date, (counts.get(date) ?? 0) + 1);
      }
    }
    return counts;
  }, [byDriver, zoneDrivers]);

  // Días del mes en los que nadie de la zona (y tiendas filtradas) está en turno.
  const gapDays = zoneDrivers.length === 0 ? 0 : dates.filter((d) => (coverage.get(d) ?? 0) === 0).length;
  const todayISO = toISO(new Date());

  // Pinceles agrupados por franja horaria (las novedades caen en su propio grupo).
  const brushGroups = useMemo(() => {
    const byKind: Record<ShiftKind, string[]> = { MORNING: [], MID: [], AFTERNOON: [], NIGHT: [], REST: [] };
    for (const c of codes) byKind[shiftKind({ code: c })].push(c);
    return [
      { label: "Mañana", codes: byKind.MORNING },
      { label: "Mediodía", codes: byKind.MID },
      { label: "Tarde", codes: byKind.AFTERNOON },
      { label: "Noche", codes: byKind.NIGHT },
      { label: "Novedades", codes: byKind.REST },
    ].filter((g) => g.codes.length > 0);
  }, [codes]);

  function openEdit(driver: Driver, date: string, shift: Shift | undefined) {
    if (readOnly) return;
    setServerError(null);
    setEdit({
      driver,
      date,
      code: shift ? shift.code : REST_CODE,
      posId: shift?.pointOfSaleId ?? driver.basePointOfSaleId,
      note: shift?.note ?? "",
    });
  }

  // Validación local en vivo del turno en edición.
  const previewResult = useMemo(() => {
    if (!edit) return null;
    return preview({
      driverId: edit.driver.id,
      date: edit.date,
      weekday: weekdayName(edit.date),
      code: edit.code,
      zoneId: edit.driver.zoneId,
      // Valida contra la tienda que cubrirá ese día (su horario de apertura/cierre).
      pointOfSaleId: edit.posId || edit.driver.basePointOfSaleId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit?.driver.id, edit?.date, edit?.code, edit?.posId, shifts]);

  async function save() {
    if (!edit) return;
    setSaving(true);
    setServerError(null);
    const pos = pointsOfSale.find((p) => p.id === edit.posId);
    const r = await assign({
      driverId: edit.driver.id,
      date: edit.date,
      weekday: weekdayName(edit.date),
      code: edit.code,
      // La tienda cubierta ese día (puede ser otra si es supernumerario).
      zoneId: pos?.zoneId ?? edit.driver.zoneId,
      pointOfSaleId: edit.posId || edit.driver.basePointOfSaleId,
      note: edit.note,
    });
    setSaving(false);
    if (r.ok) setEdit(null);
    else setServerError(r.error ?? "El servidor rechazó la asignación.");
  }

  // Vaciar la celda en edición (volver a blanco).
  async function clearFromEditor() {
    if (!edit) return;
    setSaving(true);
    setServerError(null);
    const r = await clearCell({ driverId: edit.driver.id, date: edit.date });
    setSaving(false);
    if (r.ok) setEdit(null);
    else setServerError(r.error ?? "No se pudo vaciar la celda.");
  }

  return (
    <div className="pb-10 lg:px-[2.5vw]">
      {/* ================= ENCABEZADO ================= */}
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 pb-6 pt-2">
        <div className="min-w-0">
          <p className="ed-eyebrow">Planificación · {zones.find((z) => z.id === zoneId)?.name ?? "Sin zona"}</p>
          <h2 className="ed-serif mt-2 text-[clamp(2rem,4vw,3.25rem)] leading-none tracking-tight text-ink">
            Malla de <em className="font-light">{month.label.replace(" 2026", "").toLowerCase()}</em>
          </h2>
          <dl className="mt-5 flex flex-wrap gap-x-9 gap-y-3">
            <div><dt className="ed-eyebrow">Repartidores</dt><dd className="ed-num mt-1 text-xl font-medium text-ink">{zoneDrivers.length}</dd></div>
            <div><dt className="ed-eyebrow">Tiendas</dt><dd className="ed-num mt-1 text-xl font-medium text-ink">{groups.length}</dd></div>
            <div>
              <dt className="ed-eyebrow">Días sin cobertura</dt>
              <dd className={cn("ed-num mt-1 text-xl font-medium", gapDays > 0 ? "text-signal" : "text-ink")}>{gapDays}</dd>
            </div>
            <div>
              <dt className="ed-eyebrow">Compensatorios pendientes</dt>
              <dd className={cn("ed-num mt-1 text-xl font-medium", compAlert.total > 0 ? "text-signal" : "text-ink")}>{compAlert.total}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {monthSwitcher && <MonthSwitcher />}
          {/* Selector de Zona buscable */}
          <div className="text-sm">
            <span className="ed-eyebrow mb-1.5 block">Zona</span>
            <details ref={zoneDetails} className="relative" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setZoneQuery(""); }}>
              <summary className="flex h-10 w-auto min-w-[12rem] max-w-[16rem] cursor-pointer list-none items-center gap-2 rounded border border-slate-300 bg-surface px-3 text-sm font-bold text-ink hover:border-ink [&::-webkit-details-marker]:hidden">
                <span className="truncate">{zones.find((z) => z.id === zoneId)?.name ?? "Zona"}</span>
                <ChevronDown size={14} className="ml-auto text-muted" aria-hidden />
              </summary>
              <div className="absolute left-0 z-30 mt-1 max-h-72 w-72 overflow-auto border border-line bg-surface p-1.5 shadow-pop">
                <div className="relative mb-1">
                  <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    autoFocus
                    value={zoneQuery}
                    onChange={(e) => setZoneQuery(e.target.value)}
                    placeholder="Buscar zona…"
                    className="h-9 w-full rounded border border-slate-300 bg-paper pl-7 pr-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                  />
                </div>
                {zones
                  .filter((z) => z.name.toLowerCase().includes(zoneQuery.trim().toLowerCase()))
                  .map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => { setZoneId(z.id); setPosIds([]); setZoneQuery(""); if (zoneDetails.current) zoneDetails.current.open = false; }}
                      className={cn("flex min-h-[36px] w-full items-center gap-2 px-2 text-left text-sm hover:bg-paper", z.id === zoneId ? "font-bold text-ink" : "text-ink")}
                    >
                      <span className={cn("grid h-4 w-4 shrink-0 place-items-center border", z.id === zoneId ? "border-ink bg-ink text-paper" : "border-slate-300")}>
                        {z.id === zoneId && <Check size={11} />}
                      </span>
                      <span className="truncate">{z.name}</span>
                    </button>
                  ))}
                {zones.filter((z) => z.name.toLowerCase().includes(zoneQuery.trim().toLowerCase())).length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted">Sin coincidencias.</p>
                )}
              </div>
            </details>
          </div>

          {/* Filtro multi-tienda (buscable) */}
          <div className="text-sm">
            <span className="ed-eyebrow mb-1.5 block">Tiendas</span>
            <details className="relative" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setPosQuery(""); }}>
              <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded border border-slate-300 bg-surface px-3 text-sm text-ink hover:border-ink [&::-webkit-details-marker]:hidden">
                <Building2 size={14} className="text-muted" aria-hidden />
                {posIds.length === 0
                  ? "Todas las tiendas"
                  : posIds.length === 1
                    ? (posNameById.get(posIds[0]!) ?? "1 tienda")
                    : `${posIds.length} tiendas`}
                <ChevronDown size={14} className="text-muted" aria-hidden />
              </summary>
              <div className="absolute right-0 z-30 mt-1 max-h-72 w-72 overflow-auto border border-line bg-surface p-1.5 shadow-pop">
                <div className="relative mb-1">
                  <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={posQuery}
                    onChange={(e) => setPosQuery(e.target.value)}
                    placeholder="Buscar tienda…"
                    className="h-9 w-full rounded border border-slate-300 bg-paper pl-7 pr-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPosIds([])}
                  className="flex min-h-[36px] w-full items-center gap-2 px-2 text-left text-sm font-bold text-ink hover:bg-paper"
                >
                  <span className={cn("grid h-4 w-4 shrink-0 place-items-center border", posIds.length === 0 ? "border-ink bg-ink text-paper" : "border-slate-300")}>
                    {posIds.length === 0 && <Check size={11} />}
                  </span>
                  Todas las tiendas
                </button>
                <div className="my-1 h-px bg-line-soft" />
                {zonePos
                  .filter((p) => p.name.toLowerCase().includes(posQuery.trim().toLowerCase()))
                  .map((p) => {
                  const on = posIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPosIds(on ? posIds.filter((x) => x !== p.id) : [...posIds, p.id])}
                      className="flex min-h-[36px] w-full items-center gap-2 px-2 text-left text-sm text-ink hover:bg-paper"
                    >
                      <span className={cn("grid h-4 w-4 shrink-0 place-items-center border", on ? "border-ink bg-ink text-paper" : "border-slate-300")}>
                        {on && <Check size={11} />}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
                {zonePos.length === 0 && <p className="px-2 py-1.5 text-xs text-muted">La zona no tiene puntos de venta.</p>}
                {zonePos.length > 0 && zonePos.filter((p) => p.name.toLowerCase().includes(posQuery.trim().toLowerCase())).length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted">Sin coincidencias.</p>
                )}
              </div>
            </details>
          </div>

          {/* Buscar repartidor */}
          <label className="text-sm">
            <span className="ed-eyebrow mb-1.5 block">Buscar repartidor</span>
            <span className="relative block w-56">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={driverQuery}
                onChange={(e) => setDriverQuery(e.target.value)}
                placeholder="Nombre o cédula…"
                className="h-10 w-full rounded border border-slate-300 bg-surface pl-8 pr-8 text-sm text-ink placeholder:text-muted hover:border-ink focus:border-ink focus:outline-none"
              />
              {driverQuery && (
                <button type="button" onClick={() => setDriverQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink" aria-label="Limpiar">
                  <X size={14} />
                </button>
              )}
            </span>
          </label>

          {!readOnly && prevMonth && (
            <Button
              variant="outline"
              onClick={() => { setCopyMsg(null); setCopyOpen(true); }}
              title={`Copiar los turnos de ${prevMonth.label} como plantilla`}
            >
              <Copy size={15} aria-hidden /> Copiar {prevMonth.label.replace(" 2026", "").toLowerCase()}
            </Button>
          )}
        </div>
      </header>

      {copyMsg && (
        <p role="status" className="mb-4 flex items-center gap-2 border border-line bg-surface p-3 text-sm text-ink">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" aria-hidden /> {copyMsg}
        </p>
      )}

      {/* Alerta de compensatorios: filete de señal, sin fondo de color. */}
      {compAlert.total > 0 && (
        <div className="mb-4 border border-l-4 border-line border-l-signal bg-surface">
          <button
            type="button"
            onClick={() => setShowComp((v) => !v)}
            aria-expanded={showComp}
            className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2 text-left"
          >
            <span className="flex flex-wrap items-center gap-x-2 text-sm font-bold text-ink">
              <AlertTriangle size={16} className="shrink-0 text-signal" aria-hidden />
              {compAlert.total} {compAlert.total === 1 ? "domingo trabajado" : "domingos trabajados"} sin compensatorio
              <span className="font-normal text-muted">
                · {compAlert.drivers.length} {compAlert.drivers.length === 1 ? "repartidor" : "repartidores"}
              </span>
            </span>
            <span className="ed-eyebrow flex shrink-0 items-center gap-1">
              {showComp ? "Ocultar" : "Ver detalle"}
              {showComp ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
            </span>
          </button>
          {showComp && (
            <div className="max-h-48 overflow-y-auto border-t border-line-soft px-4 py-3">
              <p className="mb-3 text-sm text-muted">
                {readOnly
                  ? "Domingos trabajados aún sin compensatorio programado."
                  : `Asigna un compensatorio (COMP) dentro de los ${rules.sundayCompensationDays} días siguientes al domingo.`}
              </p>
              <ul className="space-y-2">
                {compAlert.drivers.map((d) => (
                  <li key={d.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="min-w-[12rem] font-bold text-ink">{d.name}</span>
                    {d.items.map((it) => (
                      <span
                        key={it.sundayDate}
                        className="ed-chip is-out ed-num"
                        title={`Domingo ${shortLabel(it.sundayDate)} · compensar antes del ${shortLabel(it.dueBy)}`}
                      >
                        {shortLabel(it.sundayDate)}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ================= PINCELES ================= */}
      {!readOnly && (
        <div className="mb-5 overflow-hidden rounded-[18px] border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-2.5">
            <span className="ed-eyebrow mr-1">Modo</span>
            <button
              type="button"
              onClick={() => setBrush(null)}
              aria-pressed={brush === null}
              className={cn("ed-brush-tool", brush === null && "is-on")}
              title="Clic en una celda abre el editor con validación de reglas"
            >
              <MousePointer2 size={14} aria-hidden /> Detalle
            </button>
            <button
              type="button"
              onClick={() => setBrush(ERASE)}
              aria-pressed={brush === ERASE}
              className={cn("ed-brush-tool", brush === ERASE && "is-erase")}
              title="Pinta sobre las celdas para vaciarlas"
            >
              <Eraser size={14} aria-hidden /> Borrar
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={paintUndo.length === 0 || undoing}
              className="ed-brush-tool"
              title="Deshacer la última marcación (Ctrl+Z)"
            >
              <Undo2 size={14} aria-hidden /> {undoing ? "Deshaciendo…" : "Deshacer"}
              {paintUndo.length > 0 && <span className="ed-num text-muted">{paintUndo.length}</span>}
            </button>

            <span className="ml-auto flex items-center gap-2">
              <label className="sr-only" htmlFor="cal-new-code">Crear un turno nuevo</label>
              <input
                id="cal-new-code"
                value={newCode}
                onChange={(e) => { setNewCode(e.target.value); setNewCodeErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBrush(); } }}
                placeholder="Nuevo turno: 09-18"
                aria-invalid={newCodeErr ? true : undefined}
                className="ed-num h-9 w-44 rounded-full border border-slate-300 bg-paper px-4 text-xs text-ink placeholder:text-slate-400 focus:border-data focus:outline-none focus:ring-2 focus:ring-brand-600/30"
              />
              <button type="button" onClick={addBrush} disabled={!newCode.trim()} className="ed-brush-tool" title="Crear y usar este turno">
                <Plus size={14} aria-hidden /> Crear
              </button>
            </span>
          </div>

          {/* Pinceles agrupados por franja: se busca por horario, no en una lista plana. */}
          <div className="grid gap-x-8 gap-y-3 px-4 py-3 sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
            {brushGroups.map((g) => (
              <div key={g.label} role="group" aria-label={`Pinceles de ${g.label}`}>
                <p className="ed-eyebrow mb-1.5">{g.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.codes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrush(c)}
                      aria-pressed={brush === c}
                      className={cn("ed-brush", cellClass({ code: c } as Shift), brush === c && "is-on")}
                    >
                      {codeLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-line-soft px-4 py-2.5 text-sm" aria-live="polite">
            <p className="flex flex-wrap items-center gap-x-1.5 text-muted">
              <Paintbrush size={14} className="shrink-0" aria-hidden />
              {brush === ERASE ? (
                <>Borrando: <strong className="text-signal">vaciar celda</strong>. Haz clic o arrastra sobre la malla.</>
              ) : brush ? (
                <>Pintando <strong className="ed-num text-ink">{codeLabel(brush)}</strong>. Haz clic o arrastra sobre la malla.</>
              ) : (
                <>Elige un pincel para asignar rápido, o haz clic en una celda para editarla con detalle.</>
              )}
            </p>
            {newCodeErr && <p className="mt-1 font-bold text-signal">{newCodeErr}</p>}
            {paintMsg && <p className="mt-1 font-bold text-signal">No se aplicó — {paintMsg}</p>}
            {undoMsg && (
              <p className="mt-1 flex items-center gap-1.5 text-ink">
                <Undo2 size={13} aria-hidden /> {undoMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= SEMANAS ================= */}
      <nav className="ed-noscroll mb-0 flex gap-6 overflow-x-auto border-b border-line" aria-label="Semana visible">
        {weeks.map((w, i) => (
          <button
            key={w.label}
            type="button"
            onClick={() => setView(i)}
            aria-current={view === i ? "true" : undefined}
            className="ed-subtab"
            title={`${w.range} ${month.label}`}
          >
            {w.label} · {w.range}
          </button>
        ))}
        <button type="button" onClick={() => setView("all")} aria-current={view === "all" ? "true" : undefined} className="ed-subtab">
          Mes completo
        </button>
      </nav>

      {/* ================= MALLA ================= */}
      <div className="overflow-auto border border-t-0 border-line bg-surface">
        <table
          className="w-full table-fixed border-collapse text-xs"
          style={{ minWidth: NAME_COL + visibleDates.length * COL_MIN }}
        >
          <colgroup>
            <col style={{ width: NAME_COL }} />
            {visibleDates.map((d) => (
              <col key={d} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="ed-eyebrow sticky left-0 z-20 border-b border-r border-line bg-surface px-3 py-2 text-left font-medium">
                Repartidor
              </th>
              {visibleDates.map((d) => {
                const day = parseISO(d);
                const holiday = isHoliday(d);
                const today = d === todayISO;
                return (
                  <th
                    key={d}
                    scope="col"
                    className={cn(
                      "ed-num border-b border-line px-0 py-1.5 text-center font-medium",
                      today ? "bg-ink text-paper" : holiday ? "bg-amber-100 text-amber-800" : isWeekend(d) ? "bg-slate-100 text-ink" : "text-muted",
                    )}
                    style={{ minWidth: COL_MIN }}
                    title={[weekdayName(d), shortLabel(d), today && "hoy", holiday && `feriado: ${holidayName(d)}`].filter(Boolean).join(" · ")}
                    aria-current={today ? "date" : undefined}
                  >
                    <div className="text-[10px] leading-none">{holiday ? "★" : WEEKDAY_LETTER[day.getDay()]}</div>
                    <div className="mt-1 text-xs font-medium leading-none">{day.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.id}>
                <tr>
                  <th scope="rowgroup" className="sticky left-0 z-10 border-y border-r border-line bg-paper px-3 py-2 text-left">
                    <span className="ed-eyebrow flex items-start gap-1.5 !leading-tight !tracking-[0.08em] !text-ink">
                      <Building2 size={12} className="mt-px shrink-0 text-muted" aria-hidden />
                      <span title={g.name}>{g.name} <span className="text-muted">· {g.drivers.length}</span></span>
                    </span>
                  </th>
                  <td colSpan={visibleDates.length} className="border-y border-line bg-paper" />
                </tr>
                {g.drivers.map((driver) => {
                  const m = byDriver.get(driver.id);
                  return (
                    <tr key={driver.id}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-r border-line-soft bg-surface px-3 py-1.5 text-left font-normal"
                        title={`${driver.name} · C.C. ${driver.id}`}
                      >
                        <div className="font-bold leading-tight text-ink">{driver.name}</div>
                        <div className="ed-num text-[10px] leading-tight text-muted">C.C. {driver.id}</div>
                      </th>
                      {visibleDates.map((d) => {
                        const s = m?.get(d);
                        const special = s ? specialMeta(s.code) : undefined;
                        const altStore = !!(s && s.pointOfSaleId && s.pointOfSaleId !== driver.basePointOfSaleId);
                        const hasNote = !!(s && s.note);
                        const marked = altStore || hasNote;
                        const titleExtra = s
                          ? (altStore ? ` · cubre ${posNameById.get(s.pointOfSaleId!) ?? "otra tienda"}` : "") +
                            (hasNote ? ` · nota: ${s.note}` : "")
                          : "";
                        return (
                          <td
                            key={d}
                            onMouseDown={() => onCellDown(driver, d, s)}
                            onMouseEnter={() => {
                              if (painting.current && brush) void applyBrush(driver, d);
                            }}
                            className={cn(
                              "ed-num relative select-none border-b border-l border-line-soft px-0.5 text-center text-[10px] font-medium",
                              !readOnly && (brush ? "cursor-crosshair" : "cursor-pointer"),
                              !readOnly && "hover:ring-2 hover:ring-inset hover:ring-ink",
                              s ? cellClass(s) : d === todayISO ? "bg-slate-50" : "",
                              isHoliday(d) && "border-l-2 border-l-amber-300",
                              marked && "ring-1 ring-inset ring-ink",
                            )}
                            style={{ minWidth: COL_MIN, height: 30 }}
                            title={`${driver.name} · ${shortLabel(d)} · ${s ? (special ? special.label : `${s.code} (${s.hours} h)`) : "sin turno"}${titleExtra}`}
                          >
                            {marked && (
                              <span
                                aria-hidden
                                className={cn(
                                  "absolute right-0 top-0 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent",
                                  altStore ? "border-t-ink" : "border-t-amber-500",
                                )}
                              />
                            )}
                            {s ? cellLabel(s) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={visibleDates.length + 1} className="px-3 py-12 text-center text-sm text-muted">
                  {driverQuery.trim() ? (
                    <>Ningún repartidor coincide con “{driverQuery.trim()}”.{" "}
                      <button type="button" className="font-bold text-ink underline" onClick={() => setDriverQuery("")}>Limpiar búsqueda</button>
                    </>
                  ) : posIds.length ? (
                    <>No hay repartidores en las tiendas seleccionadas.{" "}
                      <button type="button" className="font-bold text-ink underline" onClick={() => setPosIds([])}>Ver todas las tiendas</button>
                    </>
                  ) : (
                    "La zona no tiene repartidores."
                  )}
                </td>
              </tr>
            )}
          </tbody>
          {zoneDrivers.length > 0 && (
            <tfoot>
              <tr>
                <th scope="row" className="ed-eyebrow sticky left-0 z-10 border-r border-t border-line bg-paper px-3 py-2 text-left font-medium !text-ink">
                  En turno por día
                </th>
                {visibleDates.map((d) => {
                  const c = coverage.get(d) ?? 0;
                  return (
                    <td
                      key={d}
                      className={cn(
                        "ed-num border-l border-t border-line text-center text-xs",
                        c === 0 ? "bg-accent-soft font-bold text-signal" : "bg-paper text-ink",
                        isHoliday(d) && "border-l-2 border-l-amber-300",
                      )}
                      style={{ minWidth: COL_MIN, height: 30 }}
                      title={`${shortLabel(d)} · ${c === 0 ? "sin cobertura" : `${c} en turno`}`}
                    >
                      {c}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ================= LEYENDA ================= */}
      <div className="mt-5 grid gap-x-10 gap-y-4 text-[0.8125rem] text-muted sm:grid-cols-[auto_1fr_auto]">
        <div>
          <p className="ed-eyebrow mb-2">Franjas</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Legend className="bg-sky-100" label="Mañana" />
            <Legend className="bg-violet-100" label="Mediodía" />
            <Legend className="bg-amber-100" label="Tarde" />
            <Legend className="bg-indigo-100" label="Noche" />
          </div>
        </div>
        <div>
          <p className="ed-eyebrow mb-2">Novedades</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SPECIAL_CODE_LIST.map((c) => (
              <Legend key={c} className={SPECIAL_CODES[c]!.cell} label={`${SPECIAL_CODES[c]!.label} (${SPECIAL_CODES[c]!.abbr})`} />
            ))}
          </div>
        </div>
        <div>
          <p className="ed-eyebrow mb-2">Marcas</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5"><span className="text-amber-600" aria-hidden>★</span> Feriado</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 bg-ink" aria-hidden /> Hoy</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 bg-accent-soft ring-1 ring-inset ring-signal" aria-hidden /> Día sin cobertura</span>
            <span className="flex items-center gap-1.5">
              <span className="relative inline-block h-3 w-3 ring-1 ring-inset ring-ink" aria-hidden>
                <span className="absolute right-0 top-0 h-0 w-0 border-l-[6px] border-t-[6px] border-l-transparent border-t-ink" />
              </span>
              Cubre otra tienda o tiene nota
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={copyOpen}
        onClose={() => !copying && setCopyOpen(false)}
        title="Copiar mes como plantilla"
      >
        {prevMonth && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Se copiarán los turnos de <strong className="text-slate-900">{prevMonth.label}</strong> a los
              días equivalentes de <strong className="text-slate-900">{month.label}</strong> (mismo número de día).
            </p>
            <ul className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <li className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> No sobrescribe días que ya tengas asignados en {month.label}.</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> Los días que no existen en el mes destino (ej. 31) se omiten.</li>
              <li className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" /> La copia mantiene el número de día; luego ajusta según festivos y domingos del mes.</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCopyOpen(false)} disabled={copying}>Cancelar</Button>
              <Button onClick={runCopy} disabled={copying}>
                <Copy size={15} /> {copying ? "Copiando…" : `Copiar ${prevMonth.label.replace(" 2026", "")}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `Editar turno · ${edit.driver.name}` : "Editar turno"}
      >
        {edit && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {weekdayName(edit.date)} {shortLabel(edit.date)}
            </p>
            <Field label="Turno">
              <Select value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })}>
                {codes.map((c) => (
                  <option key={c} value={c}>{codeLabel(c)}</option>
                ))}
              </Select>
            </Field>

            {/* Supernumerario: tienda que cubre ese día (si va a otra) */}
            <Field label="Tienda que cubre ese día">
              <Select value={edit.posId} onChange={(e) => setEdit({ ...edit, posId: e.target.value })}>
                {[...pointsOfSale]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.id === edit.driver.basePointOfSaleId ? " (base)" : ""}
                    </option>
                  ))}
              </Select>
              {edit.posId !== edit.driver.basePointOfSaleId && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-brand-700">
                  <ArrowRightLeft size={12} /> Supernumerario: cubre otra tienda este día.
                </p>
              )}
            </Field>

            <Field label="Nota (opcional)">
              <Input
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                placeholder="Ej. Apoya Vegas Plaza por la tarde"
                maxLength={160}
              />
            </Field>

            {previewResult && previewResult.violations.length > 0 ? (
              <ul className="space-y-1.5 rounded-lg border border-slate-100 bg-white p-3">
                {previewResult.violations.map((v, i) => (
                  <ViolationRow key={`${v.code}-${i}`} v={v} />
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700">
                <CheckCircle2 size={16} /> Asignación válida.
              </p>
            )}

            {serverError && <p className="text-sm text-accent">{serverError}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={clearFromEditor}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                title="Vaciar la celda (volver a blanco)"
              >
                <Eraser size={15} /> Vaciar
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button onClick={save} disabled={saving || !previewResult?.ok}>
                  {saving ? "Guardando…" : previewResult?.ok ? "Guardar" : "Bloqueado por reglas"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ViolationRow({ v }: { v: RuleViolation }) {
  const isError = v.severity === "error";
  return (
    <li className="flex items-start gap-2 text-sm">
      {isError ? (
        <XCircle size={15} className="mt-0.5 shrink-0 text-accent" />
      ) : (
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
      )}
      <span className={isError ? "text-slate-700" : "text-slate-600"}>
        <Badge variant={isError ? "danger" : "warning"} className="mr-1.5">{v.code}</Badge>
        {v.message}
      </span>
    </li>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3", className)} aria-hidden /> {label}
    </span>
  );
}
