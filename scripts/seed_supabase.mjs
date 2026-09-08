/**
 * Siembra las tablas de Supabase con la malla real (src/data/malla.seed.json).
 *
 * Requiere (por env):
 *   SUPABASE_URL           = https://<proj>.supabase.co
 *   SUPABASE_SERVICE_KEY   = service_role key (recomendado; bypassa RLS)
 *                            — o el anon key si las políticas permiten insert.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed_supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Falta SUPABASE_URL y/o SUPABASE_SERVICE_KEY.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, "..", "src", "data", "malla.seed.json"), "utf8"));
const db = createClient(url, key, { auth: { persistSession: false } });

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function upsert(table, rows, size = 500) {
  for (const [i, part] of chunk(rows, size).entries()) {
    const { error } = await db.from(table).upsert(part, { onConflict: "id" });
    if (error) {
      console.error(`Error en ${table} (lote ${i + 1}):`, error.message);
      process.exit(1);
    }
  }
  console.log(`  ${table}: ${rows.length} filas`);
}

const main = async () => {
  console.log("Sembrando Supabase…");
  await upsert("zones", seed.zones.map((z) => ({ id: z.id, code: z.code, name: z.name, city: z.city, color: z.color })));
  await upsert("points_of_sale", seed.pointsOfSale.map((p) => ({
    id: p.id, name: p.name, zone_id: p.zoneId, address: p.address ?? null, min_drivers: p.minDriversPerShift,
  })));
  await upsert("drivers", seed.drivers.map((d) => ({
    id: d.id, name: d.name, base_pos_id: d.basePointOfSaleId, zone_id: d.zoneId,
    status: d.status, monthly_cap: d.monthlyHourCap, phone: d.phone ?? null,
  })));
  await upsert("shifts", seed.shifts.map((s) => ({
    id: s.id, driver_id: s.driverId, date: s.date, weekday: s.weekday, code: s.code,
    start_h: s.start, end_h: s.end, hours: s.hours, kind: s.kind,
    pos_id: s.pointOfSaleId ?? null, zone_id: s.zoneId ?? null,
  })));
  console.log("Listo.");
};

main().catch((e) => { console.error(e); process.exit(1); });
