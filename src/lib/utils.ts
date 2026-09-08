import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formatea un número de horas en formato "24h". */
export function formatHour(hour: number | null): string {
  if (hour === null) return "—";
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Convierte texto a un slug en mayúsculas apto para IDs, con prefijo. */
export function slugify(text: string, prefix: string): string {
  const base = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${base}`.slice(0, 60);
}
