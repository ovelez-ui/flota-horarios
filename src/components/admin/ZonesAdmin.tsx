"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Zone } from "@/types";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import { Button, Card, CardContent, Field, Input, Modal, Table, THead, TR, TH, TD } from "@/components/ui";

const EMPTY: Omit<Zone, "id"> = { code: "", name: "", city: "Medellín", color: "#084878" };

export function ZonesAdmin() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const addZone = useFleetStore((s) => s.addZone);
  const updateZone = useFleetStore((s) => s.updateZone);
  const removeZone = useFleetStore((s) => s.removeZone);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState<Omit<Zone, "id">>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }
  function openEdit(z: Zone) {
    setEditing(z);
    setForm({ code: z.code, name: z.name, city: z.city, color: z.color });
    setError(null);
    setOpen(true);
  }
  async function submit() {
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    const res = editing ? await updateZone(editing.id, form) : await addZone(form);
    if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
    setOpen(false);
  }
  async function onDelete(z: Zone) {
    if (!window.confirm(`¿Eliminar la zona "${z.name}"?`)) return;
    const res = await removeZone(z.id);
    if (!res.ok) window.alert(res.error);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Zonas ({zones.length})</h2>
          <Button onClick={openCreate}>
            <Plus size={16} /> Nueva zona
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <THead>
              <TR>
                <TH>Zona</TH>
                <TH>Ciudad</TH>
                <TH className="text-center">PDV</TH>
                <TH className="text-center">Repart.</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <tbody>
              {zones.map((z) => (
                <TR key={z.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: z.color }} />
                      <div>
                        <p className="font-medium text-slate-800">{z.name}</p>
                        <p className="text-xs text-slate-400">{z.code}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-slate-600">{z.city}</TD>
                  <TD className="text-center tabular-nums text-slate-600">
                    {pointsOfSale.filter((p) => p.zoneId === z.id).length}
                  </TD>
                  <TD className="text-center tabular-nums text-slate-600">
                    {drivers.filter((d) => d.zoneId === z.id).length}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(z)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => onDelete(z)} className="rounded-md p-1.5 text-accent hover:bg-accent-soft" aria-label="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar zona" : "Nueva zona"}>
        <div className="space-y-3">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ZONA 1 - SUR" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código">
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ZONA 1" />
            </Field>
            <Field label="Ciudad">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
          </div>
          <Field label="Color">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-10 w-20 cursor-pointer rounded-lg border border-slate-300"
            />
          </Field>
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
