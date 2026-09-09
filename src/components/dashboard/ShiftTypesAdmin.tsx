"use client";

import { useMemo, useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import type { Shift } from "@/types";
import { Button, Card, CardContent, Field, Input } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import {
  parseShiftCode,
  distinctWorkCodes,
  isRestCode,
  SPECIAL_CODE_LIST,
  SPECIAL_CODES,
} from "@/lib/shift-catalog";
import { KIND_LABEL } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function ShiftChip({ code, cellClass, onRemove }: { code: string; cellClass: string; onRemove?: () => void }) {
  let hint = "";
  try {
    const d = parseShiftCode(code);
    if (!isRestCode(code)) hint = `${d.hours}h · ${KIND_LABEL[d.kind]}`;
  } catch {
    /* ignora */
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold", cellClass)}>
      {code}
      {hint && <span className="font-normal opacity-70">· {hint}</span>}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 rounded p-0.5 hover:bg-black/10" aria-label="Quitar">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

/** Administrador de horarios: catálogo de tipos de turno. */
export function ShiftTypesAdmin() {
  const shifts = useFleetStore((s) => s.shifts);
  const customShiftCodes = useFleetStore((s) => s.customShiftCodes);
  const addShiftCode = useFleetStore((s) => s.addShiftCode);
  const removeShiftCode = useFleetStore((s) => s.removeShiftCode);

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const fromMalla = useMemo(() => distinctWorkCodes(shifts), [shifts]);

  // Vista previa del código en edición.
  const preview = useMemo(() => {
    const v = value.trim();
    if (!v) return null;
    try {
      const d = parseShiftCode(v);
      if (isRestCode(d.code)) return { error: "Es una novedad, no un turno." };
      return { code: d.code, text: `${d.hours}h · ${KIND_LABEL[d.kind]} (${d.start}:00 a ${(d.end ?? 0) % 24}:00)` };
    } catch {
      return { error: "Formato inválido. Ej: 10-18, 22-06, 13:40-21." };
    }
  }, [value]);

  function add() {
    const r = addShiftCode(value);
    if (r.ok) {
      setOk(`Turno ${r.code} agregado.`);
      setError(null);
      setValue("");
    } else {
      setError(r.error ?? "No se pudo agregar.");
      setOk(null);
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
          <Clock size={18} className="text-brand-600" /> Administrador de horarios
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Define turnos especiales que se sumarán a la paleta y a los selectores de asignación.
          Se guardan en este navegador.
        </p>

        {/* Alta de turno */}
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-end">
          <Field label="Nuevo turno (hora inicio - fin)" hint="Ej: 10-18 · 22-06 (nocturno) · 07-16* · 13:40-21">
            <Input
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); setOk(null); }}
              placeholder="10-18"
              onKeyDown={(e) => e.key === "Enter" && preview && !("error" in preview) && add()}
            />
          </Field>
          <Button onClick={add} disabled={!preview || "error" in preview} className="sm:mb-0.5">
            <Plus size={16} /> Agregar
          </Button>
        </div>
        {preview && "text" in preview && !error && (
          <p className="mt-2 text-xs text-slate-500">Vista previa: <strong className="text-slate-700">{preview.code}</strong> — {preview.text}</p>
        )}
        {preview && "error" in preview && <p className="mt-2 text-xs text-amber-600">{preview.error}</p>}
        {error && <p className="mt-2 text-sm text-accent">{error}</p>}
        {ok && <p className="mt-2 text-sm text-emerald-600">{ok}</p>}

        {/* Personalizados */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Turnos especiales (personalizados)
          </p>
          {customShiftCodes.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no has agregado turnos especiales.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {customShiftCodes.map((c) => (
                <ShiftChip key={c} code={c} cellClass="bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100" onRemove={() => removeShiftCode(c)} />
              ))}
            </div>
          )}
        </div>

        {/* De la malla */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Turnos de la malla ({fromMalla.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {fromMalla.map((c) => (
              <ShiftChip key={c} code={c} cellClass="bg-slate-100 text-slate-600" />
            ))}
          </div>
        </div>

        {/* Novedades (fijas) */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Novedades (fijas)
          </p>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_CODE_LIST.map((c) => (
              <span key={c} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold", SPECIAL_CODES[c]!.cell)}>
                {SPECIAL_CODES[c]!.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
