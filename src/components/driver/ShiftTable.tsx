import type { Shift, ShiftKind } from "@/types";
import { Table, THead, TR, TH, TD } from "@/components/ui";
import { shiftKind, isRestCode, specialMeta, codeLabel } from "@/lib/shift-catalog";
import { shortLabel, isWeekend } from "@/lib/date-utils";
import { isHoliday, holidayName } from "@/lib/holidays";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<ShiftKind, string> = {
  MORNING: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100",
  MID: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100",
  AFTERNOON: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  NIGHT: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100",
  REST: "bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200",
};

function ShiftChip({ shift }: { shift: Shift }) {
  const special = specialMeta(shift.code);
  const kind = shiftKind(shift);
  return (
    <span
      className={cn(
        "inline-flex min-w-[64px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold",
        special ? special.cell : KIND_STYLES[kind],
      )}
      title={special ? special.label : `${shift.code} · ${shift.hours}h`}
    >
      {special ? codeLabel(shift.code) : shift.code}
    </span>
  );
}

export function ShiftTable({ shifts }: { shifts: Shift[] }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Fecha</TH>
          <TH>Día</TH>
          <TH>Turno</TH>
          <TH className="text-right">Horas</TH>
        </TR>
      </THead>
      <tbody>
        {shifts.map((s) => {
          const rest = isRestCode(s.code);
          const weekend = isWeekend(s.date);
          const holiday = isHoliday(s.date);
          return (
            <TR
              key={s.id}
              className={cn(
                rest && "bg-slate-50/60",
                weekend && !rest && "bg-brand-50/40",
                holiday && "bg-amber-50/60",
              )}
            >
              <TD className="font-medium text-slate-700">{shortLabel(s.date)}</TD>
              <TD className={cn("text-slate-600", weekend && "font-medium text-brand-700")}>
                <span className="flex items-center gap-1.5">
                  {s.weekday}
                  {holiday && (
                    <span
                      className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                      title={holidayName(s.date)}
                    >
                      ★ Feriado
                    </span>
                  )}
                </span>
              </TD>
              <TD>
                <ShiftChip shift={s} />
              </TD>
              <TD className="text-right tabular-nums text-slate-600">
                {rest ? "—" : `${s.hours} h`}
              </TD>
            </TR>
          );
        })}
        {shifts.length === 0 && (
          <TR>
            <TD className="py-8 text-center text-slate-400">Sin turnos registrados.</TD>
          </TR>
        )}
      </tbody>
    </Table>
  );
}
