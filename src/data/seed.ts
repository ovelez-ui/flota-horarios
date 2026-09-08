import type { Driver, PointOfSale, Shift, ShiftKind, Zone } from "@/types";
// `malla.seed.json` (datos reales con nombres/cédulas) NO se versiona: queda
// local y en Supabase. El repo usa un placeholder vacío para compilar; los
// datos reales llegan del backend (Supabase) en tiempo de ejecución.
import rawSeed from "./malla.seed.default.json";

/** Turno del seed: incluye `kind` precalculado por el generador (build_seed.py). */
export interface SeedShift extends Shift {
  kind: ShiftKind;
}

export interface FleetSeed {
  month: { year: number; monthIndex: number; label: string };
  zones: Zone[];
  pointsOfSale: PointOfSale[];
  drivers: Driver[];
  shifts: SeedShift[];
}

/**
 * Datos reales derivados de `malla_horaria.xlsx` (regenerables con
 * `python scripts/build_seed.py`). El cast es seguro porque el generador
 * produce exactamente esta forma.
 */
export const SEED = rawSeed as unknown as FleetSeed;

export const MONTH = SEED.month;
