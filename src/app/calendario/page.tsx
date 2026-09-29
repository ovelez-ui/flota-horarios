import { ScheduleCalendar } from "@/components/dashboard/ScheduleCalendar";

export default function CalendarioPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-slate-900 sm:text-3xl">Calendario de turnos</h1>
        <p className="text-sm text-slate-600">
          Consulta la malla por zona y punto de venta. Elige el mes en el selector.
        </p>
      </div>
      <ScheduleCalendar readOnly />
    </div>
  );
}
