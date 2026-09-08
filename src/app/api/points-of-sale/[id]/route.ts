import { NextResponse } from "next/server";
import type { PointOfSale } from "@/types";
import { repo } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  if (!repo.exists("points_of_sale", params.id)) {
    return NextResponse.json({ error: "Punto de venta no encontrado." }, { status: 404 });
  }
  const b = (await req.json()) as Partial<Omit<PointOfSale, "id">>;
  if (b.zoneId && !repo.exists("zones", b.zoneId)) {
    return NextResponse.json({ error: "La zona indicada no existe." }, { status: 400 });
  }
  const current = repo.allPointsOfSale().find((p) => p.id === params.id)!;
  const updated: Omit<PointOfSale, "id"> = {
    name: b.name ?? current.name,
    zoneId: b.zoneId ?? current.zoneId,
    address: b.address ?? current.address,
    minDriversPerShift: b.minDriversPerShift ?? current.minDriversPerShift,
  };
  repo.updatePos(params.id, updated);
  return NextResponse.json({ id: params.id, ...updated });
}

export function DELETE(_req: Request, { params }: Ctx) {
  if (!repo.exists("points_of_sale", params.id)) {
    return NextResponse.json({ error: "Punto de venta no encontrado." }, { status: 404 });
  }
  if (repo.posHasDrivers(params.id)) {
    return NextResponse.json(
      { error: "El punto de venta tiene repartidores asignados." },
      { status: 409 },
    );
  }
  repo.deletePos(params.id);
  return NextResponse.json({ ok: true });
}
