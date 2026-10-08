import type { Shift, ShiftKind } from "@/types";
import { shiftKind, isRestCode, specialMeta, parseShiftCode } from "@/lib/shift-catalog";
import { parseISO, isWeekend } from "@/lib/date-utils";
import { isHoliday, holidayName } from "@/lib/holidays";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<ShiftKind, string> = {
  MORNING: "bg-sky-50 text-sky-700 ring-sky-100",
  MID: "bg-violet-50 text-violet-700 ring-violet-100",
  AFTERNOON: "bg-amber-50 text-amber-700 ring-amber-100",
  NIGHT: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  REST: "bg-slate-100 text-slate-400 ring-slate-200",
};

const WEEK_HEADER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Offset lunes-primero: Lun=0 … Dom=6. */
function mondayIndex(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7;
}

/** Formatea una hora decimal (ej. 13.666) a "HH:MM" en reloj de 24 h. */
function fmtHour(h: number): string {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.round((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Rango horario completo del turno (ej. "14:00–21:00"), o null si es novedad. */
function timeRange(code: string): string | null {
  try {
    const d = parseShiftCode(code);
    if (d.start == null || d.end == null) return null;
    return `${fmtHour(d.start)} – ${fmtHour(d.end)}`;
  } catch {
    return null;
  }
}

/**
 * Malla del mes como calendario (Lun–Dom). Aprovecha el ancho completo y
 * evita el scroll largo de la lista. Cada celda: día, turno y horas.
 */
export function ShiftCalendar({ shifts }: { shifts: Shift[] }) {
  if (shifts.length === 0) {
    return <p className="py-8 text-center text-slate-400">Sin turnos registrados.</p>;
  }

  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date));
  const leading = mondayIndex(sorted[0]!.date);
  const cells: (Shift | null)[] = [...Array(leading).fill(null), ...sorted];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_HEADER.map((d) => (
          <div key={d} className="px-1 pb-0.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((s, i) => {
          if (!s) return <div key={`e${i}`} className="min-h-[84px] rounded-lg border border-dashed border-slate-100 bg-slate-50/40" />;
          const rest = isRestCode(s.code);
          const special = specialMeta(s.code);
          const kind = shiftKind(s);
          const weekend = isWeekend(s.date);
          const holiday = isHoliday(s.date);
          const day = parseISO(s.date).getDate();
          const range = timeRange(s.code);
          return (
            <div
              key={s.id}
              className={cn(
                "flex min-h-[84px] flex-col gap-1 rounded-lg border p-1.5 transition-colors",
                holiday ? "border-amber-200 bg-amber-50/50" : weekend ? "border-brand-100 bg-brand-50/40" : "border-slate-200 bg-white",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-bold tabular-nums", weekend ? "text-brand-700" : "text-slate-700")}>{day}</span>
                {holiday && (
                  <span className="text-[10px] font-semibold text-amber-600" title={holidayName(s.date)}>★</span>
                )}
              </div>
              <span
                className={cn(
                  "flex w-full flex-1 items-center justify-center break-words rounded-md px-1 py-1 text-center text-[11px] font-semibold leading-tight ring-1 ring-inset",
                  special ? special.cell : KIND_STYLES[kind],
                )}
                title={special ? special.label : `${range ?? s.code} · ${s.hours} h`}
              >
                {special ? special.label : (range ?? s.code)}
              </span>
              <span className="text-right text-[10px] tabular-nums text-slate-400">
                {rest ? "—" : `${s.hours} h`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
