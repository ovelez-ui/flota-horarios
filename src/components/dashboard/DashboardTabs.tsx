"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, Search } from "lucide-react";
import { ReadOnlyBanner } from "@/components/ui";
import { PanelErrorBoundary } from "@/components/PanelErrorBoundary";
import { MonthSwitcher } from "./MonthSwitcher";
import { CommandPalette } from "./CommandPalette";
import { EntitiesOverview } from "./EntitiesOverview";
import { Analytics } from "./Analytics";
import { CoverageBoard } from "./CoverageBoard";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { AssignmentPanel } from "./AssignmentPanel";
import { VacationPanel } from "./VacationPanel";
import { RulesAdmin } from "./RulesAdmin";
import { ShiftTypesAdmin } from "./ShiftTypesAdmin";
import { ReportsPanel } from "./ReportsPanel";
import { ControlTower } from "./ControlTower";
import { EquipmentInventory } from "./EquipmentInventory";
import { DriversSheet } from "./DriversSheet";

type TabId =
  | "torre" | "inventario" | "entidades" | "repartidores" | "analitica" | "cobertura" | "calendario"
  | "asignar" | "vacaciones" | "horarios" | "reglas" | "reportes";

type NavItem = { id: TabId; label: string };

// Secciones agrupadas para una navegación más clara y ordenada.
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operación",
    items: [
      { id: "torre", label: "Torre de Control" },
      { id: "inventario", label: "Inventario" },
    ],
  },
  {
    label: "General",
    items: [
      { id: "entidades", label: "Entidades" },
      { id: "repartidores", label: "Repartidores" },
      { id: "analitica", label: "Analítica" },
      { id: "cobertura", label: "Cobertura" },
    ],
  },
  {
    label: "Planificación",
    items: [
      { id: "calendario", label: "Calendario" },
      { id: "asignar", label: "Asignación" },
      { id: "vacaciones", label: "Vacaciones" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { id: "horarios", label: "Horarios" },
      { id: "reglas", label: "Reglas" },
    ],
  },
  {
    label: "Informes",
    items: [{ id: "reportes", label: "Reportes" }],
  },
];

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

/**
 * Panel dispatcher: 5 grupos + secciones del grupo activo + paleta (Ctrl K).
 * `readOnly` (supervisores): muestra TODAS las secciones pero deshabilitadas
 * (calendario en consulta; formularios y reglas bloqueados, sin guardar).
 */
export function DashboardTabs({ readOnly = false }: { readOnly?: boolean }) {
  const [tab, setTab] = useState<TabId>("torre");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const activeGroup = GROUPS.find((g) => g.items.some((t) => t.id === tab))!;

  // Ctrl/⌘ K abre o cierra la paleta desde cualquier parte del panel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      <h1 className="sr-only">Panel de control{readOnly ? " (solo lectura)" : ""}</h1>

      {/* Sub-barra: 5 grupos arriba; debajo, solo las secciones del grupo activo. */}
      <div className="ed-subbar -mx-4 -mt-6 mb-6 px-4 2xl:-mx-6 2xl:px-6">
        <div className="flex items-center gap-3">
          <nav className="flex min-w-0 flex-1 overflow-x-auto" aria-label="Grupos de secciones">
            {GROUPS.map((g) => (
              <button
                key={g.label}
                type="button"
                className="ed-tab"
                aria-current={g === activeGroup ? "true" : undefined}
                onClick={() => setTab(g.items[0]!.id)}
              >
                {g.label}
              </button>
            ))}
          </nav>
          {/* Aquí la Torre de Control proyecta su cifra cuando el hero sale de pantalla. */}
          <span id="dash-mini" className="hidden lg:block" />
          {readOnly && (
            <span className="ed-chip hidden sm:inline-flex">
              <Eye size={12} className="mr-1" aria-hidden /> Solo lectura
            </span>
          )}
          <button
            type="button"
            className="ed-tool"
            onClick={() => setPaletteOpen(true)}
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            aria-label="Ir a una sección"
          >
            <Search size={16} aria-hidden />
            <span className="hidden sm:inline">Ir a…</span>
            <kbd className="hidden lg:inline" aria-hidden>Ctrl K</kbd>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-line-soft py-1">
          <nav className="flex min-w-0 gap-5 overflow-x-auto" aria-label={`Secciones de ${activeGroup.label}`}>
            {activeGroup.items.map((t) => (
              <button
                key={t.id}
                type="button"
                className="ed-subtab"
                aria-current={t.id === tab ? "page" : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <MonthSwitcher />
        </div>
      </div>

      <CommandPalette groups={GROUPS} open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={setTab} />

      <div key={tab} className="min-w-0 animate-fade-in">
        <PanelErrorBoundary>
          {tab === "torre" && <ControlTower onOpenCalendar={() => setTab("calendario")} />}
          {tab === "inventario" && <EquipmentInventory />}
          {tab === "entidades" && <EntitiesOverview />}
          {tab === "repartidores" && <DriversSheet />}
          {tab === "analitica" && <Analytics />}
          {tab === "cobertura" && <CoverageBoard />}
          {tab === "calendario" && <ScheduleCalendar readOnly={readOnly} />}
          {tab === "asignar" && <Section readOnly={readOnly}><AssignmentPanel /></Section>}
          {tab === "vacaciones" && <Section readOnly={readOnly}><VacationPanel /></Section>}
          {tab === "horarios" && <Section readOnly={readOnly}><ShiftTypesAdmin /></Section>}
          {tab === "reglas" && <Section readOnly={readOnly}><RulesAdmin /></Section>}
          {tab === "reportes" && <ReportsPanel />}
        </PanelErrorBoundary>
      </div>
    </div>
  );
}
