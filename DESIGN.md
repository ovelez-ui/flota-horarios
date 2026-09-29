# Sistema de diseño · Flota Horarios

Guía para mantener la coherencia visual de la plataforma. El lenguaje visual está
inspirado en referentes modernos de Data/AI (tipo iData), conservando la
**identidad Pasteur** (azul marino de marca) y soportando **modo claro y oscuro**.

> Regla de oro: reutiliza los componentes y tokens de este documento. No introduzcas
> colores/estilos "sueltos"; si falta algo, agrégalo al kit (`src/components/ui/index.tsx`)
> o a los tokens (`tailwind.config.ts` / `globals.css`).

---

## 1. Tokens

### Tipografía
- **Fuente:** `Manrope` (fallback `Poppins`, luego system). Importada en `src/app/globals.css`.
- Config: `tailwind.config.ts → theme.extend.fontFamily.sans`.
- **Jerarquía:**
  - **Títulos de página (H1):** grandes y de **peso ligero** → `text-2xl/3xl` (o `4xl/5xl` en el hero) + `font-light` + `tracking-tight`.
  - **Títulos de sección (H2):** `font-semibold text-slate-900`.
  - **Cuerpo:** `text-slate-600` / `text-slate-500`.
  - Números destacados (KPIs): `text-3xl font-light tracking-tight`.

### Color (marca Pasteur)
Definido en `tailwind.config.ts`:
- `brand` (escala 50–950). Base `brand.700 = #084878`. Acentos claros para oscuro: `brand.300 #7fb0de`.
- `accent` (rojo Pasteur) `#e2231a`, `accent.soft #fdecea`, `accent.600 #c81810`.
- Grises: escala `slate` de Tailwind (texto/estructura).

### Sombras (`boxShadow`)
- `shadow-card` — elevación base de tarjetas.
- `shadow-soft` — hover de tarjetas.
- `shadow-pop` — énfasis/CTA e ítem activo.
- `shadow-glow` — chips de ícono con degradado (brillo de marca).

### Radios
- Tarjetas/paneles: `rounded-2xl`.
- Chips de ícono: `rounded-xl` / `rounded-2xl`.
- **Botones: `rounded-full` (pill).**

---

## 2. Temas claro/oscuro

- Activado por **clase** (`darkMode: "class"` en `tailwind.config.ts`); la clase `dark` va en `<html>`.
- **Interruptor:** `src/components/ThemeToggle.tsx` (sol/luna). Persiste en `localStorage` (`flota-theme`) y respeta `prefers-color-scheme`.
- **Sin parpadeo:** un script inline en `src/app/layout.tsx` (`THEME_INIT`) aplica la clase antes de pintar. `<html>` lleva `suppressHydrationWarning`.
- **Oscuro centralizado:** en `globals.css`, bajo `.dark`, se **reasignan las utilidades de color más usadas** (superficies `bg-white/bg-slate-*`, texto `text-slate-*`, bordes, `glass`, hovers, scrollbars). Así casi toda la app se tematiza sin tocar cada componente.
  - Fondo oscuro inmersivo: navy `#08111f` + glows de marca.
  - Superficie glass oscura: `rgb(12 21 37 / .72)`.
- **Al agregar un color nuevo** poco común, revisa si necesita su reasignación en el bloque `.dark` de `globals.css`. Los acentos de color (emerald/violet/amber…) se dejan tal cual a propósito.

---

## 3. Componentes (`src/components/ui/index.tsx`)

| Componente | Uso |
|---|---|
| `Card` / `CardContent` | Panel base **glass** (`rounded-2xl`, borde sutil, `shadow-card`, hover `shadow-soft`). Incluye `group` para animar hijos al hover. |
| `Button` | Pill. Variantes: `primary` (degradado marca), `outline`, `ghost`, **`glass`** (translúcida, para CTAs sobre fondos ricos). |
| `Eyebrow` | Micro-etiqueta en MAYÚSCULAS con tracking (el "sello" del estilo). Color marca, adaptado a oscuro. |
| `IconChip` | Ícono en chip. `variant="gradient"` (marca + glow) o `"soft"` (tintado). |
| `Badge` | Etiquetas de estado (`success/warning/danger/muted/default`). |
| `Input` / `Select` / `Field` | Controles de formulario coherentes. |
| `Modal` | Diálogo glass con `backdrop-blur` y entrada `fade-rise`. |
| `ReadOnlyBanner` | Aviso "solo lectura" (perfil supervisor). |

---

## 4. Patrones de composición

