const WEEKDAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Devuelve el nombre del día de la semana en español para una fecha ISO. */
export function weekdayName(isoDate: string): string {
  const d = parseISO(isoDate);
  return WEEKDAYS_ES[d.getDay()]!;
}

/** true si la fecha ISO cae en fin de semana. */
export function isWeekend(isoDate: string): boolean {
  const day = parseISO(isoDate).getDay();
  return day === 0 || day === 6;
}

/** Parsea una fecha ISO `YYYY-MM-DD` como fecha local (sin desfase de zona). */
export function parseISO(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Formatea una fecha a ISO `YYYY-MM-DD`. */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Diferencia absoluta en días entre dos fechas ISO. */
export function daysBetween(a: string, b: string): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Genera las fechas ISO de un mes completo (1..N). */
export function datesOfMonth(year: number, monthIndexZeroBased: number): string[] {
  const result: string[] = [];
  const daysInMonth = new Date(year, monthIndexZeroBased + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    result.push(toISO(new Date(year, monthIndexZeroBased, day)));
  }
  return result;
}

/** Agrupa las fechas de un mes en semanas (lunes a domingo). */
export function monthWeeks(dates: string[]): { label: string; range: string; dates: string[] }[] {
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
}

/** Lista de fechas ISO inclusivas entre `from` y `to` (ordenadas). */
export function datesBetween(from: string, to: string): string[] {
  const start = parseISO(from <= to ? from : to);
  const end = parseISO(from <= to ? to : from);
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(toISO(d));
  }
  return out;
}

/** Etiqueta corta legible, ej. "07 sep". */
export function shortLabel(isoDate: string): string {
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const d = parseISO(isoDate);
  return `${String(d.getDate()).padStart(2, "0")} ${meses[d.getMonth()]}`;
}
