import { Building2, MapPin, Clock, CalendarCheck, User, UtensilsCrossed } from "lucide-react";
import type { DriverMonthlySummary } from "@/types";
import { Badge, Card } from "@/components/ui";
import { specialMeta, SPECIAL_CODE_LIST, SPECIAL_CODES } from "@/lib/shift-catalog";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "danger" | "muted" }> = {
  ACTIVE: { label: "Activo", variant: "success" },
  VACATION: { label: "Vacaciones", variant: "warning" },
  SICK_LEAVE: { label: "Incapacidad", variant: "danger" },
  INACTIVE: { label: "Inactivo", variant: "muted" },
};

interface Stat {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export function DriverInfoCard({ summary }: { summary: DriverMonthlySummary }) {
  const { driver, pointOfSale, zone, accumulatedHours, workedDays, breakHours } = summary;
  const status = STATUS_LABEL[driver.status] ?? STATUS_LABEL.INACTIVE!;
  const grossHours = Math.round((accumulatedHours + breakHours) * 10) / 10;

  const stats: Stat[] = [
    { icon: <Building2 size={18} />, label: "Punto base", value: pointOfSale.name },
    { icon: <MapPin size={18} />, label: "Zona", value: zone.name },
    { icon: <Clock size={18} />, label: "Horas del mes", value: `${accumulatedHours} h` },
    { icon: <CalendarCheck size={18} />, label: "Días laborados", value: String(workedDays) },
    { icon: <UtensilsCrossed size={18} />, label: "Descanso en jornada", value: `${breakHours} h` },
  ];

  // Conteo de novedades del mes por tipo.
  const counts = new Map<string, number>();
  for (const s of summary.shifts) {
    const m = specialMeta(s.code);
    if (m) counts.set(m.code, (counts.get(m.code) ?? 0) + 1);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-brand-700 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
            <User size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">{driver.name}</p>
            <p className="text-sm text-brand-100">C.C. {driver.id}</p>
          </div>
        </div>
        <Badge variant={status.variant} className="bg-white/90">
          {status.label}
        </Badge>
      </div>

      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="flex items-start gap-3 bg-white p-4">
            <span className="mt-0.5 text-brand-600">{s.icon}</span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="truncate font-medium text-slate-900" title={s.value}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Desglose de jornada: bruto − almuerzo = horas netas del mes */}
      {breakHours > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 bg-brand-50/50 px-4 py-3 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-brand-800">
            <UtensilsCrossed size={16} /> Descanso dentro de la jornada: {breakHours} h de almuerzo
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600">
            Jornada bruta {grossHours} h − almuerzo {breakHours} h ={" "}
            <strong className="text-slate-900">{accumulatedHours} h</strong> del mes
          </span>
        </div>
      )}

      {/* Contadores de novedades del mes */}
      <div className="border-t border-slate-100 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Novedades del mes
        </p>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_CODE_LIST.map((code) => {
            const meta = SPECIAL_CODES[code]!;
            const n = counts.get(code) ?? 0;
            return (
              <span
                key={code}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
                  n > 0 ? meta.cell : "bg-slate-50 text-slate-400",
                )}
                title={`${meta.label}: ${n} día(s)`}
              >
                <span className="tabular-nums text-base font-bold">{n}</span>
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
