"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { CalendarDays, AlertTriangle, XCircle, CheckCircle2, Paintbrush, MousePointer2, ChevronDown, ChevronRight } from "lucide-react";
import type { Driver, RuleViolation, Shift, ShiftKind } from "@/types";
import { REST_CODE } from "@/types";
import { Badge, Button, Card, CardContent, Field, IconChip, Modal, Select } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
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
import { datesOfMonth, parseISO, isWeekend, weekdayName, shortLabel } from "@/lib/date-utils";
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
  if (!shift) return "bg-slate-50 text-slate-200";
  return specialMeta(shift.code)?.cell ?? KIND_BG[shiftKind(shift)];
}

/** Etiqueta de una celda: código inicio-fin del turno, o abreviatura de novedad. */
function cellLabel(shift: Shift): string {
  const special = specialMeta(shift.code);
  if (special) return special.abbr;
  return shift.code; // ej. "08-15" (hora inicio - hora fin)
}

// Ancho mínimo de columna: suficiente para "08-15" (compacto para que quepa el mes).
const COL_MIN = 40;

interface EditState {
  driver: Driver;
  date: string;
  code: string;
}

/** Malla mensual tipo Gantt. `readOnly` desactiva la edición (vista tiendas). */
export function ScheduleCalendar({ readOnly = false }: { readOnly?: boolean }) {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const preview = useFleetStore((s) => s.preview);
  const assign = useFleetStore((s) => s.assign);
  const paint = useFleetStore((s) => s.paint);
  const rules = useFleetStore((s) => s.rules);
  const month = useFleetStore((s) => s.month);
  const customShiftCodes = useFleetStore((s) => s.customShiftCodes);

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
  const [posId, setPosId] = useState<string>(""); // "" = todos los puntos de venta
  const [showComp, setShowComp] = useState(false); // detalle de compensatorios pendientes
  const [view, setView] = useState<number | "all">(0); // índice de semana o "all"
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Modo pintar: pincel activo (código) y arrastre.
  const [brush, setBrush] = useState<string | null>(null);
  const [paintMsg, setPaintMsg] = useState<string | null>(null);
  const painting = useRef(false);

  useEffect(() => {
    const stop = () => (painting.current = false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  async function applyBrush(driver: Driver, date: string) {
    if (readOnly || !brush) return;
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

  const zoneDrivers = useMemo(
    () =>
      drivers.filter(
        (d) => d.zoneId === zoneId && (posId === "" || d.basePointOfSaleId === posId),
      ),
    [drivers, zoneId, posId],
  );

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

  function openEdit(driver: Driver, date: string, shift: Shift | undefined) {
    if (readOnly) return;
    setServerError(null);
    setEdit({ driver, date, code: shift ? shift.code : REST_CODE });
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
      pointOfSaleId: edit.driver.basePointOfSaleId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit?.driver.id, edit?.date, edit?.code, shifts]);

  async function save() {
    if (!edit) return;
    setSaving(true);
    setServerError(null);
    const r = await assign({
      driverId: edit.driver.id,
      date: edit.date,
      weekday: weekdayName(edit.date),
      code: edit.code,
      zoneId: edit.driver.zoneId,
      pointOfSaleId: edit.driver.basePointOfSaleId,
    });
    setSaving(false);
    if (r.ok) setEdit(null);
    else setServerError(r.error ?? "El servidor rechazó la asignación.");
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <IconChip icon={<CalendarDays size={16} />} /> Malla mensual · {month.label}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <MonthSwitcher />
            <Select
              value={zoneId}
              onChange={(e) => { setZoneId(e.target.value); setPosId(""); }}
              className="h-9 w-auto"
              title="Filtrar por zona"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </Select>
            <Select
              value={posId}
              onChange={(e) => setPosId(e.target.value)}
              className="h-9 w-auto"
              title="Filtrar por punto de venta"
            >
              <option value="">Todos los puntos de venta</option>
              {zonePos.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {compAlert.total > 0 && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50">
            <button
              type="button"
              onClick={() => setShowComp((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            >
              <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-amber-800">
                <AlertTriangle size={16} className="shrink-0" />
                Compensatorios pendientes por domingo ({compAlert.total})
                <span className="font-normal text-amber-700/70">· {compAlert.drivers.length} repartidor(es)</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700">
                {showComp ? "Ocultar" : "Ver detalle"}
                {showComp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>
            {showComp && (
              <div className="max-h-44 overflow-y-auto border-t border-amber-200 px-3 py-2">
                <p className="mb-2 text-xs text-amber-700/80">
                  {readOnly
                    ? "Domingos trabajados aún sin compensatorio programado."
                    : `Asigna un compensatorio (COMP) dentro de los ${rules.sundayCompensationDays} días siguientes al domingo.`}
                </p>
                <ul className="space-y-1.5">
                  {compAlert.drivers.map((d) => (
                    <li key={d.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="min-w-[10rem] font-semibold text-amber-900">{d.name}</span>
                      {d.items.map((it) => (
                        <span
                          key={it.sundayDate}
                          className="inline-flex items-center rounded bg-white px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
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

        {!readOnly && (
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setBrush(null)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                  brush === null ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
                )}
                title="Modo detalle: clic abre el editor con validación"
              >
                <MousePointer2 size={13} /> Detalle
              </button>
              <span className="mx-1 flex items-center gap-1 text-xs text-slate-400">
                <Paintbrush size={13} /> Pincel:
              </span>
              {codes.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrush(c)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold",
                    cellClass({ code: c } as Shift),
                    brush === c ? "ring-2 ring-brand-500 ring-offset-1" : "",
                  )}
                >
                  {codeLabel(c)}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
              {brush ? (
                <>Pintando <strong className="mx-1 text-slate-600">{codeLabel(brush)}</strong> — clic o arrastra sobre las celdas.</>
              ) : (
                <>Elige un pincel para asignar rápido, o clic en una celda para editar con detalle.</>
              )}
            </p>
            {paintMsg && <p className="mt-1 text-[11px] text-accent">⛔ {paintMsg}</p>}
          </div>
        )}

        {/* Navegación por semanas (reduce el scroll horizontal) */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {weeks.map((w, i) => (
            <button
              key={w.label}
              onClick={() => setView(i)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                view === i ? "bg-brand-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
              title={`${w.range} ${month.label}`}
            >
              {w.label} <span className="opacity-70">· {w.range}</span>
            </button>
          ))}
          <button
            onClick={() => setView("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              view === "all" ? "bg-brand-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            Mes completo
          </button>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-500 sm:px-3">
                  Repartidor
                </th>
                {visibleDates.map((d) => {
                  const day = parseISO(d);
                  const wknd = isWeekend(d);
                  const holiday = isHoliday(d);
                  return (
                    <th
                      key={d}
                      className={cn(
                        "border-b px-0 py-1 text-center font-medium",
                        holiday
                          ? "border-amber-300 bg-amber-100 text-amber-800"
                          : wknd
                            ? "border-slate-200 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-slate-50 text-slate-500",
                      )}
                      style={{ minWidth: COL_MIN }}
                      title={holiday ? `Feriado · ${holidayName(d)}` : undefined}
                    >
                      <div className="leading-none">
                        {holiday ? "★" : WEEKDAY_LETTER[day.getDay()]}
                      </div>
                      <div className={cn("leading-none text-[10px]", holiday ? "text-amber-600" : "text-slate-400")}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {zoneDrivers.map((driver) => {
                const m = byDriver.get(driver.id);
                return (
                  <tr key={driver.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 max-w-[108px] truncate border-b border-r border-slate-100 bg-white px-2 py-1.5 font-medium text-slate-700 sm:max-w-[160px] sm:px-3" title={driver.name}>
                      {driver.name}
                    </td>
                    {visibleDates.map((d) => {
                      const s = m?.get(d);
                      const special = s ? specialMeta(s.code) : undefined;
                      const hol = isHoliday(d);
                      return (
                        <td
                          key={d}
                          onMouseDown={() => onCellDown(driver, d, s)}
                          onMouseEnter={() => {
                            if (painting.current && brush) void applyBrush(driver, d);
                          }}
                          className={cn(
                            "select-none border-b border-l border-slate-100 px-0.5 text-center text-[10px] font-semibold tabular-nums transition",
                            !readOnly && (brush ? "cursor-crosshair" : "cursor-pointer"),
                            !readOnly && "hover:ring-2 hover:ring-inset hover:ring-brand-400",
                            cellClass(s),
                            hol && "border-l-2 border-l-amber-300",
                          )}
                          style={{ minWidth: COL_MIN, height: 28 }}
                          title={s ? `${driver.name} · ${d} · ${special ? special.label : `${s.code} (${s.hours}h)`}` : d}
                        >
                          {s ? cellLabel(s) : ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {zoneDrivers.length === 0 && (
                <tr>
                  <td colSpan={visibleDates.length + 1} className="px-3 py-8 text-center text-slate-400">
                    {posId ? "No hay repartidores en ese punto de venta." : "La zona no tiene repartidores."}
                  </td>
                </tr>
              )}
            </tbody>
            {zoneDrivers.length > 0 && (
              <tfoot>
                <tr>
                  <td className="sticky left-0 z-10 border-r border-t border-slate-200 bg-slate-50 px-2 py-1.5 font-semibold text-slate-600 sm:px-3">
                    Cubiertos
                  </td>
                  {visibleDates.map((d) => {
                    const c = coverage.get(d) ?? 0;
                    return (
                      <td
                        key={d}
                        className={cn(
                          "border-l border-t border-slate-200 text-center font-semibold",
                          c === 0 ? "bg-accent-soft text-accent" : "bg-emerald-50 text-emerald-700",
                          isHoliday(d) && "border-l-2 border-l-amber-300",
                        )}
                        style={{ minWidth: COL_MIN, height: 26 }}
                        title={`${d}: ${c} repartidor(es)`}
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

        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-500">
          <Legend className="bg-sky-100" label="Mañana" />
          <Legend className="bg-violet-100" label="Mediodía" />
          <Legend className="bg-amber-100" label="Tarde" />
          <Legend className="bg-indigo-100" label="Noche" />
          {SPECIAL_CODE_LIST.map((c) => (
            <Legend key={c} className={SPECIAL_CODES[c]!.cell} label={`${SPECIAL_CODES[c]!.label} (${SPECIAL_CODES[c]!.abbr})`} />
          ))}
          <span className="flex items-center gap-1.5">
            <span className="text-amber-500">★</span> Feriado
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-accent" /> Día sin cobertura (0)
          </span>
        </div>
      </CardContent>

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

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !previewResult?.ok}>
                {saving ? "Guardando…" : previewResult?.ok ? "Guardar" : "Bloqueado por reglas"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
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
      <span className={cn("inline-block h-3 w-3 rounded-sm", className)} /> {label}
    </span>
  );
}
