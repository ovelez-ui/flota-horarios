import type {
  AssignmentRules,
  Driver,
  RuleViolation,
  Shift,
} from "@/types";
import { DEFAULT_RULES } from "@/types";
import { parseShiftCode, isRestCode } from "@/lib/shift-catalog";
import { daysBetween, parseISO } from "@/lib/date-utils";

/** Código de novedad que representa un día compensatorio. */
const COMP_CODE = "COMP";

/** true si la fecha ISO cae en domingo. */
function isSunday(isoDate: string): boolean {
  return parseISO(isoDate).getDay() === 0;
}

/**
 * true si existe un compensatorio (COMP) entre el día siguiente al domingo
 * y `days` días después (ventana de compensación).
 */
function hasCompensationWithin(shifts: Shift[], sundayISO: string, days: number): boolean {
  const start = shiftDateBy(sundayISO, 1);
  const end = shiftDateBy(sundayISO, days);
  return shifts.some((s) => s.code === COMP_CODE && s.date >= start && s.date <= end);
}

// ---------------------------------------------------------------------------
// Métricas de un conjunto de turnos
// ---------------------------------------------------------------------------

export function totalHours(shifts: Shift[]): number {
  return shifts.reduce((sum, s) => sum + (s.hours || 0), 0);
}

export function workedDays(shifts: Shift[]): number {
  return shifts.filter((s) => !isRestCode(s.code)).length;
}

export function restDays(shifts: Shift[]): number {
  return shifts.filter((s) => isRestCode(s.code)).length;
}

/**
 * Horas de almuerzo/descanso dentro de la jornada de un turno:
 * jornada bruta (fin - inicio) menos horas netas trabajadas.
 */
export function shiftBreakHours(s: Shift): number {
  if (s.start === null || s.end === null) return 0;
  const gross = s.end - s.start;
  return Math.max(0, Math.round((gross - (s.hours || 0)) * 100) / 100);
}

/** Total de horas de almuerzo/descanso en jornada de un conjunto de turnos. */
export function totalBreakHours(shifts: Shift[]): number {
  return Math.round(shifts.reduce((sum, s) => sum + shiftBreakHours(s), 0) * 10) / 10;
}

/** Almuerzo que corresponde a una jornada bruta según las reglas. */
export function expectedLunch(grossHours: number, rules: AssignmentRules): number {
  if (!rules.lunchEnabled) return 0;
  if (grossHours >= rules.longJornadaHours) return 2;
  if (grossHours > rules.lunchThresholdHours) return rules.lunchHours;
  return 0;
}

/** Intervalo absoluto (en horas desde el epoch de fecha) que ocupa un turno. */
interface AbsoluteInterval {
  startAbs: number;
  endAbs: number;
}

function toAbsoluteInterval(shift: Shift, referenceISO: string): AbsoluteInterval | null {
  if (shift.start === null || shift.end === null) return null;
  const dayOffset = daysBetween(referenceISO, shift.date) * 24;
  return {
    startAbs: dayOffset + shift.start,
    endAbs: dayOffset + shift.end, // `end` puede ser >24 si cruza medianoche
  };
}

function overlaps(a: AbsoluteInterval, b: AbsoluteInterval): boolean {
  return a.startAbs < b.endAbs && b.startAbs < a.endAbs;
}

// ---------------------------------------------------------------------------
// Validación de una asignación candidata
// ---------------------------------------------------------------------------

export interface AssignmentContext {
  driver: Driver;
  /** Turnos ya existentes del repartidor en el periodo. */
  existingShifts: Shift[];
  /** Turno candidato a asignar. */
  candidate: Shift;
  rules?: Partial<AssignmentRules>;
}

/**
 * Valida un turno candidato contra las reglas de negocio.
 * Función PURA: no muta entradas y es determinista.
 */
