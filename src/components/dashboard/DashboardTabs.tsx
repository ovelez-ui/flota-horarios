"use client";

import { useState, type ReactNode } from "react";
import {
  LayoutGrid, CalendarRange, CalendarDays, Wand2, Plane, BarChart3,
  SlidersHorizontal, Clock, Download, Eye, LayoutDashboard,
} from "lucide-react";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { ReadOnlyBanner, IconChip } from "@/components/ui";
import { MonthSwitcher } from "./MonthSwitcher";
import { cn } from "@/lib/utils";
import { EntitiesOverview } from "./EntitiesOverview";
import { Analytics } from "./Analytics";
import { CoverageBoard } from "./CoverageBoard";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { AssignmentPanel } from "./AssignmentPanel";
import { VacationPanel } from "./VacationPanel";
import { RulesAdmin } from "./RulesAdmin";
import { ShiftTypesAdmin } from "./ShiftTypesAdmin";
import { ReportsPanel } from "./ReportsPanel";

type TabId =
  | "entidades" | "analitica" | "cobertura" | "calendario"
  | "asignar" | "vacaciones" | "horarios" | "reglas" | "reportes";

type NavItem = { id: TabId; label: string; icon: typeof LayoutGrid };

// Secciones agrupadas para una navegación más clara y ordenada.
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "General",
    items: [
      { id: "entidades", label: "Entidades", icon: LayoutGrid },
      { id: "analitica", label: "Analítica", icon: BarChart3 },
      { id: "cobertura", label: "Cobertura", icon: CalendarRange },
    ],
  },
  {
    label: "Planificación",
    items: [
      { id: "calendario", label: "Calendario", icon: CalendarDays },
      { id: "asignar", label: "Asignación", icon: Wand2 },
      { id: "vacaciones", label: "Vacaciones", icon: Plane },
    ],
  },
  {
    label: "Configuración",
    items: [
      { id: "horarios", label: "Horarios", icon: Clock },
      { id: "reglas", label: "Reglas", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Informes",
    items: [{ id: "reportes", label: "Reportes", icon: Download }],
  },
];

const TABS: NavItem[] = GROUPS.flatMap((g) => g.items);

/**
 * Envuelve una sección de edición. En solo lectura (supervisor) muestra el
 * aviso y deshabilita todos los campos/botones con un `fieldset disabled`.
 */
function Section({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  if (!readOnly) return <>{children}</>;
  return (
    <div>
      <ReadOnlyBanner />
      <fieldset disabled className="m-0 min-w-0 border-0 p-0">
        {children}
      </fieldset>
    </div>
  );
}

/** Botón de navegación de sección. El estado activo destaca con degradado + glow. */
function NavButton({
  active, icon: Icon, label, onClick,
}: { active: boolean; icon: typeof LayoutGrid; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-pop"
          : "text-slate-600 hover:bg-white hover:text-brand-700 hover:shadow-sm",
      )}
    >
      <Icon
        size={16}
        className={cn("shrink-0 transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-brand-600")}
      />
      {label}
    </button>
  );
}

/**
 * Panel dispatcher con navegación por secciones.
 * `readOnly` (supervisores): muestra TODAS las secciones pero deshabilitadas
 * (calendario en consulta; formularios y reglas bloqueados, sin guardar).
 */
export function DashboardTabs({ readOnly = false }: { readOnly?: boolean }) {
  const [tab, setTab] = useState<TabId>("entidades");
  const month = useFleetStore((s) => s.month);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
        <div className="flex items-center gap-3">
          <IconChip icon={<LayoutDashboard size={18} />} className="h-11 w-11" />
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Panel de control
              {readOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                  <Eye size={12} /> Solo lectura
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {readOnly ? "Visualización" : "Gestión"} de la flota de repartidores ·{" "}
              <span className="font-semibold text-brand-700">{month.label}</span>
            </p>
          </div>
        </div>
        <MonthSwitcher />
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            {/* Móvil: navegación plana con scroll horizontal */}
            <nav className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
              {TABS.map((t) => (
                <NavButton key={t.id} active={tab === t.id} icon={t.icon} label={t.label} onClick={() => setTab(t.id)} />
              ))}
            </nav>

            {/* Escritorio: navegación agrupada, tipo tarjeta */}
            <div className="glass hidden rounded-2xl border border-white/60 p-3 shadow-card ring-1 ring-slate-900/[0.03] lg:block">
              {GROUPS.map((g) => (
                <div key={g.label} className="mb-4 last:mb-0">
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {g.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {g.items.map((t) => (
                      <NavButton key={t.id} active={tab === t.id} icon={t.icon} label={t.label} onClick={() => setTab(t.id)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {tab === "entidades" && <EntitiesOverview />}
          {tab === "analitica" && <Analytics />}
          {tab === "cobertura" && <CoverageBoard />}
          {tab === "calendario" && <ScheduleCalendar readOnly={readOnly} />}
          {tab === "asignar" && <Section readOnly={readOnly}><AssignmentPanel /></Section>}
          {tab === "vacaciones" && <Section readOnly={readOnly}><VacationPanel /></Section>}
          {tab === "horarios" && <Section readOnly={readOnly}><ShiftTypesAdmin /></Section>}
          {tab === "reglas" && <Section readOnly={readOnly}><RulesAdmin /></Section>}
          {tab === "reportes" && <ReportsPanel />}
        </div>
      </div>
    </div>
  );
}
