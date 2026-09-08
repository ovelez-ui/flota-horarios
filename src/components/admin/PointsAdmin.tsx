"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { PointOfSale } from "@/types";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import {
  Button, Card, CardContent, Field, Input, Modal, Select,
  Table, THead, TR, TH, TD,
} from "@/components/ui";

type Form = Omit<PointOfSale, "id">;

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
    setError(null);
    setOpen(true);
  }
  function openEdit(p: PointOfSale) {
    setEditing(p);
    setForm({ name: p.name, zoneId: p.zoneId, minDriversPerShift: p.minDriversPerShift });
    setError(null);
    setOpen(true);
  }
  async function submit() {
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    const res = editing ? await updatePointOfSale(editing.id, form) : await addPointOfSale(form);
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
          <h2 className="font-semibold text-slate-900">Puntos de venta ({pointsOfSale.length})</h2>
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
