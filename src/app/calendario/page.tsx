import { ScheduleCalendar } from "@/components/dashboard/ScheduleCalendar";
import { MONTH } from "@/lib/month";

export default function CalendarioPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Calendario de turnos</h1>
        <p className="text-sm text-slate-600">
          Malla del mes por zona ·{" "}
          <span className="font-medium text-brand-700">{MONTH.label}</span>
        </p>
      </div>
      <ScheduleCalendar readOnly />
    </div>
  );
}
