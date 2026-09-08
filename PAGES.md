# Despliegue GRATIS — GitHub Pages + Supabase

Arquitectura recomendada para este proyecto (misma que `rutas-visita`): el
frontend estático se publica en **GitHub Pages** y **Supabase** (capa gratuita)
guarda los datos y las ediciones, compartidos entre usuarios.

La app detecta el backend por variables de entorno: si están las de Supabase,
usa Supabase; si no, usa la API + SQLite local (modo servidor, para desarrollo).

## Paso 1 — Crear el proyecto Supabase (gratis)

1. Crea un proyecto en <https://supabase.com> (plan Free).
2. En **SQL Editor**, pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql)
   (crea las tablas y las políticas RLS).
3. En **Project Settings → API** copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (solo para sembrar; no lo publiques).

## Paso 2 — Sembrar la malla en Supabase

Una sola vez, desde tu máquina:

```bash
SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
SUPABASE_SERVICE_KEY="TU_service_role_key" \
npm run seed:supabase
```

Carga 30 zonas, 82 puntos de venta, 206 repartidores y ~6.386 turnos.

## Paso 3 — Probarlo en local contra Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="TU_anon_key" \
npm run dev
```

Abre <http://localhost:3000>. Las lecturas y ediciones ya van a Supabase.

## Paso 4 — Publicar en GitHub Pages

1. Sube el repo a GitHub (nombre `flota-horarios`, o ajusta `NEXT_PUBLIC_BASE_PATH`
   en el workflow y `.env`).
2. En **Settings → Secrets and variables → Actions**, crea:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. En **Settings → Pages**, fuente = **GitHub Actions**.
4. `git push` a `main`: el workflow [`deploy-pages.yml`](.github/workflows/deploy-pages.yml)
   construye el sitio estático y lo publica. URL:
   `https://<usuario>.github.io/flota-horarios/`

Build estático manual (para probar): `npm run build:pages` → genera `./out`.

## Seguridad

Las políticas RLS iniciales permiten lectura y escritura **anónimas** para poder
validar rápido — cualquiera con la URL + anon key puede editar. **Antes de un uso
amplio**, activa Supabase Auth y cambia las políticas a `to authenticated`
(igual que se hizo en `rutas-visita`).

## ¿Y el modo servidor (SQLite)?

Sigue disponible para desarrollo o self-hosting (ver [DEPLOY.md](DEPLOY.md)). No
se usa en GitHub Pages. El mismo código sirve para ambos gracias a la capa
`src/lib/data-source.ts`.
