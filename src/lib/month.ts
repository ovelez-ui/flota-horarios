/**
 * Mes de operación de la malla, como módulo ligero (sin importar el seed JSON),
 * apto para el cliente. Debe coincidir con el mes de los datos en el backend.
 */
export const MONTH = { year: 2026, monthIndex: 9, label: "Octubre 2026" } as const;

const mm = String(MONTH.monthIndex + 1).padStart(2, "0");

/** Prefijo ISO del mes vigente, ej. "2026-10". */
export const MONTH_PREFIX = `${MONTH.year}-${mm}`;

/** Rango ISO [primer día, último día] del mes vigente. */
export function monthBounds(): { from: string; to: string } {
  const last = new Date(MONTH.year, MONTH.monthIndex + 1, 0).getDate();
  return { from: `${MONTH_PREFIX}-01`, to: `${MONTH_PREFIX}-${String(last).padStart(2, "0")}` };
}
