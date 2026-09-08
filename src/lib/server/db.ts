/**
 * Capa de acceso a datos del servidor (SQLite nativo de Node — `node:sqlite`).
 *
 * Solo debe importarse desde Route Handlers (runtime Node). Mantiene un
 * singleton de conexión y siembra la base con la malla real la primera vez.
 *
 * El diseño está encapsulado tras funciones de repositorio para poder migrar
 * más adelante a Postgres/Supabase cambiando únicamente este archivo.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Driver, PointOfSale, Shift, Zone } from "@/types";
import { SEED, type SeedShift } from "@/data/seed";
import { shiftKind } from "@/lib/shift-catalog";

let db: DatabaseSync | null = null;

function connect(): DatabaseSync {
  if (db) return db;

  // Directorio de datos configurable (montar un volumen persistente en prod).
  const dir = process.env.DATA_DIR
    ? process.env.DATA_DIR
    : join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const database = new DatabaseSync(join(dir, "fleet.db"));

  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY, code TEXT, name TEXT, city TEXT, color TEXT
    );
    CREATE TABLE IF NOT EXISTS points_of_sale (
      id TEXT PRIMARY KEY, name TEXT, zone_id TEXT, address TEXT, min_drivers INTEGER
    );
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY, name TEXT, base_pos_id TEXT, zone_id TEXT,
      status TEXT, monthly_cap INTEGER, phone TEXT
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY, driver_id TEXT, date TEXT, weekday TEXT, code TEXT,
      start REAL, "end" REAL, hours REAL, kind TEXT, pos_id TEXT, zone_id TEXT,
      UNIQUE(driver_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_shifts_driver ON shifts(driver_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
    CREATE INDEX IF NOT EXISTS idx_shifts_zone ON shifts(zone_id);
  `);

  db = database;
  seedIfEmpty();
  return database;
}

function seedIfEmpty(): void {
  const d = db!;
  const count = d.prepare("SELECT COUNT(*) AS c FROM zones").get() as { c: number };
  if (count.c > 0) return;

  const insZone = d.prepare("INSERT INTO zones (id,code,name,city,color) VALUES (?,?,?,?,?)");
  const insPos = d.prepare("INSERT INTO points_of_sale (id,name,zone_id,address,min_drivers) VALUES (?,?,?,?,?)");
  const insDriver = d.prepare("INSERT INTO drivers (id,name,base_pos_id,zone_id,status,monthly_cap,phone) VALUES (?,?,?,?,?,?,?)");
  const insShift = d.prepare(`INSERT OR IGNORE INTO shifts
    (id,driver_id,date,weekday,code,start,"end",hours,kind,pos_id,zone_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  d.exec("BEGIN");
  try {
    for (const z of SEED.zones) insZone.run(z.id, z.code, z.name, z.city, z.color);
    for (const p of SEED.pointsOfSale)
      insPos.run(p.id, p.name, p.zoneId, p.address ?? null, p.minDriversPerShift);
    for (const dr of SEED.drivers)
      insDriver.run(dr.id, dr.name, dr.basePointOfSaleId, dr.zoneId, dr.status, dr.monthlyHourCap, dr.phone ?? null);
    for (const s of SEED.shifts)
      insShift.run(s.id, s.driverId, s.date, s.weekday, s.code, s.start, s.end, s.hours, s.kind, s.pointOfSaleId ?? null, s.zoneId ?? null);
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Mapeo fila <-> dominio
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
const toZone = (r: any): Zone => ({ id: r.id, code: r.code, name: r.name, city: r.city, color: r.color });
const toPos = (r: any): PointOfSale => ({
  id: r.id, name: r.name, zoneId: r.zone_id,
  address: r.address ?? undefined, minDriversPerShift: r.min_drivers,
});
const toDriver = (r: any): Driver => ({
  id: r.id, name: r.name, basePointOfSaleId: r.base_pos_id, zoneId: r.zone_id,
  status: r.status, monthlyHourCap: r.monthly_cap, phone: r.phone ?? undefined,
});
const toShift = (r: any): SeedShift => ({
  id: r.id, driverId: r.driver_id, date: r.date, weekday: r.weekday, code: r.code,
  start: r.start, end: r.end, hours: r.hours, kind: r.kind,
  pointOfSaleId: r.pos_id ?? undefined, zoneId: r.zone_id ?? undefined,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Repositorio
// ---------------------------------------------------------------------------

export const repo = {
  // --- Lecturas ---
  allZones(): Zone[] {
    return (connect().prepare("SELECT * FROM zones ORDER BY name").all() as any[]).map(toZone);
  },
  allPointsOfSale(): PointOfSale[] {
    return (connect().prepare("SELECT * FROM points_of_sale ORDER BY name").all() as any[]).map(toPos);
  },
  allDrivers(): Driver[] {
    return (connect().prepare("SELECT * FROM drivers ORDER BY name").all() as any[]).map(toDriver);
  },
  allShifts(): SeedShift[] {
    return (connect().prepare("SELECT * FROM shifts").all() as any[]).map(toShift);
  },
  driverShifts(driverId: string): Shift[] {
    return (connect()
      .prepare("SELECT * FROM shifts WHERE driver_id = ? ORDER BY date")
      .all(driverId) as any[]).map(toShift);
  },
  getDriver(id: string): Driver | undefined {
    const r = connect().prepare("SELECT * FROM drivers WHERE id = ?").get(id) as any;
    return r ? toDriver(r) : undefined;
  },

  // --- Zonas ---
  createZone(z: Zone): void {
    connect().prepare("INSERT INTO zones (id,code,name,city,color) VALUES (?,?,?,?,?)")
      .run(z.id, z.code, z.name, z.city, z.color);
  },
  updateZone(id: string, z: Omit<Zone, "id">): void {
    connect().prepare("UPDATE zones SET code=?,name=?,city=?,color=? WHERE id=?")
      .run(z.code, z.name, z.city, z.color, id);
  },
  deleteZone(id: string): void {
    connect().prepare("DELETE FROM zones WHERE id = ?").run(id);
  },
  zoneHasChildren(id: string): boolean {
    const d = connect();
    const p = d.prepare("SELECT COUNT(*) c FROM points_of_sale WHERE zone_id=?").get(id) as { c: number };
    const dr = d.prepare("SELECT COUNT(*) c FROM drivers WHERE zone_id=?").get(id) as { c: number };
    return p.c > 0 || dr.c > 0;
  },

  // --- Puntos de venta ---
  createPos(p: PointOfSale): void {
    connect().prepare("INSERT INTO points_of_sale (id,name,zone_id,address,min_drivers) VALUES (?,?,?,?,?)")
      .run(p.id, p.name, p.zoneId, p.address ?? null, p.minDriversPerShift);
  },
  updatePos(id: string, p: Omit<PointOfSale, "id">): void {
    connect().prepare("UPDATE points_of_sale SET name=?,zone_id=?,address=?,min_drivers=? WHERE id=?")
      .run(p.name, p.zoneId, p.address ?? null, p.minDriversPerShift, id);
  },
  deletePos(id: string): void {
    connect().prepare("DELETE FROM points_of_sale WHERE id = ?").run(id);
  },
  posHasDrivers(id: string): boolean {
    const r = connect().prepare("SELECT COUNT(*) c FROM drivers WHERE base_pos_id=?").get(id) as { c: number };
    return r.c > 0;
  },

  // --- Repartidores ---
  createDriver(dr: Driver): void {
    connect().prepare("INSERT INTO drivers (id,name,base_pos_id,zone_id,status,monthly_cap,phone) VALUES (?,?,?,?,?,?,?)")
      .run(dr.id, dr.name, dr.basePointOfSaleId, dr.zoneId, dr.status, dr.monthlyHourCap, dr.phone ?? null);
  },
  updateDriver(id: string, dr: Omit<Driver, "id">): void {
    connect().prepare("UPDATE drivers SET name=?,base_pos_id=?,zone_id=?,status=?,monthly_cap=?,phone=? WHERE id=?")
      .run(dr.name, dr.basePointOfSaleId, dr.zoneId, dr.status, dr.monthlyHourCap, dr.phone ?? null, id);
  },
  deleteDriver(id: string): void {
    const d = connect();
    d.exec("BEGIN");
    try {
      d.prepare("DELETE FROM shifts WHERE driver_id = ?").run(id);
      d.prepare("DELETE FROM drivers WHERE id = ?").run(id);
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
  },
  exists(table: "zones" | "points_of_sale" | "drivers", id: string): boolean {
    const r = connect().prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
    return !!r;
  },

  // --- Turnos ---
  upsertShift(s: Shift): void {
    connect().prepare(`INSERT INTO shifts (id,driver_id,date,weekday,code,start,"end",hours,kind,pos_id,zone_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(driver_id,date) DO UPDATE SET
        code=excluded.code, weekday=excluded.weekday, start=excluded.start,
        "end"=excluded."end", hours=excluded.hours, kind=excluded.kind,
        pos_id=excluded.pos_id, zone_id=excluded.zone_id`)
      .run(s.id, s.driverId, s.date, s.weekday, s.code, s.start, s.end, s.hours,
        (s as SeedShift).kind ?? shiftKind(s), s.pointOfSaleId ?? null, s.zoneId ?? null);
  },
};
