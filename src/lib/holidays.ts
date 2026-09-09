/**
 * Feriados (festivos) para demarcar en la malla.
 *
 * Colombia 2026 — se agregan a medida que se planifican los meses.
 * Formato: fecha ISO `YYYY-MM-DD` → nombre del festivo.
 */
export const HOLIDAYS: Record<string, string> = {
  "2026-07-20": "Día de la Independencia",
  "2026-10-12": "Día de la Raza", // lunes (Ley Emiliani)
  "2026-11-02": "Día de Todos los Santos", // trasladado (Ley Emiliani)
  "2026-11-16": "Independencia de Cartagena", // trasladado (Ley Emiliani)
  "2026-12-08": "Inmaculada Concepción",
  "2026-12-25": "Navidad",
};

export function isHoliday(isoDate: string): boolean {
  return isoDate in HOLIDAYS;
}

export function holidayName(isoDate: string): string | undefined {
  return HOLIDAYS[isoDate];
}
