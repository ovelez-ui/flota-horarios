import { NextResponse } from "next/server";
import type { Zone } from "@/types";
import { repo } from "@/lib/server/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(repo.allZones());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Zone>;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const existing = new Set(repo.allZones().map((z) => z.id));
  let id = slugify(body.name, "Z");
  let i = 2;
  while (existing.has(id)) id = `${slugify(body.name, "Z")}-${i++}`;

  const zone: Zone = {
    id,
    code: body.code?.trim() || body.name.trim(),
    name: body.name.trim(),
    city: body.city?.trim() || "Medellín",
    color: body.color || "#084878",
  };
  repo.createZone(zone);
  return NextResponse.json(zone, { status: 201 });
}
