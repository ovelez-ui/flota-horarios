import { NextResponse } from "next/server";
import type { Driver } from "@/types";
import { repo } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(repo.allDrivers());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Driver>;
  const id = body.id?.trim();
  if (!id) return NextResponse.json({ error: "La cédula es obligatoria." }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  if (repo.exists("drivers", id)) {
    return NextResponse.json({ error: "Ya existe un repartidor con esa cédula." }, { status: 409 });
  }
  if (!body.basePointOfSaleId || !repo.exists("points_of_sale", body.basePointOfSaleId)) {
    return NextResponse.json({ error: "El punto base indicado no existe." }, { status: 400 });
  }

  const driver: Driver = {
    id,
    name: body.name.trim(),
    basePointOfSaleId: body.basePointOfSaleId,
    zoneId: body.zoneId ?? "",
    status: body.status ?? "ACTIVE",
    monthlyHourCap: Number(body.monthlyHourCap ?? 192),
    phone: body.phone?.trim() || undefined,
  };
  repo.createDriver(driver);
  return NextResponse.json(driver, { status: 201 });
}
