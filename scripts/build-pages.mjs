/**
 * Build estático para GitHub Pages.
 *
 * `output: 'export'` no admite Route Handlers dinámicos (las rutas /api/*),
 * que además no se usan en modo Supabase. Este script las aparta
 * temporalmente, corre el build de exportación y las restaura.
 *
 * Uso (con las variables NEXT_PUBLIC_SUPABASE_* y NEXT_PUBLIC_BASE_PATH):
 *   node scripts/build-pages.mjs
 */
import { existsSync, renameSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "src", "app", "api");
const apiHidden = join(root, "src", "app", "_api_disabled");

function restore() {
  if (existsSync(apiHidden)) renameSync(apiHidden, apiDir);
}

try {
  if (existsSync(apiDir)) renameSync(apiDir, apiHidden);

  execSync("npx --no-install next build", {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
  });

  // .nojekyll para que GitHub Pages sirva las carpetas _next.
  writeFileSync(join(root, "out", ".nojekyll"), "");
  console.log("\nBuild estático listo en ./out");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  restore(); // siempre devuelve src/app/api a su sitio.
}
