import { NextResponse } from "next/server";
import type { PointOfSale } from "@/types";
import { repo } from "@/lib/server/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(repo.allPointsOfSale());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<PointOfSale>;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (!body.zoneId || !repo.exists("zones", body.zoneId)) {
    return NextResponse.json({ error: "La zona indicada no existe." }, { status: 400 });
  }
  const existing = new Set(repo.allPointsOfSale().map((p) => p.id));
  let id = slugify(body.name, "PDV");
  let i = 2;
  while (existing.has(id)) id = `${slugify(body.name, "PDV")}-${i++}`;

  const pos: PointOfSale = {
    id,
    name: body.name.trim(),
    zoneId: body.zoneId,
    address: body.address?.trim() || undefined,
    minDriversPerShift: Number(body.minDriversPerShift ?? 1),
  };
  repo.createPos(pos);
  return NextResponse.json(pos, { status: 201 });
}
