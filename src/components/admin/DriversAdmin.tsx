"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { Driver, DriverStatus } from "@/types";
import { useFleetStore } from "@/hooks/use-shift-assignment";
import {
  Badge, Button, Card, CardContent, Field, Input, Modal, Select,
  Table, THead, TR, TH, TD,
} from "@/components/ui";

const STATUS: { value: DriverStatus; label: string; variant: "success" | "warning" | "danger" | "muted" }[] = [
  { value: "ACTIVE", label: "Activo", variant: "success" },
  { value: "VACATION", label: "Vacaciones", variant: "warning" },
  { value: "SICK_LEAVE", label: "Incapacidad", variant: "danger" },
  { value: "INACTIVE", label: "Inactivo", variant: "muted" },
];

const statusMeta = (s: DriverStatus) => STATUS.find((x) => x.value === s) ?? STATUS[3]!;

const PAGE = 60;

export function DriversAdmin() {
  const zones = useFleetStore((s) => s.zones);
  const pointsOfSale = useFleetStore((s) => s.pointsOfSale);
  const drivers = useFleetStore((s) => s.drivers);
  const addDriver = useFleetStore((s) => s.addDriver);
  const updateDriver = useFleetStore((s) => s.updateDriver);
  const removeDriver = useFleetStore((s) => s.removeDriver);

  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Driver>(blank(zones[0]?.id ?? "", pointsOfSale[0]?.id ?? ""));
  const [error, setError] = useState<string | null>(null);

  function blank(zoneId: string, posId: string): Driver {
    return { id: "", name: "", zoneId, basePointOfSaleId: posId, status: "ACTIVE", monthlyHourCap: 192 };
  }

  const posName = (id: string) => pointsOfSale.find((p) => p.id === id)?.name ?? "—";
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter(
      (d) =>
        (zoneFilter === "all" || d.zoneId === zoneFilter) &&
        (!q || d.name.toLowerCase().includes(q) || d.id.includes(q)),
    );
  }, [drivers, query, zoneFilter]);

  const posForZone = pointsOfSale.filter((p) => p.zoneId === form.zoneId);

  function openCreate() {
    setEditing(null);
    setForm(blank(zones[0]?.id ?? "", pointsOfSale.find((p) => p.zoneId === zones[0]?.id)?.id ?? ""));
    setError(null);
    setOpen(true);
  }
  function openEdit(d: Driver) {
    setEditing(d);
    setForm({ ...d });
    setError(null);
    setOpen(true);
  }
  async function submit() {
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    if (!editing && !form.id.trim()) return setError("La cédula es obligatoria.");
    const res = editing
      ? await updateDriver(editing.id, {
          name: form.name,
          zoneId: form.zoneId,
          basePointOfSaleId: form.basePointOfSaleId,
          status: form.status,
          monthlyHourCap: form.monthlyHourCap,
        })
      : await addDriver(form);
    if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
    setOpen(false);
  }
  async function onDelete(d: Driver) {
    if (!window.confirm(`¿Eliminar al repartidor "${d.name}"? Se descartan sus turnos.`)) return;
    const res = await removeDriver(d.id);
    if (!res.ok) window.alert(res.error);
  }

  // Al cambiar de zona en el formulario, ajustar el punto base por defecto.
  function setZone(zoneId: string) {
    const first = pointsOfSale.find((p) => p.zoneId === zoneId);
    setForm((f) => ({ ...f, zoneId, basePointOfSaleId: first?.id ?? "" }));
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Repartidores ({drivers.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="Nombre o cédula…" className="h-9 w-48 pl-8" />
            </div>
            <Select value={zoneFilter} onChange={(e) => { setZoneFilter(e.target.value); setLimit(PAGE); }} className="h-9 w-auto">
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
                <TH>Repartidor</TH>
                <TH>Zona</TH>
                <TH>Punto base</TH>
                <TH className="text-center">Estado</TH>
                <TH className="text-right">Cap. h</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <tbody>
              {filtered.slice(0, limit).map((d) => {
                const meta = statusMeta(d.status);
                return (
                  <TR key={d.id}>
                    <TD>
                      <p className="font-medium text-slate-800">{d.name}</p>
                      <p className="text-xs text-slate-400">C.C. {d.id}</p>
                    </TD>
                    <TD className="text-slate-600">{zoneName(d.zoneId)}</TD>
                    <TD className="max-w-[220px] truncate text-slate-600" title={posName(d.basePointOfSaleId)}>
                      {posName(d.basePointOfSaleId)}
                    </TD>
                    <TD className="text-center">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TD>
                    <TD className="text-right tabular-nums text-slate-600">{d.monthlyHourCap}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(d)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => onDelete(d)} className="rounded-md p-1.5 text-accent hover:bg-accent-soft" aria-label="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
              {filtered.length === 0 && (
                <TR>
                  <TD className="py-8 text-center text-slate-400">Sin resultados.</TD>
                </TR>
              )}
            </tbody>
          </Table>
          {filtered.length > limit && (
            <div className="pt-3 text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                Mostrar más ({filtered.length - limit} restantes)
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar repartidor" : "Nuevo repartidor"}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cédula" hint={editing ? "No editable" : undefined}>
              <Input value={form.id} disabled={!!editing} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="1035874521" />
            </Field>
            <Field label="Nombre">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zona">
              <Select value={form.zoneId} onChange={(e) => setZone(e.target.value)}>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Punto base">
              <Select value={form.basePointOfSaleId} onChange={(e) => setForm({ ...form, basePointOfSaleId: e.target.value })}>
                {posForZone.length === 0 && <option value="">— sin puntos —</option>}
                {posForZone.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DriverStatus })}>
                {STATUS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tope horas/mes">
              <Input type="number" min={0} value={form.monthlyHourCap} onChange={(e) => setForm({ ...form, monthlyHourCap: Number(e.target.value) })} />
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
