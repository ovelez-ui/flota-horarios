/**
 * Copia el patrón de turnos de un mes origen a un mes destino (mapeo 1:1 por
 * día del mes) y lo siembra en Supabase. Recalcula el día de la semana del
 * mes destino. Pensado como plantilla inicial para planificar el mes nuevo.
 *
 * Fuente = la malla original (src/data/malla.seed.json), mes 2026-07.
 * Destino por defecto = 2026-10 (octubre).
 *
 * Uso:
 *   SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *     node scripts/copy_month_to_supabase.mjs [YYYY-MM-destino]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("Falta SUPABASE_URL y/o key."); process.exit(1); }

const SRC_PREFIX = "2026-07";
const DST_PREFIX = process.argv[2] || "2026-10";
const [dy, dm] = DST_PREFIX.split("-").map(Number);

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, "..", "src", "data", "malla.seed.json"), "utf8"));
const db = createClient(url, key, { auth: { persistSession: false } });

const daysInDst = new Date(dy, dm, 0).getDate();

const rows = [];
for (const s of seed.shifts) {
  if (!s.date.startsWith(SRC_PREFIX)) continue;
  const dd = Number(s.date.slice(8, 10));
  if (dd > daysInDst) continue; // por si el destino tuviera menos días
  const date = `${DST_PREFIX}-${String(dd).padStart(2, "0")}`;
  const weekday = WEEKDAYS[new Date(dy, dm - 1, dd).getDay()];
  rows.push({
    id: `${s.driverId}-${date}`,
    driver_id: s.driverId,
    date,
    weekday,
    code: s.code,
    start_h: s.start,
    end_h: s.end,
    hours: s.hours,
    kind: s.kind,
    pos_id: s.pointOfSaleId ?? null,
    zone_id: s.zoneId ?? null,
  });
}

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const main = async () => {
  console.log(`Copiando patrón ${SRC_PREFIX} → ${DST_PREFIX} (${rows.length} turnos)…`);
  for (const [i, part] of chunk(rows, 500).entries()) {
    const { error } = await db.from("shifts").upsert(part, { onConflict: "id" });
    if (error) { console.error(`Lote ${i + 1}:`, error.message); process.exit(1); }
  }
  console.log("Listo.");
};

main().catch((e) => { console.error(e); process.exit(1); });
