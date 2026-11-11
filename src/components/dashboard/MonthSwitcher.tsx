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
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-line p-0.5", className)} role="group" aria-label="Mes de planificación">
      <CalendarRange size={15} className="ml-2 mr-1 shrink-0 text-muted" aria-hidden />
      {MONTHS.map((m) => {
        const active = m.prefix === month.prefix;
        return (
          <button
            key={m.prefix}
            type="button"
            disabled={loading}
            onClick={() => void setMonth(m.prefix)}
            aria-pressed={active}
            className={cn(
              "min-h-[36px] rounded-full px-3 text-xs font-bold disabled:opacity-60",
              active ? "bg-ink text-paper" : "text-muted hover:text-ink",
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
