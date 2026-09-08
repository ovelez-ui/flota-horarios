import { NextResponse } from "next/server";
import { repo } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check para monitoreo / balanceador.
 * Verifica que la base de datos responde y devuelve conteos básicos.
 */
export function GET() {
  try {
    const counts = {
      zones: repo.allZones().length,
      pointsOfSale: repo.allPointsOfSale().length,
      drivers: repo.allDrivers().length,
    };
    return NextResponse.json({ status: "ok", db: "up", counts, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: "error", db: "down", message: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
