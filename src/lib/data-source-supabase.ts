import type { Driver, PointOfSale, Shift, Zone } from "@/types";
import type { SeedShift } from "@/data/seed";
import type { Bootstrap } from "@/lib/api-client";
import { getSupabase } from "@/lib/supabase";
import { buildShift, type BuildShiftInput } from "@/lib/shift-rules";
import { shiftKind } from "@/lib/shift-catalog";
import { weekdayName, datesBetween } from "@/lib/date-utils";
import { monthBounds } from "@/lib/month";
import { slugify } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Mapeo fila (snake_case) <-> dominio ---
const toZone = (r: any): Zone => ({ id: r.id, code: r.code, name: r.name, city: r.city, color: r.color });
const toPos = (r: any): PointOfSale => ({ id: r.id, name: r.name, zoneId: r.zone_id, address: r.address ?? undefined, minDriversPerShift: r.min_drivers });
const toDriver = (r: any): Driver => ({ id: r.id, name: r.name, basePointOfSaleId: r.base_pos_id, zoneId: r.zone_id, status: r.status, monthlyHourCap: r.monthly_cap, phone: r.phone ?? undefined });
const toShift = (r: any): SeedShift => ({ id: r.id, driverId: r.driver_id, date: r.date, weekday: r.weekday, code: r.code, start: r.start_h, end: r.end_h, hours: r.hours, kind: r.kind, pointOfSaleId: r.pos_id ?? undefined, zoneId: r.zone_id ?? undefined });

const zoneRow = (z: Zone) => ({ id: z.id, code: z.code, name: z.name, city: z.city, color: z.color });
const posRow = (p: PointOfSale) => ({ id: p.id, name: p.name, zone_id: p.zoneId, address: p.address ?? null, min_drivers: p.minDriversPerShift });
const driverRow = (d: Driver) => ({ id: d.id, name: d.name, base_pos_id: d.basePointOfSaleId, zone_id: d.zoneId, status: d.status, monthly_cap: d.monthlyHourCap, phone: d.phone ?? null });
const shiftRow = (s: Shift) => ({ id: s.id, driver_id: s.driverId, date: s.date, weekday: s.weekday, code: s.code, start_h: s.start, end_h: s.end, hours: s.hours, kind: shiftKind(s), pos_id: s.pointOfSaleId ?? null, zone_id: s.zoneId ?? null });

/**
 * Trae todas las filas de una tabla paginando (PostgREST limita a ~1000).
 * `monthly` acota los turnos al mes vigente (columna `date`).
 */
