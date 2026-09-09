/**
 * Modelo de dominio de la plataforma de horarios de flota.
 *
 * Convenciones:
 * - Las horas se representan como enteros 0..24 (formato 24h).
 * - Las fechas se representan como ISO `YYYY-MM-DD` (fecha local, sin zona horaria).
 * - El `id` de un `Driver` es su cédula (documento de identidad).
 */

// ---------------------------------------------------------------------------
// Zonas y Puntos de venta (bases)
// ---------------------------------------------------------------------------

export type ZoneId = string;
export type PointOfSaleId = string;
export type DriverId = string;

export interface Zone {
  id: ZoneId;
  /** Código corto, ej. "ZONA 1". */
  code: string;
  /** Nombre visible, ej. "ZONA 1 - SUR". */
  name: string;
  city: string;
  /** Color HEX para diferenciar la zona en la UI. */
  color: string;
}

/** Punto de venta / base operativa desde la que sale el repartidor. */
export interface PointOfSale {
  id: PointOfSaleId;
  /** Nombre visible, ej. "FARMACIA PASTEUR". */
  name: string;
  zoneId: ZoneId;
  address?: string;
  /** Mínimo de repartidores activos que debe cubrir cada franja horaria. */
  minDriversPerShift: number;
}

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------

export type ShiftKind = "MORNING" | "MID" | "AFTERNOON" | "NIGHT" | "REST";

/** Código especial que representa un día de descanso. */
export const REST_CODE = "DESC" as const;

/**
 * Definición de un turno del catálogo.
 * `start`/`end` son `null` únicamente para el descanso.
 */
export interface ShiftDefinition {
  /** Código operativo, ej. "6-13", "17-24", "15-22" o "DESC". */
  code: string;
  /** Etiqueta amigable, ej. "Apertura". */
  label: string;
  kind: ShiftKind;
  start: number | null;
  end: number | null;
  /** Duración en horas (0 para descanso). */
  hours: number;
}

/** Turno concreto asignado a un repartidor en una fecha específica. */
export interface Shift {
  id: string;
  driverId: DriverId;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** Nombre del día de la semana en español, ej. "Lunes". */
  weekday: string;
  /** Código del turno, ej. "6-13" o "DESC". */
  code: string;
  start: number | null;
  end: number | null;
  hours: number;
  /** Base/punto de venta cubierto (por defecto la base del repartidor). */
  pointOfSaleId?: PointOfSaleId;
  zoneId?: ZoneId;
}

// ---------------------------------------------------------------------------
// Repartidor
// ---------------------------------------------------------------------------

export type DriverStatus = "ACTIVE" | "VACATION" | "SICK_LEAVE" | "INACTIVE";

export interface Driver {
  /** Cédula del repartidor (identificador de negocio). */
  id: DriverId;
  name: string;
  basePointOfSaleId: PointOfSaleId;
  zoneId: ZoneId;
  status: DriverStatus;
  /** Tope de horas contratadas por mes. */
  monthlyHourCap: number;
  phone?: string;
}

// ---------------------------------------------------------------------------
// Vistas derivadas (composición para la UI)
// ---------------------------------------------------------------------------

/** Resumen mensual mostrado en la tarjeta del repartidor. */
export interface DriverMonthlySummary {
  driver: Driver;
  pointOfSale: PointOfSale;
  zone: Zone;
  accumulatedHours: number;
  workedDays: number;
  restDays: number;
  /** Horas de almuerzo/descanso dentro de la jornada acumuladas en el mes. */
  breakHours: number;
  shifts: Shift[];
}

// ---------------------------------------------------------------------------
// Motor de reglas de asignación
// ---------------------------------------------------------------------------

export type RuleSeverity = "error" | "warning";

export type RuleCode =
  | "OVERLAP"
  | "MONTHLY_CAP"
  | "WEEKLY_REST"
  | "MIN_REST_BETWEEN"
  | "MAX_CONSECUTIVE"
  | "ZONE_MISMATCH"
  | "SUNDAY_COMP"
  | "LUNCH_BREAK"
  | "DRIVER_UNAVAILABLE";

export interface RuleViolation {
  code: RuleCode;
  severity: RuleSeverity;
  message: string;
}

export interface AssignmentRules {
  /** Tope mensual de horas (por defecto se toma del repartidor). */
  monthlyHourCap?: number;
  /** Horas mínimas de descanso entre el fin de un turno y el inicio del siguiente. */
  minRestBetweenShiftsHours: number;
  /** Máximo de días consecutivos trabajados antes de exigir descanso. */
  maxConsecutiveDays: number;
  /** Días de descanso mínimos exigidos en cada ventana de 7 días. */
  minRestDaysPerWeek: number;
  /** Si es true, asignar fuera de la zona base genera una advertencia. */
  enforceZoneMatch: boolean;
  /** Si es true, trabajar un domingo exige un compensatorio dentro de la ventana siguiente. */
  requireSundayCompensation: boolean;
  /** Días siguientes al domingo dentro de los que debe caer el compensatorio. */
  sundayCompensationDays: number;
  /** Si es true, valida que las jornadas largas descuenten hora(s) de almuerzo. */
  lunchEnabled: boolean;
  /** Jornada bruta (horas) por encima de la cual corresponde almuerzo. */
  lunchThresholdHours: number;
  /** Horas de almuerzo estándar para jornadas por encima del umbral. */
  lunchHours: number;
  /** Jornada bruta (horas) desde la cual corresponden 2 horas de almuerzo. */
  longJornadaHours: number;
}

export const DEFAULT_RULES: AssignmentRules = {
  minRestBetweenShiftsHours: 12,
  maxConsecutiveDays: 6,
  minRestDaysPerWeek: 1,
  enforceZoneMatch: true,
  requireSundayCompensation: true,
  sundayCompensationDays: 6,
  lunchEnabled: true,
  lunchThresholdHours: 7,
  lunchHours: 1,
  longJornadaHours: 10,
};
