"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Users, CalendarClock } from "lucide-react";
import { Button, Card, CardContent, Field, IconChip, Select } from "@/components/ui";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { isRestCode, codeLabel } from "@/lib/shift-catalog";
import { sundayCompensationAlerts } from "@/lib/shift-rules";
import { parseISO, weekdayName } from "@/lib/date-utils";
import { downloadCSV } from "@/lib/csv";

const isSunday = (iso: string) => parseISO(iso).getDay() === 0;
const count = (list: { code: string }[], code: string) => list.filter((s) => s.code === code).length;

/** Sección de descarga de reportes (CSV/Excel) generados en el navegador. */
export function ReportsPanel() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const rules = useFleetStore((s) => s.rules);
  const month = useFleetStore((s) => s.month);

  const [zoneId, setZoneId] = useState<string>(""); // "" = todas
  const [done, setDone] = useState<string | null>(null);

  const zoneName = useMemo(() => new Map(zones.map((z) => [z.id, z.name])), [zones]);
  const posName = useMemo(() => new Map(pointsOfSale.map((p) => [p.id, p.name])), [pointsOfSale]);

  // Repartidores y turnos según el filtro de zona.
  const scope = useMemo(() => {
    const ds = zoneId ? drivers.filter((d) => d.zoneId === zoneId) : drivers;
    const ids = new Set(ds.map((d) => d.id));
    const ss = shifts.filter((s) => ids.has(s.driverId));
    return { drivers: ds, shifts: ss };
  }, [drivers, shifts, zoneId]);

  const suffix = `${month.label.replace(/\s+/g, "-")}${zoneId ? `_${(zoneName.get(zoneId) ?? "zona").replace(/\s+/g, "-")}` : ""}`;

  function flash(msg: string) {
    setDone(msg);
    window.setTimeout(() => setDone(null), 3500);
  }

  // Reporte 1: malla detallada (una fila por turno).
  function exportMalla() {
    const rows: (string | number)[][] = [
      ["Cédula", "Repartidor", "Zona", "Punto de venta", "Fecha", "Día", "Código", "Concepto", "Horas"],
    ];
    const byId = new Map(scope.drivers.map((d) => [d.id, d]));
    const ordered = [...scope.shifts].sort(
      (a, b) => a.driverId.localeCompare(b.driverId) || a.date.localeCompare(b.date),
    );
    for (const s of ordered) {
      const d = byId.get(s.driverId);
      if (!d) continue;
      rows.push([
        d.id,
        d.name,
        zoneName.get(d.zoneId) ?? d.zoneId,
        posName.get(d.basePointOfSaleId) ?? d.basePointOfSaleId ?? "",
        s.date,
        weekdayName(s.date),
        s.code,
        codeLabel(s.code),
        s.hours || 0,
      ]);
    }
    downloadCSV(`malla_${suffix}`, rows);
    flash(`Malla exportada (${rows.length - 1} filas).`);
  }

  // Reporte 2: resumen por repartidor.
  function exportResumen() {
    const rows: (string | number)[][] = [
      [
        "Cédula", "Repartidor", "Zona", "Punto de venta",
        "Horas mes", "Tope horas", "Días laborados", "Descansos", "Domingos trabajados",
        "Vacaciones", "Incapacidades", "Licencias", "Compensatorios", "Día de la familia",
        "Comp. pendientes",
      ],
    ];
    for (const d of scope.drivers) {
      const list = scope.shifts.filter((s) => s.driverId === d.id);
      const horas = Math.round(list.reduce((a, s) => a + (s.hours || 0), 0) * 10) / 10;
      const laborados = list.filter((s) => !isRestCode(s.code)).length;
      const domingos = list.filter((s) => !isRestCode(s.code) && isSunday(s.date)).length;
      const pend = sundayCompensationAlerts(list, rules).filter((a) => !a.compensated).length;
      rows.push([
        d.id, d.name, zoneName.get(d.zoneId) ?? d.zoneId, posName.get(d.basePointOfSaleId) ?? "",
        horas, d.monthlyHourCap, laborados, count(list, "DESC"), domingos,
        count(list, "VACAC"), count(list, "INC"), count(list, "LIC"), count(list, "COMP"), count(list, "FAM"),
        pend,
      ]);
    }
    downloadCSV(`resumen_repartidores_${suffix}`, rows);
    flash(`Resumen exportado (${rows.length - 1} repartidores).`);
  }

  // Reporte 3: compensatorios pendientes por domingo.
  function exportPendientes() {
    const rows: (string | number)[][] = [
      ["Cédula", "Repartidor", "Zona", "Domingo trabajado", "Compensar antes de"],
    ];
    for (const d of scope.drivers) {
      const list = scope.shifts.filter((s) => s.driverId === d.id);
      for (const a of sundayCompensationAlerts(list, rules)) {
        if (a.compensated) continue;
        rows.push([d.id, d.name, zoneName.get(d.zoneId) ?? d.zoneId, a.sundayDate, a.dueBy]);
      }
    }
    downloadCSV(`compensatorios_pendientes_${suffix}`, rows);
    flash(`Pendientes exportados (${rows.length - 1} registros).`);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
          <IconChip icon={<Download size={16} />} /> Reportes
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Descarga la información en formato CSV (compatible con Excel). Los reportes usan el
          mes de planificación vigente ·{" "}
          <span className="font-medium text-slate-700">{month.label}</span>.
        </p>

        <div className="mb-4 max-w-xs">
          <Field label="Zona" hint="Filtra los reportes por zona o expórtalos completos.">
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </Select>
          </Field>
          <p className="mt-2 text-xs text-slate-400">
            {scope.drivers.length} repartidor(es) · {scope.shifts.length} turnos en el alcance actual.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ReportCard
            icon={<FileSpreadsheet size={18} />}
            title="Malla detallada"
            desc="Una fila por turno: fecha, día, código, concepto y horas."
            onClick={exportMalla}
          />
          <ReportCard
            icon={<Users size={18} />}
            title="Resumen por repartidor"
            desc="Horas, días laborados, descansos, novedades y compensatorios pendientes."
            onClick={exportResumen}
          />
          <ReportCard
            icon={<CalendarClock size={18} />}
            title="Compensatorios pendientes"
            desc="Domingos trabajados sin compensatorio dentro de la ventana."
            onClick={exportPendientes}
          />
        </div>

        {done && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700">
            <Download size={16} /> {done}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReportCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-brand-700">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 ring-1 ring-inset ring-brand-100">
          {icon}
        </span>
        <span className="font-semibold text-slate-800">{title}</span>
      </div>
      <p className="mb-3 flex-1 text-xs text-slate-500">{desc}</p>
      <Button onClick={onClick} variant="outline" className="w-full">
        <Download size={15} /> Descargar CSV
      </Button>
    </div>
  );
}
