"use client";

import { useState } from "react";
import { LayoutGrid, CalendarRange, CalendarDays, Wand2, Plane, BarChart3, SlidersHorizontal, Clock, Download } from "lucide-react";
import { useFleetStore } from "@/hooks/use-shift-assignment";
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

type TabId = "entidades" | "analitica" | "cobertura" | "calendario" | "asignar" | "vacaciones" | "horarios" | "reglas" | "reportes";

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "entidades", label: "Entidades", icon: LayoutGrid },
  { id: "analitica", label: "Analítica", icon: BarChart3 },
  { id: "cobertura", label: "Cobertura", icon: CalendarRange },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  { id: "asignar", label: "Asignación", icon: Wand2 },
  { id: "vacaciones", label: "Vacaciones", icon: Plane },
  { id: "horarios", label: "Horarios", icon: Clock },
  { id: "reglas", label: "Reglas", icon: SlidersHorizontal },
  { id: "reportes", label: "Reportes", icon: Download },
];

/** Panel dispatcher con navegación por secciones (sin scroll largo). */
export function DashboardTabs() {
  const [tab, setTab] = useState<TabId>("entidades");
  const month = useFleetStore((s) => s.month);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Panel de control · Dispatcher</h1>
          <p className="text-sm text-slate-600">
            Gestión de la flota ·{" "}
            <span className="font-medium text-brand-700">{month.label}</span>
          </p>
        </div>
        <MonthSwitcher />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-52 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
              Secciones
            </p>
            <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    tab === id
                      ? "bg-brand-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-brand-700 hover:shadow-sm",
                  )}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {tab === "entidades" && <EntitiesOverview />}
          {tab === "analitica" && <Analytics />}
          {tab === "cobertura" && <CoverageBoard />}
          {tab === "calendario" && <ScheduleCalendar />}
          {tab === "asignar" && <AssignmentPanel />}
          {tab === "vacaciones" && <VacationPanel />}
          {tab === "horarios" && <ShiftTypesAdmin />}
          {tab === "reglas" && <RulesAdmin />}
          {tab === "reportes" && <ReportsPanel />}
        </div>
      </div>
    </div>
  );
}
