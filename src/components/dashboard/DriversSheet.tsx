"use client";

import { useMemo, useState } from "react";
import { Table2, Search, X, Download, ArrowUpDown } from "lucide-react";
import { Button, Card, CardContent, Eyebrow, IconChip, Input, Select } from "@/components/ui";
import { StoreMultiSelect } from "./StoreMultiSelect";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { totalHours, workedDays, restDays } from "@/lib/shift-rules";
import { specialMeta } from "@/lib/shift-catalog";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";

const ESTADO_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Activo", cls: "bg-emerald-100 text-emerald-700" },
  VACATION: { label: "Vacaciones", cls: "bg-amber-100 text-amber-700" },
  SICK_LEAVE: { label: "Incapacidad", cls: "bg-rose-100 text-rose-700" },
  INACTIVE: { label: "Inactivo", cls: "bg-slate-200 text-slate-500" },
};

type Row = {
  id: string; name: string; zona: string; tienda: string; tel: string;
  estado: string; tope: number; horas: number; laborados: number; descansos: number; novedades: number;
};

type SortKey = keyof Row;

const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: "id", label: "Cédula" },
  { key: "name", label: "Repartidor" },
  { key: "zona", label: "Zona" },
  { key: "tienda", label: "Tienda" },
  { key: "tel", label: "Teléfono" },
  { key: "estado", label: "Estado" },
  { key: "tope", label: "Tope h", num: true },
  { key: "horas", label: "Horas mes", num: true },
  { key: "laborados", label: "Laborados", num: true },
  { key: "descansos", label: "Descansos", num: true },
  { key: "novedades", label: "Novedades", num: true },
];

/** Hoja de datos de todos los repartidores (buscar, filtrar, ordenar, exportar). */
export function DriversSheet() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const shifts = useFleetStore((s) => s.shifts);
  const month = useFleetStore((s) => s.month);

  const [zoneId, setZoneId] = useState<string>("");
  const [posIds, setPosIds] = useState<string[]>([]);
  const [estado, setEstado] = useState<string>("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const zoneName = useMemo(() => new Map(zones.map((z) => [z.id, z.name])), [zones]);
  const posName = useMemo(() => new Map(pointsOfSale.map((p) => [p.id, p.name])), [pointsOfSale]);

  const storeOptions = useMemo(
    () =>
      (zoneId ? pointsOfSale.filter((p) => p.zoneId === zoneId) : pointsOfSale)
        .map((p) => ({ id: p.id, name: p.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [pointsOfSale, zoneId],
  );

  // Turnos por repartidor (del mes activo).
  const shiftsByDriver = useMemo(() => {
    const m = new Map<string, typeof shifts>();
    for (const s of shifts) {
      const arr = m.get(s.driverId) ?? [];
      arr.push(s);
      m.set(s.driverId, arr);
    }
    return m;
  }, [shifts]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const out = drivers
      .filter(
        (d) =>
          (!zoneId || d.zoneId === zoneId) &&
          (posIds.length === 0 || posIds.includes(d.basePointOfSaleId)) &&
          (!estado || d.status === estado),
      )
      .map((d) => {
        const list = shiftsByDriver.get(d.id) ?? [];
        const novedades = list.filter((s) => {
          const sp = specialMeta(s.code);
          return sp && sp.code !== "DESC";
        }).length;
        return {
          id: d.id,
          name: d.name,
          zona: zoneName.get(d.zoneId) ?? d.zoneId,
          tienda: posName.get(d.basePointOfSaleId) ?? "",
          tel: d.phone ?? "",
          estado: d.status,
          tope: d.monthlyHourCap,
          horas: Math.round(totalHours(list) * 10) / 10,
          laborados: workedDays(list),
          descansos: restDays(list),
          novedades,
        } satisfies Row;
      })
      .filter((r) => {
        if (!q) return true;
        return `${r.name} ${r.id} ${r.zona} ${r.tienda} ${r.tel}`.toLowerCase().includes(q);
      });

    const { key, dir } = sort;
    out.sort((a, b) => {
      const av = a[key], bv = b[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return out;
  }, [drivers, zoneId, posIds, estado, query, sort, shiftsByDriver, zoneName, posName]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }

  function exportCSV() {
    const header = COLUMNS.map((c) => c.label);
    const data = rows.map((r) => [
      r.id, r.name, r.zona, r.tienda, r.tel,
      ESTADO_LABEL[r.estado]?.label ?? r.estado, r.tope, r.horas, r.laborados, r.descansos, r.novedades,
    ]);
    downloadCSV(`repartidores_${month.label.replace(/\s+/g, "-")}`, [header, ...data]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Datos · {month.label}</Eyebrow>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-light tracking-tight text-slate-900 sm:text-2xl">
            <IconChip icon={<Table2 size={16} />} /> Hoja de repartidores
          </h2>
        </div>
        <Button onClick={exportCSV} disabled={rows.length === 0}>
          <Download size={15} /> Descargar CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          {/* Filtros */}
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Zona</span>
              <Select value={zoneId} onChange={(e) => { setZoneId(e.target.value); setPosIds([]); }} className="h-9 w-48">
                <option value="">Todas las zonas</option>
                {zones.map((z) => (<option key={z.id} value={z.id}>{z.name}</option>))}
              </Select>
            </label>
            <div className="text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tiendas</span>
              <StoreMultiSelect options={storeOptions} selected={posIds} onChange={setPosIds} />
            </div>
            <label className="text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Estado</span>
              <Select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-9 w-44">
                <option value="">Todos</option>
                {Object.entries(ESTADO_LABEL).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </Select>
            </label>
            <label className="min-w-[200px] flex-1 text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Buscar</span>
              <span className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cédula, nombre, zona, tienda o teléfono…" className="h-9 pl-9 pr-9" />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Limpiar">
                    <X size={14} />
                  </button>
                )}
              </span>
            </label>
          </div>

          <p className="mb-2 text-xs text-slate-400">{rows.length} repartidor(es)</p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={cn("whitespace-nowrap px-3 py-2", c.num && "text-right")}>
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn("inline-flex items-center gap-1 hover:text-slate-700", c.num && "flex-row-reverse", sort.key === c.key && "text-brand-700")}
                      >
                        {c.label} <ArrowUpDown size={11} className="opacity-50" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const est = ESTADO_LABEL[r.estado] ?? { label: r.estado, cls: "bg-slate-100 text-slate-500" };
                  return (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">{r.id}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{r.name}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">{r.zona}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">{r.tienda}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">{r.tel || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold", est.cls)}>{est.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.tope}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-700">{r.horas}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.laborados}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.descansos}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.novedades}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-slate-400">No hay repartidores para el filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