export function validateAssignment(ctx: AssignmentContext): RuleViolation[] {
  const rules: AssignmentRules = { ...DEFAULT_RULES, ...ctx.rules };
  const { driver, existingShifts, candidate } = ctx;
  const violations: RuleViolation[] = [];

  // Turnos sin el propio candidato (por si se reasigna la misma fecha).
  const others = existingShifts.filter(
    (s) => !(s.date === candidate.date && s.id === candidate.id),
  );

  // 0. Disponibilidad del repartidor.
  if (driver.status !== "ACTIVE") {
    violations.push({
      code: "DRIVER_UNAVAILABLE",
      severity: "error",
      message: `El repartidor no está activo (estado: ${driver.status}).`,
    });
  }

  // Un descanso solo puede chocar con la regla de disponibilidad; el resto no aplica.
  if (isRestCode(candidate.code)) {
    return violations;
  }

  // 1. Choque de horarios el mismo día (o cruce de medianoche).
  const ref = candidate.date;
  const candInterval = toAbsoluteInterval(candidate, ref);
  if (candInterval) {
    for (const s of others) {
      if (isRestCode(s.code)) continue;
      const interval = toAbsoluteInterval(s, ref);
      if (interval && overlaps(candInterval, interval)) {
        violations.push({
          code: "OVERLAP",
          severity: "error",
          message: `Choque de horario con el turno ${s.code} del ${s.date}.`,
        });
        break;
      }
    }
  }

  // 2. Tope de horas mensuales.
  const cap = rules.monthlyHourCap ?? driver.monthlyHourCap;
  const projected = totalHours(others) + candidate.hours;
  if (projected > cap) {
    violations.push({
      code: "MONTHLY_CAP",
      severity: "error",
      message: `Excede el tope mensual: ${projected}h proyectadas de ${cap}h permitidas.`,
    });
  }

  // 3. Descanso mínimo entre turnos consecutivos.
  if (candInterval) {
    for (const s of others) {
      if (isRestCode(s.code)) continue;
      const interval = toAbsoluteInterval(s, ref);
      if (!interval) continue;
      const gap =
        interval.startAbs >= candInterval.endAbs
          ? interval.startAbs - candInterval.endAbs
          : candInterval.startAbs - interval.endAbs;
      if (gap >= 0 && gap < rules.minRestBetweenShiftsHours) {
        violations.push({
          code: "MIN_REST_BETWEEN",
          severity: "warning",
          message: `Descanso de solo ${gap}h respecto al turno ${s.code} (mínimo ${rules.minRestBetweenShiftsHours}h).`,
        });
        break;
      }
    }
  }

  // 4. Días consecutivos trabajados.
  const consecutive = consecutiveWorkingDaysIncluding(others, candidate);
  if (consecutive > rules.maxConsecutiveDays) {
    violations.push({
      code: "MAX_CONSECUTIVE",
      severity: "error",
      message: `Supera ${rules.maxConsecutiveDays} días consecutivos (${consecutive} seguidos).`,
    });
  }

  // 5. Descanso semanal mínimo en la ventana de 7 días alrededor del candidato.
  if (!hasWeeklyRest(others, candidate, rules.minRestDaysPerWeek)) {
    violations.push({
      code: "WEEKLY_REST",
      severity: "error",
      message: `No garantiza ${rules.minRestDaysPerWeek} día(s) de descanso en la semana.`,
    });
  }

  // 6. Cruce de zona: asignar fuera de la zona base del repartidor.
  if (
    rules.enforceZoneMatch &&
    candidate.zoneId &&
    candidate.zoneId !== driver.zoneId
  ) {
    violations.push({
      code: "ZONE_MISMATCH",
      severity: "warning",
      message: `Asignación fuera de la zona base del repartidor.`,
    });
  }

  // 7. Compensatorio por domingo trabajado.
  if (rules.requireSundayCompensation && isSunday(candidate.date)) {
    const days = rules.sundayCompensationDays;
    if (!hasCompensationWithin(others, candidate.date, days)) {
      violations.push({
        code: "SUNDAY_COMP",
        severity: "warning",
        message: `Domingo trabajado: falta asignar el compensatorio dentro de los ${days} días siguientes.`,
      });
    }
  }

  // 8. Almuerzo/descanso en jornadas largas.
  if (rules.lunchEnabled && candidate.start !== null && candidate.end !== null) {
    const gross = Math.round((candidate.end - candidate.start) * 100) / 100;
    const actual = Math.max(0, Math.round((gross - candidate.hours) * 100) / 100);
    const expected = expectedLunch(gross, rules);
    if (expected > 0 && actual + 0.01 < expected) {
      violations.push({
        code: "LUNCH_BREAK",
        severity: "warning",
        message: `Jornada de ${gross}h: corresponde(n) ${expected}h de almuerzo; el turno descuenta ${actual}h${expected === 1 ? ` (use el sufijo *, ej. ${candidate.code}*)` : ""}.`,
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Alertas de compensación de domingo (barrido mensual)
// ---------------------------------------------------------------------------

export interface SundayCompAlert {
  driverId: string;
  /** Domingo trabajado (ISO). */
  sundayDate: string;
  /** Fecha límite para el compensatorio (domingo + ventana). */
  dueBy: string;
  /** true si ya tiene un compensatorio dentro de la ventana. */
  compensated: boolean;
}

/**
 * Recorre todos los turnos y detecta domingos trabajados, indicando si ya
 * cuentan con un compensatorio dentro de la ventana configurada.
 */
export function sundayCompensationAlerts(
  shifts: Shift[],
  rules: Pick<AssignmentRules, "requireSundayCompensation" | "sundayCompensationDays">,
): SundayCompAlert[] {
  if (!rules.requireSundayCompensation) return [];
  const days = rules.sundayCompensationDays;

  const byDriver = new Map<string, Shift[]>();
  for (const s of shifts) {
    const arr = byDriver.get(s.driverId) ?? [];
    arr.push(s);
    byDriver.set(s.driverId, arr);
  }

  const alerts: SundayCompAlert[] = [];
  for (const [driverId, list] of byDriver) {
    for (const s of list) {
      if (isRestCode(s.code) || !isSunday(s.date)) continue;
      alerts.push({
        driverId,
        sundayDate: s.date,
        dueBy: shiftDateBy(s.date, days),
        compensated: hasCompensationWithin(list, s.date, days),
      });
    }
  }
  // Orden cronológico por domingo.
  return alerts.sort((a, b) => a.sundayDate.localeCompare(b.sundayDate));
}

/** Cuenta la racha de días trabajados consecutivos que incluye al candidato. */
function consecutiveWorkingDaysIncluding(others: Shift[], candidate: Shift): number {
  const workDates = new Set(
    others.filter((s) => !isRestCode(s.code)).map((s) => s.date),
  );
  workDates.add(candidate.date);

  let count = 1;
  // Hacia atrás.
  for (let offset = 1; ; offset++) {
    const prev = shiftDateBy(candidate.date, -offset);
    if (workDates.has(prev)) count++;
    else break;
  }
  // Hacia adelante.
  for (let offset = 1; ; offset++) {
    const next = shiftDateBy(candidate.date, offset);
    if (workDates.has(next)) count++;
    else break;
  }
  return count;
}

/** Verifica que exista al menos N descansos en la ventana ±6 días del candidato. */
function hasWeeklyRest(others: Shift[], candidate: Shift, minRest: number): boolean {
  const windowStart = shiftDateBy(candidate.date, -6);
  const windowEnd = shiftDateBy(candidate.date, 6);

  const inWindow = others.filter(
    (s) => s.date >= windowStart && s.date <= windowEnd,
  );

  // Días con descanso explícito dentro de la ventana de 7 días centrada.
  const restCount = inWindow.filter((s) => isRestCode(s.code)).length;

  // Si la semana está completamente cubierta con trabajo (incl. candidato) y no hay descansos.
  const daysCovered = new Set(inWindow.map((s) => s.date));
  daysCovered.add(candidate.date);

  // Solo exigimos descanso si hay una semana "llena" (7+ días programados).
  if (daysCovered.size < 7) return true;
  return restCount >= minRest;
}

function shiftDateBy(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + deltaDays);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Constructor de turnos (fábrica) a partir de un código
// ---------------------------------------------------------------------------

export interface BuildShiftInput {
  driverId: string;
  date: string;
  weekday: string;
  code: string;
  pointOfSaleId?: string;
  zoneId?: string;
}

export function buildShift(input: BuildShiftInput): Shift {
  const def = parseShiftCode(input.code);
  return {
    id: `${input.driverId}-${input.date}`,
    driverId: input.driverId,
    date: input.date,
    weekday: input.weekday,
    code: def.code,
    start: def.start,
    end: def.end,
    hours: def.hours,
    pointOfSaleId: input.pointOfSaleId,
    zoneId: input.zoneId,
  };
}

export function hasBlockingError(violations: RuleViolation[]): boolean {
  return violations.some((v) => v.severity === "error");
}
