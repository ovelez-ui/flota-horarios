import type { Shift, ShiftDefinition, ShiftKind } from "@/types";
import { REST_CODE } from "@/types";

/** Código de vacaciones de la malla real. */
export const VACATION_CODE = "VACAC" as const;

/**
 * Códigos especiales (novedades sin horas). Se tratan como descanso a efectos
 * de reglas y cobertura, pero se muestran con etiqueta y color propios.
 */
export interface SpecialCodeMeta {
  code: string;
  label: string;
  /** Abreviatura de una letra para la celda del calendario. */
  abbr: string;
  /** Clases de color de fondo/texto para la celda/chip. */
  cell: string;
}

export const SPECIAL_CODES: Record<string, SpecialCodeMeta> = {
  DESC: { code: "DESC", label: "Descanso", abbr: "·", cell: "bg-slate-100 text-slate-400" },
  VACAC: { code: "VACAC", label: "Vacaciones", abbr: "V", cell: "bg-emerald-100 text-emerald-700" },
  COMP: { code: "COMP", label: "Compensatorio", abbr: "C", cell: "bg-cyan-100 text-cyan-700" },
  INC: { code: "INC", label: "Incapacidad", abbr: "I", cell: "bg-rose-100 text-rose-700" },
  LIC: { code: "LIC", label: "Licencia", abbr: "L", cell: "bg-teal-100 text-teal-700" },
  FAM: { code: "FAM", label: "Día de la familia", abbr: "F", cell: "bg-fuchsia-100 text-fuchsia-700" },
};

/** Orden de aparición de las novedades en los selectores. */
export const SPECIAL_CODE_LIST = ["DESC", "VACAC", "COMP", "INC", "LIC", "FAM"] as const;

const SHIFT_RE = /^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?(\*)?$/;

function normalize(code: string): string {
  const c = code.trim().toUpperCase();
  return c === "DES" ? "DESC" : c;
}

export function specialMeta(code: string): SpecialCodeMeta | undefined {
  return SPECIAL_CODES[normalize(code)];
}

export function isRestCode(code: string): boolean {
  return normalize(code) in SPECIAL_CODES;
}

export function isVacationCode(code: string): boolean {
  return normalize(code) === VACATION_CODE;
}

/** Etiqueta legible: nombre de la novedad, o el propio código si es un turno. */
export function codeLabel(code: string): string {
  return specialMeta(code)?.label ?? code;
}

function classifyKind(start: number, crosses: boolean): ShiftKind {
  if (crosses || start >= 19) return "NIGHT";
  if (start < 10) return "MORNING";
  if (start < 14) return "MID";
  return "AFTERNOON";
}

/**
 * Resuelve un código de turno a su definición.
 * Soporta turnos ("08-15", "07-16*", "13:40-21", "23-06") y novedades
 * especiales ("DESC", "VACAC", "COMP", "INC", "FAM").
 */
export function parseShiftCode(code: string): ShiftDefinition {
  const special = specialMeta(code);
  if (special) {
    return { code: special.code, label: special.label, kind: "REST", start: null, end: null, hours: 0 };
  }

  const upper = code.trim().toUpperCase();
  const m = SHIFT_RE.exec(upper);
  if (!m) {
    throw new Error(`Código de turno inválido: "${code}"`);
  }
  const [, h1, m1, h2, m2, star] = m;
  const start = Number(h1) + (m1 ? Number(m1) / 60 : 0);
  let end = Number(h2) + (m2 ? Number(m2) / 60 : 0);
  const crosses = end <= start;
  if (crosses) end += 24;
  const span = end - start;
  const hours = Math.round((span - (star ? 1 : 0)) * 100) / 100;

  return {
    code: upper,
    label: star ? "Jornada 8h" : "Turno",
    kind: classifyKind(start, crosses),
    start,
    end,
    hours,
  };
}

/** Clasifica un turno ya materializado (usa su `code`). */
export function shiftKind(shift: Pick<Shift, "code">): ShiftKind {
  try {
    return parseShiftCode(shift.code).kind;
  } catch {
    return "REST";
  }
}

/** Códigos de trabajo distintos presentes en un conjunto de turnos, ordenados. */
export function distinctWorkCodes(shifts: Shift[]): string[] {
  const set = new Set<string>();
  for (const s of shifts) {
    if (!isRestCode(s.code)) set.add(s.code);
  }
  return [...set].sort((a, b) => {
    const sa = a.match(/^\d+/)?.[0] ?? "0";
    const sb = b.match(/^\d+/)?.[0] ?? "0";
    return Number(sa) - Number(sb) || a.localeCompare(b);
  });
}

/**
 * Lista de opciones para selectores de turno: turnos reales de la malla +
 * turnos personalizados (`extra`) + novedades.
 */
export function shiftCodeOptions(shifts: Shift[], extra: string[] = []): string[] {
  const work = new Set([...distinctWorkCodes(shifts), ...extra]);
  const sorted = [...work].sort((a, b) => {
    const sa = a.match(/^\d+/)?.[0] ?? "0";
    const sb = b.match(/^\d+/)?.[0] ?? "0";
    return Number(sa) - Number(sb) || a.localeCompare(b);
  });
  return [...sorted, ...SPECIAL_CODE_LIST];
}
