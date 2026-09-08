import { NextResponse } from "next/server";
import type { Driver } from "@/types";
import { repo } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const current = repo.getDriver(params.id);
  if (!current) return NextResponse.json({ error: "Repartidor no encontrado." }, { status: 404 });

  const b = (await req.json()) as Partial<Omit<Driver, "id">>;
  if (b.basePointOfSaleId && !repo.exists("points_of_sale", b.basePointOfSaleId)) {
    return NextResponse.json({ error: "El punto base indicado no existe." }, { status: 400 });
  }
  const updated: Omit<Driver, "id"> = {
    name: b.name ?? current.name,
    basePointOfSaleId: b.basePointOfSaleId ?? current.basePointOfSaleId,
    zoneId: b.zoneId ?? current.zoneId,
    status: b.status ?? current.status,
    monthlyHourCap: b.monthlyHourCap ?? current.monthlyHourCap,
    phone: b.phone ?? current.phone,
  };
  repo.updateDriver(params.id, updated);
  return NextResponse.json({ id: params.id, ...updated });
}

export function DELETE(_req: Request, { params }: Ctx) {
  if (!repo.getDriver(params.id)) {
    return NextResponse.json({ error: "Repartidor no encontrado." }, { status: 404 });
  }
  repo.deleteDriver(params.id);
  return NextResponse.json({ ok: true });
}
