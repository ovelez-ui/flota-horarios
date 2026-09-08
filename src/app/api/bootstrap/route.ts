import { NextResponse } from "next/server";
import { repo } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Carga inicial completa de la flota desde la base de datos. */
export function GET() {
  return NextResponse.json({
    zones: repo.allZones(),
    pointsOfSale: repo.allPointsOfSale(),
    drivers: repo.allDrivers(),
    shifts: repo.allShifts(),
  });
}
