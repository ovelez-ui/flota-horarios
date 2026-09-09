"use client";

import { CalendarRange } from "lucide-react";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { MONTHS } from "@/lib/month";
import { cn } from "@/lib/utils";

/** Selector del mes de planificación activo (Oct/Nov/Dic). */
export function MonthSwitcher({ className }: { className?: string }) {
  const month = useFleetStore((s) => s.month);
  const setMonth = useFleetStore((s) => s.setMonth);
  const loading = useFleetStore((s) => s.loading);

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 ring-1 ring-inset ring-slate-200", className)}>
      <CalendarRange size={15} className="ml-1 mr-0.5 shrink-0 text-slate-400" />
      {MONTHS.map((m) => {
        const active = m.prefix === month.prefix;
        return (
          <button
            key={m.prefix}
            type="button"
            disabled={loading}
            onClick={() => void setMonth(m.prefix)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-60",
              active
                ? "bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-brand-700",
            )}
            title={`Planificar ${m.label}`}
          >
            {m.label.replace(" 2026", "")}
          </button>
        );
      })}
    </div>
  );
}
