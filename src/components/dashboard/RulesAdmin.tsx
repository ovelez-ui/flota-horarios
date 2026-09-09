"use client";

import { SlidersHorizontal, RotateCcw, CheckCircle2 } from "lucide-react";
import { DEFAULT_RULES } from "@/types";
import { Button, Card, CardContent, Field, IconChip, Input } from "@/components/ui";
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
            <IconChip icon={<SlidersHorizontal size={16} />} /> Reglas de asignación
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

        {/* Compensatorio por domingo trabajado */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={rules.requireSundayCompensation}
              onChange={(e) => setRules({ requireSundayCompensation: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            Exigir compensatorio por domingo trabajado
          </label>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label="Días para compensar" hint="Ventana tras el domingo dentro de la que debe caer el compensatorio.">
              <Input
                type="number"
                min={1}
                max={30}
                disabled={!rules.requireSundayCompensation}
                value={rules.sundayCompensationDays}
                onChange={(e) => setRules({ sundayCompensationDays: num(e.target.value, 1) })}
                className="w-28"
              />
            </Field>
            <p className="mb-2 text-xs text-slate-500">
              Al asignar un turno en domingo se muestra una alerta hasta registrar el compensatorio (COMP) en los siguientes {rules.sundayCompensationDays} días.
            </p>
          </div>
        </div>

        {/* Almuerzo / descanso en jornada */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={rules.lunchEnabled}
              onChange={(e) => setRules({ lunchEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            Almuerzo obligatorio en jornadas largas
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Jornada mínima con almuerzo (h)" hint="Jornada bruta por encima de la cual corresponde almuerzo.">
              <Input
                type="number" min={1} max={24}
                disabled={!rules.lunchEnabled}
                value={rules.lunchThresholdHours}
                onChange={(e) => setRules({ lunchThresholdHours: num(e.target.value, 1) })}
              />
            </Field>
            <Field label="Horas de almuerzo" hint="Descuento estándar de la jornada.">
              <Input
                type="number" min={0} max={4} step={0.5}
                disabled={!rules.lunchEnabled}
                value={rules.lunchHours}
                onChange={(e) => setRules({ lunchHours: num(e.target.value) })}
              />
            </Field>
            <Field label="Jornada para 2 h (más de)" hint="Por encima de esta jornada bruta corresponden 2 horas de almuerzo.">
              <Input
                type="number" min={1} max={24}
                disabled={!rules.lunchEnabled}
                value={rules.longJornadaHours}
                onChange={(e) => setRules({ longJornadaHours: num(e.target.value, 1) })}
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            El almuerzo no cuenta como hora trabajada: se descuenta de las horas del mes y se muestra como “descanso en jornada”. En la malla, el sufijo <strong>*</strong> descuenta 1 hora (ej. 07-16* = 8h).
          </p>
        </div>

        <p className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Los cambios aplican de inmediato a la validación de turnos.
        </p>
      </CardContent>
    </Card>
  );
}
