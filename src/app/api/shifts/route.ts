import { NextResponse } from "next/server";
import { repo } from "@/lib/server/db";
import { buildShift, hasBlockingError, validateAssignment, type BuildShiftInput } from "@/lib/shift-rules";
import { parseShiftCode } from "@/lib/shift-catalog";
import { weekdayName } from "@/lib/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/shifts?driverId=... — turnos de un repartidor. */
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId");
  if (!driverId) {
    return NextResponse.json({ error: "Falta driverId." }, { status: 400 });
  }
  return NextResponse.json(repo.driverShifts(driverId));
}

/**
 * POST /api/shifts — asigna un turno.
 * Valida contra el motor de reglas en el servidor antes de persistir.
 */
export async function POST(req: Request) {
  const input = (await req.json()) as BuildShiftInput;
  const driver = repo.getDriver(input.driverId);
  if (!driver) {
    return NextResponse.json({ error: "Repartidor no encontrado." }, { status: 404 });
  }
  try {
    parseShiftCode(input.code); // valida el código antes de construir
  } catch {
    return NextResponse.json({ error: `Código de turno inválido: ${input.code}` }, { status: 400 });
  }

  const candidate = buildShift({ ...input, weekday: input.weekday || weekdayName(input.date) });
  const violations = validateAssignment({
    driver,
    existingShifts: repo.driverShifts(input.driverId),
    candidate,
  });

  if (hasBlockingError(violations)) {
    return NextResponse.json({ ok: false, violations }, { status: 422 });
  }

  repo.upsertShift(candidate);
  return NextResponse.json({ ok: true, violations, shift: candidate });
}

/** DELETE /api/shifts — vacía una celda (borra el turno de ese día). */
export async function DELETE(req: Request) {
  const { driverId, date } = (await req.json()) as { driverId?: string; date?: string };
  if (!driverId || !date) {
    return NextResponse.json({ ok: false, error: "Falta driverId o date." }, { status: 400 });
  }
  repo.removeShift(driverId, date);
  return NextResponse.json({ ok: true });
}
