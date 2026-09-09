import type { Driver, PointOfSale, RuleViolation, Shift, Zone } from "@/types";
import type { SeedShift } from "@/data/seed";
import type { BuildShiftInput } from "@/lib/shift-rules";

export interface Bootstrap {
  zones: Zone[];
  pointsOfSale: PointOfSale[];
  drivers: Driver[];
  shifts: SeedShift[];
}

async function req<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

function errorOf(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: unknown }).error);
  }
  return fallback;
}

export const api = {
  async bootstrap(): Promise<Bootstrap> {
    const { data } = await req<Bootstrap>("/api/bootstrap");
    return data;
  },

  // --- Zonas ---
  async createZone(body: Omit<Zone, "id">) {
    const { ok, data } = await req<Zone & { error?: string }>("/api/zones", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ok, zone: data as Zone, error: ok ? undefined : errorOf(data, "No se pudo crear la zona.") };
  },
  async updateZone(id: string, body: Partial<Omit<Zone, "id">>) {
    const { ok, data } = await req<Zone & { error?: string }>(`/api/zones/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return { ok, zone: data as Zone, error: ok ? undefined : errorOf(data, "No se pudo actualizar la zona.") };
  },
  async deleteZone(id: string) {
    const { ok, data } = await req<{ error?: string }>(`/api/zones/${id}`, { method: "DELETE" });
    return { ok, error: ok ? undefined : errorOf(data, "No se pudo eliminar la zona.") };
  },

  // --- Puntos de venta ---
  async createPos(body: Omit<PointOfSale, "id">) {
    const { ok, data } = await req<PointOfSale & { error?: string }>("/api/points-of-sale", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ok, pos: data as PointOfSale, error: ok ? undefined : errorOf(data, "No se pudo crear el punto.") };
  },
  async updatePos(id: string, body: Partial<Omit<PointOfSale, "id">>) {
    const { ok, data } = await req<PointOfSale & { error?: string }>(`/api/points-of-sale/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return { ok, pos: data as PointOfSale, error: ok ? undefined : errorOf(data, "No se pudo actualizar el punto.") };
  },
  async deletePos(id: string) {
    const { ok, data } = await req<{ error?: string }>(`/api/points-of-sale/${id}`, { method: "DELETE" });
    return { ok, error: ok ? undefined : errorOf(data, "No se pudo eliminar el punto.") };
  },

  // --- Repartidores ---
  async createDriver(body: Driver) {
    const { ok, data } = await req<Driver & { error?: string }>("/api/drivers", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ok, driver: data as Driver, error: ok ? undefined : errorOf(data, "No se pudo crear el repartidor.") };
  },
  async updateDriver(id: string, body: Partial<Omit<Driver, "id">>) {
    const { ok, data } = await req<Driver & { error?: string }>(`/api/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return { ok, driver: data as Driver, error: ok ? undefined : errorOf(data, "No se pudo actualizar el repartidor.") };
  },
  async deleteDriver(id: string) {
    const { ok, data } = await req<{ error?: string }>(`/api/drivers/${id}`, { method: "DELETE" });
    return { ok, error: ok ? undefined : errorOf(data, "No se pudo eliminar el repartidor.") };
  },

  // --- Asignación por rango (novedades/vacaciones) ---
  async assignRange(body: { driverId: string; from: string; to: string; code: string }) {
    const { ok, data } = await req<{ ok?: boolean; count?: number; shifts?: Shift[]; error?: string }>(
      "/api/shifts/bulk",
      { method: "POST", body: JSON.stringify(body) },
    );
    return {
      ok,
      count: data.count ?? 0,
      shifts: data.shifts ?? [],
      error: ok ? undefined : errorOf(data, "No se pudo registrar el rango."),
    };
  },

  // --- Turnos de un mes específico (para copiar plantilla) ---
  async listShiftsInMonth(prefix: string): Promise<SeedShift[]> {
    const { shifts } = await this.bootstrap();
    return shifts.filter((s) => s.date.startsWith(prefix));
  },

  // --- Alta masiva de turnos (copiar mes) ---
  async bulkUpsertShifts(shifts: Shift[]): Promise<{ ok: boolean; count: number; error?: string }> {
    let count = 0;
    for (const s of shifts) {
      const r = await this.assignShift({
        driverId: s.driverId, date: s.date, weekday: s.weekday, code: s.code,
        zoneId: s.zoneId, pointOfSaleId: s.pointOfSaleId,
      });
      if (r.ok) count++;
    }
    return { ok: true, count };
  },

  // --- Asignación ---
  async assignShift(body: BuildShiftInput) {
    const { ok, data } = await req<{ ok?: boolean; violations?: RuleViolation[]; shift?: Shift; error?: string }>(
      "/api/shifts",
      { method: "POST", body: JSON.stringify(body) },
    );
    return {
      ok,
      violations: data.violations ?? [],
      shift: data.shift,
      error: ok ? undefined : errorOf(data, "No se pudo asignar el turno."),
    };
  },
};
