# Flota Horarios · Pasteur

Plataforma web escalable para **gestión y visualización de horarios** de una flota de repartidores.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript estricto**
- **Tailwind CSS** para estilos + **Lucide React** para iconos
- **Zustand** para el estado de la flota (motor de asignación)
- Kit de UI propio estilo Shadcn (`src/components/ui`)

## Arquitectura

```
src/
├── types/                 # Modelo de dominio (Driver, Zone, PointOfSale, Shift, reglas)
├── lib/
│   ├── shift-catalog.ts   # Catálogo de turnos + parser de códigos ("6-13", "DESC"…)
│   ├── shift-rules.ts     # Motor PURO de validación de asignaciones
│   ├── date-utils.ts      # Utilidades de fecha (ISO local, malla del mes)
│   ├── mock-data.ts       # Zonas, puntos de venta, repartidores y malla mensual
│   └── utils.ts           # cn() y helpers
├── hooks/
│   └── use-shift-assignment.ts  # Store Zustand: preview() + assign() validados
├── components/
│   ├── ui/                # Card, Badge, Button, Input, Select, Table
│   ├── driver/            # Vista del repartidor (consulta por cédula)
│   └── dashboard/         # Panel dispatcher (entidades, cobertura, asignación)
└── app/
    ├── repartidor/        # Módulo A — consulta de turnos
    └── dashboard/         # Módulo B — gestión de flota
```

## Módulos

- **A. Vista del repartidor** (`/repartidor`): consulta por cédula, tarjeta de información
  (nombre, punto base, zona, horas del mes, días laborados) y tabla mensual con código de
  colores por franja / descanso.
- **B. Dispatcher** (`/dashboard`): KPIs + tarjetas de zonas y puntos de venta, tablero de
  **cobertura diaria** (detecta huecos operativos bajo el mínimo) y **panel de asignación**
  con validación en vivo del motor de reglas.

## Motor de reglas (`src/lib/shift-rules.ts`)

`validateAssignment()` es una función pura que valida un turno candidato contra:

1. **OVERLAP** — choque de horarios el mismo día (incl. cruce de medianoche).
2. **MONTHLY_CAP** — tope de horas mensuales del repartidor.
3. **WEEKLY_REST** — mínimo de días de descanso por semana.
4. **MIN_REST_BETWEEN** — descanso mínimo entre turnos consecutivos.
5. **MAX_CONSECUTIVE** — máximo de días seguidos trabajados.
6. **ZONE_MISMATCH** — asignación fuera de la zona base.
7. **DRIVER_UNAVAILABLE** — repartidor en vacaciones/incapacidad/inactivo.

Los `error` bloquean la asignación; los `warning` la permiten pero se reportan.

## Backend

- **API REST** en `src/app/api/*` (Route Handlers, runtime Node): `bootstrap`,
  `zones`, `points-of-sale`, `drivers`, `shifts` (+`/bulk` para rangos), `health`.
- **Base de datos:** SQLite nativo de Node (`node:sqlite`, sin dependencias) en
  `src/lib/server/db.ts`. Archivo en `${DATA_DIR:-.data}/fleet.db`, **sembrado**
  la primera vez desde `src/data/malla.seed.json` (malla real de Julio 2026).
- El front (`useFleetStore`) es un **caché hidratado** desde `/api/bootstrap`;
  las mutaciones van por la API con validación en el servidor.

## Correr en desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

Cédulas de prueba visibles en la vista del repartidor.

## Producción

Requiere **Node ≥ 24** (SQLite nativo sin flags) y un **servidor de larga
duración** con un volumen persistente para `fleet.db`. No es apto para serverless.

```bash
npm ci
npm run build
DATA_DIR=/ruta/persistente NODE_ENV=production npm start
```

O con Docker (`docker build -t flota-horarios . && docker run -p 3000:3000 -v flota_data:/data flota-horarios`).

Detalles completos, backup, systemd y checklist en **[DEPLOY.md](DEPLOY.md)**.

> ⚠️ **Sin autenticación aún** — desplegar detrás de VPN/SSO o un proxy con auth.

## Regenerar la malla base

```bash
npm run seed       # lee ../malla_horaria.xlsx → src/data/malla.seed.json (requiere Python + openpyxl)
```

Solo afecta a una BD vacía; una `fleet.db` ya sembrada no se modifica.
