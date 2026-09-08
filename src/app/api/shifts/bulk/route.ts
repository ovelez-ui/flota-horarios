import { NextResponse } from "next/server";
import { repo } from "@/lib/server/db";
import { buildShift } from "@/lib/shift-rules";
import { parseShiftCode } from "@/lib/shift-catalog";
import { weekdayName, datesBetween } from "@/lib/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BulkInput {
  driverId: string;
  from: string;
  to: string;
  code: string;
}

/**
 * POST /api/shifts/bulk — asigna un mismo código a un rango de fechas.
 * Pensado para novedades (vacaciones, incapacidad, compensatorio, día de la
 * familia), que no generan conflictos de horario.
 */
export async function POST(req: Request) {
  const input = (await req.json()) as BulkInput;
  const driver = repo.getDriver(input.driverId);
  if (!driver) {
    return NextResponse.json({ error: "Repartidor no encontrado." }, { status: 404 });
  }
  if (!input.from || !input.to) {
    return NextResponse.json({ error: "Rango de fechas incompleto." }, { status: 400 });
  }
  try {
    parseShiftCode(input.code);
  } catch {
    return NextResponse.json({ error: `Código inválido: ${input.code}` }, { status: 400 });
  }

  const dates = datesBetween(input.from, input.to);
  if (dates.length === 0 || dates.length > 62) {
    return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
  }

  const shifts = dates.map((date) =>
    buildShift({
      driverId: input.driverId,
      date,
      weekday: weekdayName(date),
      code: input.code,
      zoneId: driver.zoneId,
      pointOfSaleId: driver.basePointOfSaleId,
    }),
  );

  for (const s of shifts) repo.upsertShift(s);

  return NextResponse.json({ ok: true, count: shifts.length, shifts });
}
