"use client";

import { SlidersHorizontal, RotateCcw, CheckCircle2 } from "lucide-react";
import { DEFAULT_RULES } from "@/types";
import { Button, Card, CardContent, Field, Input } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";

/** Administrador del motor de reglas de asignación. */
export function RulesAdmin() {
  const rules = useFleetStore((s) => s.rules);
  const setRules = useFleetStore((s) => s.setRules);

  const num = (v: string, min = 0) => Math.max(min, Number(v) || 0);

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <SlidersHorizontal size={18} className="text-brand-600" /> Reglas de asignación
          </h2>
          <Button variant="outline" onClick={() => setRules(DEFAULT_RULES)}>
            <RotateCcw size={15} /> Restaurar por defecto
          </Button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Estas reglas alimentan la validación al asignar/editar turnos. Se guardan en este navegador.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Máx. días consecutivos" hint="Antes de exigir un descanso.">
            <Input
              type="number"
              min={1}
              value={rules.maxConsecutiveDays}
              onChange={(e) => setRules({ maxConsecutiveDays: num(e.target.value, 1) })}
            />
          </Field>
          <Field label="Descansos mín. por semana" hint="Días de descanso exigidos cada 7 días.">
            <Input
              type="number"
              min={0}
              value={rules.minRestDaysPerWeek}
              onChange={(e) => setRules({ minRestDaysPerWeek: num(e.target.value) })}
            />
          </Field>
          <Field label="Descanso mín. entre turnos (h)" hint="Horas libres entre el fin de un turno y el inicio del siguiente.">
            <Input
              type="number"
              min={0}
              value={rules.minRestBetweenShiftsHours}
              onChange={(e) => setRules({ minRestBetweenShiftsHours: num(e.target.value) })}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={rules.enforceZoneMatch}
            onChange={(e) => setRules({ enforceZoneMatch: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
          />
          Advertir cuando se asigna fuera de la zona base del repartidor
        </label>

        <p className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Los cambios aplican de inmediato a la validación de turnos.
        </p>
      </CardContent>
    </Card>
  );
}
