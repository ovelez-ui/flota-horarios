/**
 * Meses de operación planificables. La malla puede trabajarse en cualquiera de
 * ellos; el mes "activo" determina qué turnos se cargan del backend y se muestran.
 */

export interface MonthDef {
  year: number;
  /** 0-11 (enero = 0). */
  monthIndex: number;
  label: string;
  /** Prefijo ISO del mes, ej. "2026-10". */
  prefix: string;
}

function make(year: number, monthIndex: number, label: string): MonthDef {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { year, monthIndex, label, prefix };
}

/** Meses habilitados para planificación. */
export const MONTHS: MonthDef[] = [
  make(2026, 9, "Octubre 2026"),
  make(2026, 10, "Noviembre 2026"),
  make(2026, 11, "Diciembre 2026"),
];

/** Mes por defecto (primero de la lista). */
export const DEFAULT_MONTH: MonthDef = MONTHS[0]!;

// --- Mes activo (estado de módulo, para consumidores no reactivos como el data-source) ---
let active: MonthDef = DEFAULT_MONTH;

export function getActiveMonth(): MonthDef {
  return active;
}

/** Fija el mes activo por su prefijo ISO. Devuelve el mes resultante. */
export function setActiveMonth(prefix: string): MonthDef {
  const m = MONTHS.find((x) => x.prefix === prefix);
  if (m) active = m;
  return active;
}

/** Rango ISO [primer día, último día] de un mes. */
export function boundsOf(m: MonthDef): { from: string; to: string } {
  const last = new Date(m.year, m.monthIndex + 1, 0).getDate();
  return { from: `${m.prefix}-01`, to: `${m.prefix}-${String(last).padStart(2, "0")}` };
}

/** Rango ISO del mes activo (lo usa el data-source al consultar turnos). */
export function monthBounds(): { from: string; to: string } {
  return boundsOf(active);
}
