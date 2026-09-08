import type {
  AssignmentRules,
  Driver,
  RuleViolation,
  Shift,
} from "@/types";
import { DEFAULT_RULES } from "@/types";
import { parseShiftCode, isRestCode } from "@/lib/shift-catalog";
import { daysBetween } from "@/lib/date-utils";

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

  return violations;
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
