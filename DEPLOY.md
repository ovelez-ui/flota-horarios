# Despliegue — Flota Horarios

Guía para llevar la plataforma a producción y empezar a validarla.

## 1. Requisitos

- **Node.js ≥ 24** (recomendado). El backend usa el SQLite nativo de Node
  (`node:sqlite`), disponible **sin flags** en Node 24. En Node 22.5–23 hay que
  arrancar con `NODE_OPTIONS=--experimental-sqlite`.
- Un **servidor de larga duración** (VM, contenedor o servidor propio). **No** es
  apto para serverless (Vercel/Lambda): la base de datos es un archivo en disco
  que debe persistir y ser escribible.
- Un **volumen/carpeta persistente** para `fleet.db` (variable `DATA_DIR`).

## 2. Variables de entorno

| Variable | Descripción | Defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `DATA_DIR` | Carpeta persistente de la base de datos SQLite | `<cwd>/.data` |
| `NODE_ENV` | Entorno | — (fijar `production`) |

Copia `.env.example` a `.env` y ajusta.

## 3. La base de datos

- Al **primer arranque**, si la tabla `zones` está vacía, se **siembra**
  automáticamente desde la malla (`src/data/malla.seed.json`): 30 zonas, 82
  puntos de venta, 206 repartidores y ~6.386 turnos.
- A partir de ahí, **`fleet.db` es la fuente de verdad**. Toda edición
  (asignaciones, novedades, CRUD) se guarda ahí.
- **Backup:** copia periódica del archivo `${DATA_DIR}/fleet.db` (más los
  archivos `-wal`/`-shm` si existen). Para un backup consistente, hazlo con el
  servicio detenido o usa `sqlite3 fleet.db ".backup"`.
- **Re-sembrar / reiniciar datos:** detén el servicio, borra `fleet.db` (y
  `-wal`/`-shm`) y vuelve a arrancar.
- **Actualizar la malla base:** regenera el seed con `npm run seed`
  (necesita Python + `openpyxl` y el `malla_horaria.xlsx` en la carpeta padre).
  Nota: el seed solo aplica a una BD vacía; una BD ya sembrada no se toca.

## 4. Opción A — Arranque directo (VM / servidor propio)

```bash
npm ci
npm run build
DATA_DIR=/ruta/persistente/datos PORT=3000 NODE_ENV=production npm start
```

Con Node 22.x añade el flag:

```bash
NODE_OPTIONS=--experimental-sqlite DATA_DIR=/ruta/datos npm start
```

Mantén el proceso vivo con un supervisor (systemd, pm2, etc.). Ejemplo systemd:

```ini
[Service]
WorkingDirectory=/opt/flota-horarios
Environment=NODE_ENV=production
Environment=DATA_DIR=/var/lib/flota-horarios
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
```

(La build genera `.next/standalone/server.js`; copia también `.next/static` y
`public` junto a él, o usa `npm start`.)

## 5. Opción B — Docker

```bash
docker build -t flota-horarios .
docker run -d --name flota-horarios \
  -p 3000:3000 \
  -v flota_data:/data \
  flota-horarios
```

El volumen `flota_data` conserva `fleet.db` entre despliegues. La imagen usa la
salida *standalone* de Next y corre como usuario no-root. Incluye `HEALTHCHECK`
contra `/api/health`.

## 6. Verificación post-despliegue

```bash
curl http://localhost:3000/api/health      # {"status":"ok","db":"up","counts":{...}}
curl http://localhost:3000/api/bootstrap   # dataset completo
```

En el navegador:

- `/repartidor` — consulta por cédula (tarjeta + novedades + malla).
- `/dashboard` — entidades, cobertura, calendario (semanas), asignación, vacaciones.
- `/admin` — CRUD de zonas, puntos de venta y repartidores.

## 7. Pendiente antes de exponer a internet

- **Autenticación:** hoy no hay login. Despliega detrás de VPN/SSO o un proxy con
  autenticación, o añade auth antes de exponerlo públicamente.
- **HTTPS:** termina TLS en un proxy inverso (Nginx/Traefik/Caddy).
- **Backups automáticos** de `fleet.db`.
- **Escala:** el diseño es de una sola instancia (BD en archivo local). Para
  varias instancias, migrar el repositorio (`src/lib/server/db.ts`) a Postgres.
