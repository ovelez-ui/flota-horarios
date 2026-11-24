"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { PointOfSale, StoreHours } from "@/types";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import {
  Button, Card, CardContent, Field, Input, Modal, Select,
  Table, THead, TR, TH, TD,
} from "@/components/ui";

type Form = Omit<PointOfSale, "id">;

type DayKey = "weekday" | "sat" | "sun" | "holiday";
type HrsState = Record<DayKey, { open: string; close: string }>;

const DAY_ROWS: { key: DayKey; label: string }[] = [
  { key: "weekday", label: "Lun–Vie" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
  { key: "holiday", label: "Festivos" },
];

const EMPTY_HRS = (): HrsState => ({
  weekday: { open: "", close: "" },
  sat: { open: "", close: "" },
  sun: { open: "", close: "" },
  holiday: { open: "", close: "" },
});

/** Inicializa el editor de horario desde una tienda (o vacío). */
function hrsFromPos(p?: PointOfSale | null): HrsState {
  const out = EMPTY_HRS();
  if (!p) return out;
  if (p.hours) {
    for (const k of ["weekday", "sat", "sun", "holiday"] as DayKey[]) {
      out[k] = { open: p.hours[k]?.open ?? "", close: p.hours[k]?.close ?? "" };
    }
  } else if (p.openTime || p.closeTime) {
    out.weekday = { open: p.openTime ?? "", close: p.closeTime ?? "" };
  }
  return out;
}

/** Construye el objeto `hours` descartando días sin apertura+cierre. */
function cleanHours(s: HrsState): StoreHours | undefined {
  const out: StoreHours = {};
  for (const k of ["weekday", "sat", "sun", "holiday"] as DayKey[]) {
    const w = s[k];
    if (w.open && w.close) out[k] = { open: w.open, close: w.close };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Resumen compacto del horario para la tabla. */
function hoursSummary(p: PointOfSale): { main: string; extra: string[] } {
  const h = cleanHours(hrsFromPos(p));
  if (!h) return { main: "—", extra: [] };
  const fmt = (k: DayKey) => (h[k] ? `${h[k]!.open}–${h[k]!.close}` : null);
  const labels: Record<DayKey, string> = { weekday: "L-V", sat: "Sáb", sun: "Dom", holiday: "Fest" };
  const main = h.weekday ? `L-V ${fmt("weekday")}` : "—";
  const extra = (["sat", "sun", "holiday"] as DayKey[])
    .filter((k) => h[k])
    .map((k) => `${labels[k]} ${fmt(k)}`);
  return { main, extra };
}

export function PointsAdmin() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const addPointOfSale = useFleetStore((s) => s.addPointOfSale);
  const updatePointOfSale = useFleetStore((s) => s.updatePointOfSale);
  const removePointOfSale = useFleetStore((s) => s.removePointOfSale);

  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PointOfSale | null>(null);
  const [form, setForm] = useState<Form>({ name: "", zoneId: zones[0]?.id ?? "", minDriversPerShift: 1 });
  const [hrs, setHrs] = useState<HrsState>(EMPTY_HRS());
  const [error, setError] = useState<string | null>(null);

  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pointsOfSale.filter(
      (p) =>
        (zoneFilter === "all" || p.zoneId === zoneFilter) &&
        (!q || p.name.toLowerCase().includes(q)),
    );
  }, [pointsOfSale, query, zoneFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", zoneId: zones[0]?.id ?? "", minDriversPerShift: 1 });
    setHrs(EMPTY_HRS());
    setError(null);
    setOpen(true);
  }
  function openEdit(p: PointOfSale) {
    setEditing(p);
    setForm({ name: p.name, zoneId: p.zoneId, minDriversPerShift: p.minDriversPerShift });
    setHrs(hrsFromPos(p));
    setError(null);
    setOpen(true);
  }
  async function submit() {
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    // Cada día con horario debe tener apertura y cierre, y apertura < cierre.
    for (const { key, label } of DAY_ROWS) {
      const w = hrs[key];
      if ((w.open || w.close) && !(w.open && w.close)) {
        return setError(`Completa apertura y cierre en ${label}, o deja ambos vacíos.`);
      }
      if (w.open && w.close && w.open >= w.close) {
        return setError(`En ${label}, la apertura debe ser anterior al cierre.`);
      }
    }
    // El horario nuevo se guarda en `hours`; se limpia el horario único antiguo.
    const payload: Form = { ...form, hours: cleanHours(hrs), openTime: undefined, closeTime: undefined };
    const res = editing ? await updatePointOfSale(editing.id, payload) : await addPointOfSale(payload);
    if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
    setOpen(false);
  }
  async function onDelete(p: PointOfSale) {
    if (!window.confirm(`¿Eliminar el punto "${p.name}"?`)) return;
    const res = await removePointOfSale(p.id);
    if (!res.ok) window.alert(res.error);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-serif font-normal tracking-tight text-ink">Puntos de venta ({pointsOfSale.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className="h-9 w-44 pl-8" />
            </div>
            <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="h-9 w-auto">
              <option value="all">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </Select>
            <Button onClick={openCreate}>
              <Plus size={16} /> Nuevo
            </Button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <THead>
              <TR>
                <TH>Punto de venta</TH>
                <TH>Zona</TH>
                <TH className="text-center">Horario</TH>
                <TH className="text-center">Mín/franja</TH>
                <TH className="text-center">Repart.</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <tbody>
              {filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium text-slate-800">{p.name}</TD>
                  <TD className="text-slate-600">{zoneName(p.zoneId)}</TD>
                  <TD className="text-center text-xs tabular-nums text-slate-600">
                    {(() => {
                      const s = hoursSummary(p);
                      if (s.main === "—" && s.extra.length === 0) return <span className="text-slate-300">—</span>;
                      return (
                        <div className="leading-tight">
                          <div>{s.main}</div>
                          {s.extra.map((x) => (
                            <div key={x} className="text-[10px] text-slate-400">{x}</div>
                          ))}
                        </div>
                      );
                    })()}
                  </TD>
                  <TD className="text-center tabular-nums text-slate-600">{p.minDriversPerShift}</TD>
                  <TD className="text-center tabular-nums text-slate-600">
                    {drivers.filter((d) => d.basePointOfSaleId === p.id).length}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => onDelete(p)} className="rounded-md p-1.5 text-accent hover:bg-accent-soft" aria-label="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
              {filtered.length === 0 && (
                <TR>
                  <TD className="py-8 text-center text-slate-400">Sin resultados.</TD>
                </TR>
              )}
            </tbody>
          </Table>
        </div>
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar punto de venta" : "Nuevo punto de venta"}>
        <div className="space-y-3">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="FARMACIA PASTEUR …" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zona">
              <Select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Mín. repartidores/franja">
              <Input
                type="number"
                min={0}
                value={form.minDriversPerShift}
                onChange={(e) => setForm({ ...form, minDriversPerShift: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Horario de atención</p>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Día</span><span>Apertura</span><span>Cierre</span>
              </div>
              {DAY_ROWS.map(({ key, label }) => (
                <div key={key} className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-2">
                  <span className="text-sm text-slate-600">{label}</span>
                  <Input
                    type="time"
                    value={hrs[key].open}
                    onChange={(e) => setHrs({ ...hrs, [key]: { ...hrs[key], open: e.target.value } })}
                  />
                  <Input
                    type="time"
                    value={hrs[key].close}
                    onChange={(e) => setHrs({ ...hrs, [key]: { ...hrs[key], close: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Los turnos fuera de la ventana del día quedan bloqueados. Deja un día vacío para no restringirlo
              (ej. 24 h). Festivos tiene prioridad sobre el día de la semana.
            </p>
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>{editing ? "Guardar" : "Crear"}</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
