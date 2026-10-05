"use client";

import { Building2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

/** Selector de varias tiendas (puntos de venta). `[]` = todas. */
export function StoreMultiSelect({
  options,
  selected,
  onChange,
  allLabel = "Todas las tiendas",
  className,
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  allLabel?: string;
  className?: string;
}) {
  const label =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.id === selected[0])?.name ?? "1 tienda")
        : `${selected.length} tiendas`;

  return (
    <details className={cn("relative", className)}>
      <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:border-slate-400 [&::-webkit-details-marker]:hidden">
        <Building2 size={14} className="shrink-0 text-slate-400" />
        <span className="max-w-[12rem] truncate">{label}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </summary>
      <div className="absolute right-0 z-30 mt-1 max-h-72 w-72 overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-pop">
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <Box checked={selected.length === 0} /> {allLabel}
        </button>
        <div className="my-1 h-px bg-slate-100" />
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(on ? selected.filter((x) => x !== o.id) : [...selected, o.id])}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              <Box checked={on} /> <span className="truncate">{o.name}</span>
            </button>
          );
        })}
        {options.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400">Sin tiendas.</p>}
      </div>
    </details>
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded border",
        checked ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300",
      )}
    >
      {checked && <Check size={11} />}
    </span>
  );
}