async function fetchAll(table: string, monthly = false): Promise<any[]> {
  const db = getSupabase();
  const out: any[] = [];
  const size = 1000;
  const bounds = monthly ? monthBounds() : null;
  for (let from = 0; ; from += size) {
    let q = db.from(table).select("*").range(from, from + size - 1);
    if (bounds) q = q.gte("date", bounds.from).lte("date", bounds.to);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

async function uniqueId(table: string, base: string): Promise<string> {
  const db = getSupabase();
  let id = base;
  let i = 2;
  // Comprueba colisiones; en la práctica casi nunca itera.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await db.from(table).select("id").eq("id", id).limit(1);
    if (!data || data.length === 0) return id;
    id = `${base}-${i++}`;
  }
}

export const supabaseSource = {
  async bootstrap(): Promise<Bootstrap> {
    const [zones, pos, drivers, shifts] = await Promise.all([
      fetchAll("zones"), fetchAll("points_of_sale"), fetchAll("drivers"), fetchAll("shifts", true),
    ]);
    return {
      zones: zones.map(toZone).sort((a, b) => a.name.localeCompare(b.name)),
      pointsOfSale: pos.map(toPos).sort((a, b) => a.name.localeCompare(b.name)),
      drivers: drivers.map(toDriver).sort((a, b) => a.name.localeCompare(b.name)),
      shifts: shifts.map(toShift),
    };
  },

  // --- Zonas ---
  async createZone(body: Omit<Zone, "id">) {
    const db = getSupabase();
    const id = await uniqueId("zones", slugify(body.name, "Z"));
    const zone: Zone = { id, code: body.code || body.name, name: body.name, city: body.city || "Medellín", color: body.color || "#084878" };
    const { error } = await db.from("zones").insert(zoneRow(zone));
    return error ? { ok: false, zone, error: error.message } : { ok: true, zone };
  },
  async updateZone(id: string, patch: Partial<Omit<Zone, "id">>) {
    const db = getSupabase();
    const { data, error } = await db.from("zones").update({
      code: patch.code, name: patch.name, city: patch.city, color: patch.color,
    }).eq("id", id).select().single();
    return error ? { ok: false, zone: {} as Zone, error: error.message } : { ok: true, zone: toZone(data) };
  },
  async deleteZone(id: string) {
    const { error } = await getSupabase().from("zones").delete().eq("id", id);
    return error ? { ok: false, error: "La zona tiene puntos de venta o repartidores asociados." } : { ok: true };
  },

  // --- Puntos de venta ---
  async createPos(body: Omit<PointOfSale, "id">) {
    const db = getSupabase();
    const id = await uniqueId("points_of_sale", slugify(body.name, "PDV"));
    const pos: PointOfSale = { id, name: body.name, zoneId: body.zoneId, address: body.address, minDriversPerShift: Number(body.minDriversPerShift ?? 1) };
    const { error } = await db.from("points_of_sale").insert(posRow(pos));
    return error ? { ok: false, pos, error: error.message } : { ok: true, pos };
  },
  async updatePos(id: string, patch: Partial<Omit<PointOfSale, "id">>) {
    const db = getSupabase();
    const { data, error } = await db.from("points_of_sale").update({
      name: patch.name, zone_id: patch.zoneId, address: patch.address, min_drivers: patch.minDriversPerShift,
    }).eq("id", id).select().single();
    return error ? { ok: false, pos: {} as PointOfSale, error: error.message } : { ok: true, pos: toPos(data) };
  },
  async deletePos(id: string) {
    const { error } = await getSupabase().from("points_of_sale").delete().eq("id", id);
    return error ? { ok: false, error: "El punto de venta tiene repartidores asignados." } : { ok: true };
  },

  // --- Repartidores ---
  async createDriver(body: Driver) {
    const { error } = await getSupabase().from("drivers").insert(driverRow(body));
    return error ? { ok: false, driver: body, error: error.message } : { ok: true, driver: body };
  },
  async updateDriver(id: string, patch: Partial<Omit<Driver, "id">>) {
    const db = getSupabase();
    const { data, error } = await db.from("drivers").update({
      name: patch.name, base_pos_id: patch.basePointOfSaleId, zone_id: patch.zoneId,
      status: patch.status, monthly_cap: patch.monthlyHourCap, phone: patch.phone,
    }).eq("id", id).select().single();
    return error ? { ok: false, driver: {} as Driver, error: error.message } : { ok: true, driver: toDriver(data) };
  },
  async deleteDriver(id: string) {
    const { error } = await getSupabase().from("drivers").delete().eq("id", id);
    return error ? { ok: false, error: error.message } : { ok: true };
  },

  // --- Turnos de un mes específico (para copiar plantilla) ---
  async listShiftsInMonth(prefix: string): Promise<SeedShift[]> {
    const db = getSupabase();
    const [y, m] = prefix.split("-").map(Number);
    const last = new Date(y!, m!, 0).getDate();
    const from = `${prefix}-01`;
    const to = `${prefix}-${String(last).padStart(2, "0")}`;
    const out: any[] = [];
    const size = 1000;
    for (let f = 0; ; f += size) {
      const { data, error } = await db.from("shifts").select("*").gte("date", from).lte("date", to).range(f, f + size - 1);
      if (error) throw new Error(error.message);
      out.push(...(data ?? []));
      if (!data || data.length < size) break;
    }
    return out.map(toShift);
  },

  // --- Alta masiva de turnos (copiar mes) ---
  async bulkUpsertShifts(shifts: Shift[]): Promise<{ ok: boolean; count: number; error?: string }> {
    if (shifts.length === 0) return { ok: true, count: 0 };
    const { error } = await getSupabase().from("shifts").upsert(shifts.map(shiftRow), { onConflict: "driver_id,date" });
    return error ? { ok: false, count: 0, error: error.message } : { ok: true, count: shifts.length };
  },

  // --- Asignación (validación previa en el store con preview()) ---
  async assignShift(input: BuildShiftInput) {
    const shift = buildShift({ ...input, weekday: input.weekday || weekdayName(input.date) });
    const { error } = await getSupabase().from("shifts").upsert(shiftRow(shift), { onConflict: "driver_id,date" });
    return error
      ? { ok: false, violations: [], shift: undefined as Shift | undefined, error: error.message }
      : { ok: true, violations: [], shift };
  },
  async assignRange(input: { driverId: string; from: string; to: string; code: string }) {
    const dates = datesBetween(input.from, input.to);
    const shifts = dates.map((date) => buildShift({
      driverId: input.driverId, date, weekday: weekdayName(date), code: input.code,
    }));
    const { error } = await getSupabase().from("shifts").upsert(shifts.map(shiftRow), { onConflict: "driver_id,date" });
    return error
      ? { ok: false, count: 0, shifts: [] as Shift[], error: error.message }
      : { ok: true, count: shifts.length, shifts };
  },
};
