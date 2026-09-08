import { NextResponse } from "next/server";
import type { Zone } from "@/types";
import { repo } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  if (!repo.exists("zones", params.id)) {
    return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
  }
  const b = (await req.json()) as Partial<Omit<Zone, "id">>;
  const current = repo.allZones().find((z) => z.id === params.id)!;
  const updated: Omit<Zone, "id"> = {
    code: b.code ?? current.code,
    name: b.name ?? current.name,
    city: b.city ?? current.city,
    color: b.color ?? current.color,
  };
  repo.updateZone(params.id, updated);
  return NextResponse.json({ id: params.id, ...updated });
}

export function DELETE(_req: Request, { params }: Ctx) {
  if (!repo.exists("zones", params.id)) {
    return NextResponse.json({ error: "Zona no encontrada." }, { status: 404 });
  }
  if (repo.zoneHasChildren(params.id)) {
    return NextResponse.json(
      { error: "La zona tiene puntos de venta o repartidores asociados." },
      { status: 409 },
    );
  }
  repo.deleteZone(params.id);
  return NextResponse.json({ ok: true });
}