### Encabezado de página
```tsx
<Eyebrow>Gestión operativa</Eyebrow>
<h1 className="mt-1.5 text-2xl font-light tracking-tight text-slate-900 sm:text-3xl">
  Panel de control
</h1>
<p className="mt-1 text-sm text-slate-500">Subtítulo · contexto</p>
```

### Encabezado de sección (dentro de una Card)
```tsx
<CardContent className="pt-5">
  <Eyebrow className="mb-2">Planificación</Eyebrow>
  <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
    <IconChip icon={<CalendarDays size={16} />} /> Título de la sección
  </h2>
  <p className="mb-4 text-sm text-slate-500">Descripción.</p>
  {/* ...contenido... */}
</CardContent>
```

### Bloque de estadística (StatBlock)
Número grande y ligero + caption en mayúsculas:
```tsx
<p className="text-3xl font-light leading-none tracking-tight text-slate-900">{value}</p>
<p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
```

### CTA / tarjeta de acceso
Card con hover lift (`hover:-translate-y-0.5 hover:shadow-pop`), chip de ícono, y flecha que se anima con `group-hover`.

---

## 5. Movimiento

- **Transiciones** por defecto en elementos interactivos (definidas en `globals.css`).
- **Entrada de sección:** `animate-fade-in` (solo opacidad, seguro con columnas `sticky`) + `key={tab}` para reanimar al cambiar de pestaña (ver `DashboardTabs.tsx` y `EntityAdmin.tsx`).
- `animate-fade-rise` (opacidad + leve desplazamiento) para modales/tarjetas puntuales.
- Todo respeta `@media (prefers-reduced-motion: reduce)`.

---

## 6. Accesibilidad

- Objetivo **WCAG AA** (contraste ≥ 4.5 para texto normal).
- Contrastes verificados en oscuro (sobre superficie glass): cuerpo ~14.7, títulos ~17, eyebrow ~7.9, `slate-500` ~6.9, `slate-600` ~8.8, `slate-400` ~5.3 (ajustado).
- Al agregar texto tenue en oscuro, usa como mínimo el tono de `slate-400` reasignado; evita grises más oscuros para texto pequeño.
- Estados de foco visibles en botones/inputs (anillo de marca). No quitar `focus:ring`.

---

## 7. Roles y superficies

- **admin:** ve y edita todo (Dashboard + Admin de entidades).
- **supervisor:** ve todo el Dashboard en **solo lectura** (secciones de edición envueltas en `fieldset disabled` + `ReadOnlyBanner`; calendario en modo consulta).
- **tienda:** Calendario + Consulta Repartidor (solo lectura).

---

## 8. Despliegue

La app es un SPA cliente sobre **Supabase** (no requiere servidor). Dos destinos:

### GitHub Pages (actual)
- Build estático: `npm run build:pages` → carpeta `out/` (script `scripts/build-pages.mjs`, aparta `src/app/api` durante el export).
- CI: `.github/workflows/deploy-pages.yml` (push a `main` → deploy). Sirve bajo `/<repo>` vía `NEXT_PUBLIC_BASE_PATH`.
- URL: https://ovelez-ui.github.io/flota-horarios/

### Vercel (opcional, dominio raíz)
- `vercel.json` fija `buildCommand: node scripts/build-pages.mjs`, `outputDirectory: out`, `framework: null` (sitio estático en la **raíz**, sin `basePath`).
- Importar el repo en vercel.com/new + variables de entorno (abajo). **No** definir `NEXT_PUBLIC_BASE_PATH`.

### Variables de entorno (build-time, se incrustan en el cliente)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> En Vercel/Pages, agregar/editar estas variables requiere **redeploy** (se inyectan al compilar).
> Si faltan, la app muestra un aviso claro (`assertBootstrap` en `use-shift-assignment.ts`).

### Meses de planificación
- Configurables en `src/lib/month.ts` (`MONTHS`). `DEFAULT_MONTH` es el que abre por defecto.

---

## 9. Checklist para una pantalla nueva

- [ ] Encabezado con `Eyebrow` + título ligero (`font-light tracking-tight`).
- [ ] Contenido en `Card`/`CardContent` (glass); sin colores sueltos.
- [ ] Botones con `Button` (pill); CTA con `variant="primary"` o `"glass"`.
- [ ] Íconos de sección con `IconChip`.
- [ ] Verificar en **claro y oscuro** y en **móvil** (≥ 375px, sin scroll horizontal).
- [ ] Contraste AA del texto tenue.
- [ ] Si es sección con pestañas, `key={tab}` + `animate-fade-in`.
