import type { Shift, ShiftKind } from "@/types";
import { shiftKind, isRestCode, specialMeta, SPECIAL_CODE_LIST } from "@/lib/shift-catalog";

/** Distribución de turnos trabajados por franja (excluye novedades). */
export function kindDistribution(shifts: Shift[]): Record<ShiftKind, number> {
  const d: Record<ShiftKind, number> = { MORNING: 0, MID: 0, AFTERNOON: 0, NIGHT: 0, REST: 0 };
  for (const s of shifts) {
    if (isRestCode(s.code)) continue;
    d[shiftKind(s)]++;
  }
  return d;
}

/** Conteo de novedades por código especial. */
export function noveltyCounts(shifts: Shift[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const code of SPECIAL_CODE_LIST) r[code] = 0;
  for (const s of shifts) {
    const m = specialMeta(s.code);
    if (m) r[m.code] = (r[m.code] ?? 0) + 1;
  }
  return r;
}

/** Repartidores trabajando por día (código no-descanso). */
export function dailyWorking(shifts: Shift[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of shifts) {
    if (!isRestCode(s.code)) m.set(s.date, (m.get(s.date) ?? 0) + 1);
  }
  return m;
}

/** Suma de horas de un conjunto de turnos limitado a las fechas dadas. */
export function hoursInDates(shifts: Shift[], dateSet: Set<string>): number {
  let h = 0;
  for (const s of shifts) if (dateSet.has(s.date)) h += s.hours || 0;
  return Math.round(h * 10) / 10;
}

export const KIND_LABEL: Record<ShiftKind, string> = {
  MORNING: "Mañana",
  MID: "Mediodía",
  AFTERNOON: "Tarde",
  NIGHT: "Noche",
  REST: "Descanso",
};

/** Color sólido por franja (para barras/celdas de analítica). */
export const KIND_COLOR: Record<ShiftKind, string> = {
  MORNING: "#0ea5e9",
  MID: "#8b5cf6",
  AFTERNOON: "#f59e0b",
  NIGHT: "#6366f1",
  REST: "#cbd5e1",
};
