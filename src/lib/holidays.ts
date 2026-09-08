/**
 * Feriados (festivos) para demarcar en la malla.
 *
 * Colombia 2026 — se agregan a medida que se planifican los meses.
 * Formato: fecha ISO `YYYY-MM-DD` → nombre del festivo.
 */
export const HOLIDAYS: Record<string, string> = {
  "2026-07-20": "Día de la Independencia",
  "2026-10-12": "Día de la Raza", // lunes (Ley Emiliani)
};

export function isHoliday(isoDate: string): boolean {
  return isoDate in HOLIDAYS;
}

export function holidayName(isoDate: string): string | undefined {
  return HOLIDAYS[isoDate];
}
