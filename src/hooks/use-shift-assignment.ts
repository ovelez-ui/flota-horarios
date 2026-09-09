"use client";

import { create } from "zustand";
import type {
  AssignmentRules,
  Driver,
  PointOfSale,
  RuleViolation,
  Shift,
  Zone,
} from "@/types";
import { DEFAULT_RULES } from "@/types";
import {
  buildShift,
  hasBlockingError,
  restDays,
  totalHours,
  validateAssignment,
  workedDays,
  type BuildShiftInput,
} from "@/lib/shift-rules";
import { weekdayName } from "@/lib/date-utils";
import { DEFAULT_MONTH, setActiveMonth, type MonthDef } from "@/lib/month";
import { source } from "@/lib/data-source";
import { parseShiftCode, isRestCode, distinctWorkCodes } from "@/lib/shift-catalog";

/** Acota los turnos al mes de planificación indicado. */
const scopeToMonth = (shifts: Shift[], prefix: string) => shifts.filter((s) => s.date.startsWith(prefix));

// Reglas de asignación persistidas en el navegador del coordinador.
const RULES_KEY = "flota-rules-v1";
function loadRules(): AssignmentRules {
  if (typeof window === "undefined") return DEFAULT_RULES;
  try {
    const raw = window.localStorage.getItem(RULES_KEY);
    if (raw) return { ...DEFAULT_RULES, ...JSON.parse(raw) };
  } catch {
    /* ignora */
  }
  return DEFAULT_RULES;
}

// Turnos especiales/personalizados definidos por el coordinador (además de los
// que ya vienen en la malla). Persistidos en el navegador.
const CODES_KEY = "flota-shift-codes-v1";
function loadCustomCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CODES_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignora */
  }
  return [];
}
function saveCustomCodes(codes: string[]) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(CODES_KEY, JSON.stringify(codes));
  } catch {
    /* ignora */
  }
}

export interface AssignmentResult {
  ok: boolean;
  violations: RuleViolation[];
}

export interface MutationResult {
  ok: boolean;
  error?: string;
}

interface FleetState {
  // Caché local hidratado desde el backend.
  zones: Zone[];
  pointsOfSale: PointOfSale[];
  drivers: Driver[];
  shifts: Shift[];
  rules: AssignmentRules;
  /** Mes de planificación activo. */
  month: MonthDef;

  ready: boolean;
  loading: boolean;
  error: string | null;

  // --- Ciclo de vida ---
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Cambia el mes activo y recarga sus turnos. */
  setMonth: (prefix: string) => Promise<void>;

  // --- Consultas (sobre el caché en memoria) ---
  driverShifts: (driverId: string) => Shift[];
  metrics: (driverId: string) => { hours: number; worked: number; rest: number };

  // --- Motor de asignación ---
  preview: (input: BuildShiftInput) => AssignmentResult;
  assign: (input: BuildShiftInput) => Promise<AssignmentResult & { error?: string }>;
  /** Aplica un turno de forma optimista (para "pintar" en el calendario). */
  paint: (input: BuildShiftInput) => Promise<AssignmentResult & { error?: string }>;
  assignRange: (input: { driverId: string; from: string; to: string; code: string }) => Promise<MutationResult & { count?: number }>;
  setRules: (partial: Partial<AssignmentRules>) => void;

  // --- Catálogo de turnos especiales (admin de horarios) ---
  customShiftCodes: string[];
  addShiftCode: (code: string) => { ok: boolean; error?: string; code?: string };
  removeShiftCode: (code: string) => void;

  // --- CRUD (a través de la API) ---
  addZone: (data: Omit<Zone, "id">) => Promise<MutationResult>;
  updateZone: (id: string, patch: Partial<Omit<Zone, "id">>) => Promise<MutationResult>;
  removeZone: (id: string) => Promise<MutationResult>;

  addPointOfSale: (data: Omit<PointOfSale, "id">) => Promise<MutationResult>;
  updatePointOfSale: (id: string, patch: Partial<Omit<PointOfSale, "id">>) => Promise<MutationResult>;
  removePointOfSale: (id: string) => Promise<MutationResult>;

  addDriver: (data: Driver) => Promise<MutationResult>;
  updateDriver: (id: string, patch: Partial<Omit<Driver, "id">>) => Promise<MutationResult>;
  removeDriver: (id: string) => Promise<MutationResult>;
}

let bootstrapping: Promise<void> | null = null;

export const useFleetStore = create<FleetState>((set, get) => ({
  zones: [],
  pointsOfSale: [],
  drivers: [],
  shifts: [],
  rules: loadRules(),
  month: DEFAULT_MONTH,
  customShiftCodes: loadCustomCodes(),
  ready: false,
  loading: false,
  error: null,

  bootstrap: async () => {
    if (get().ready || bootstrapping) return bootstrapping ?? undefined;
    bootstrapping = (async () => {
      set({ loading: true, error: null });
      try {
        const data = await source.bootstrap();
        set({
          zones: data.zones,
          pointsOfSale: data.pointsOfSale,
          drivers: data.drivers,
          shifts: scopeToMonth(data.shifts, get().month.prefix),
          ready: true,
          loading: false,
        });
      } catch (e) {
        set({ loading: false, error: e instanceof Error ? e.message : "Error de carga." });
      } finally {
        bootstrapping = null;
      }
    })();
    return bootstrapping;
  },

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const data = await source.bootstrap();
      set({
        zones: data.zones,
        pointsOfSale: data.pointsOfSale,
        drivers: data.drivers,
        shifts: scopeToMonth(data.shifts, get().month.prefix),
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Error de carga." });
    }
  },

  setMonth: async (prefix) => {
    const m = setActiveMonth(prefix);
    if (m.prefix === get().month.prefix && get().ready) return;
    // Al cambiar de mes vaciamos la malla para no mostrar datos del mes anterior
    // mientras llega la nueva consulta al backend.
    set({ month: m, shifts: [], loading: true, error: null });
    try {
      const data = await source.bootstrap();
      set({
        zones: data.zones,
        pointsOfSale: data.pointsOfSale,
        drivers: data.drivers,
        shifts: scopeToMonth(data.shifts, m.prefix),
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Error de carga." });
    }
  },

  driverShifts: (driverId) =>
    get()
      .shifts.filter((s) => s.driverId === driverId)
      .sort((a, b) => a.date.localeCompare(b.date)),

  metrics: (driverId) => {
    const list = get().driverShifts(driverId);
    return {
      hours: Math.round(totalHours(list) * 10) / 10,
      worked: workedDays(list),
      rest: restDays(list),
    };
  },

  preview: (input) => {
    const driver = get().drivers.find((d) => d.id === input.driverId);
    if (!driver) {
      return {
        ok: false,
        violations: [{ code: "DRIVER_UNAVAILABLE", severity: "error", message: "Repartidor no encontrado." }],
      };
    }
    const candidate = buildShift({ ...input, weekday: input.weekday || weekdayName(input.date) });
    const violations = validateAssignment({
      driver,
      existingShifts: get().driverShifts(input.driverId),
      candidate,
      rules: get().rules,
    });
    return { ok: !hasBlockingError(violations), violations };
  },

  assign: async (input) => {
    // Validación local primero (aplica reglas también en modo Supabase, que
    // no valida en el servidor). En modo API el servidor re-valida igualmente.
    const local = get().preview(input);
    if (!local.ok) return { ok: false, violations: local.violations };

    const res = await source.assignShift(input);
    if (res.ok && res.shift) {
      const shift = res.shift;
      set((state) => ({
        shifts: [
          ...state.shifts.filter((s) => !(s.driverId === shift.driverId && s.date === shift.date)),
          shift,
        ],
      }));
    }
    return { ok: res.ok, violations: res.violations.length ? res.violations : local.violations, error: res.error };
  },

  paint: async (input) => {
    const local = get().preview(input);
    if (!local.ok) return { ok: false, violations: local.violations };

    const candidate = buildShift({ ...input, weekday: input.weekday || weekdayName(input.date) });
    const prev = get().shifts.find((s) => s.driverId === candidate.driverId && s.date === candidate.date);
    // Optimista: pinta la celda de inmediato.
    set((state) => ({
      shifts: [...state.shifts.filter((s) => !(s.driverId === candidate.driverId && s.date === candidate.date)), candidate],
    }));

    const res = await source.assignShift(input);
    if (!res.ok) {
      // Revertir si el backend rechaza.
      set((state) => ({
        shifts: [...state.shifts.filter((s) => !(s.driverId === candidate.driverId && s.date === candidate.date)), ...(prev ? [prev] : [])],
      }));
    }
    return { ok: res.ok, violations: local.violations, error: res.error };
  },

  assignRange: async (input) => {
    const res = await source.assignRange(input);
    if (res.ok && res.shifts.length) {
      const byKey = new Map(res.shifts.map((s) => [`${s.driverId}|${s.date}`, s]));
      set((state) => ({
        shifts: [
          ...state.shifts.filter((s) => !byKey.has(`${s.driverId}|${s.date}`)),
          ...res.shifts,
        ],
      }));
    }
    return { ok: res.ok, error: res.error, count: res.count };
  },

  setRules: (partial) =>
    set((state) => {
      const rules = { ...state.rules, ...partial };
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(RULES_KEY, JSON.stringify(rules));
      } catch {
        /* ignora */
      }
      return { rules };
    }),

  addShiftCode: (raw) => {
    let def;
    try {
      def = parseShiftCode(raw);
    } catch {
      return { ok: false, error: `Código inválido: "${raw}". Usa formato hora, ej. 10-18 o 22-06.` };
    }
    if (isRestCode(def.code)) {
      return { ok: false, error: "Ese es una novedad (descanso/vacaciones…), no un turno." };
    }
    const existing = new Set([...distinctWorkCodes(get().shifts), ...get().customShiftCodes]);
    if (existing.has(def.code)) {
      return { ok: false, error: `El turno ${def.code} ya está disponible.` };
    }
    const codes = [...get().customShiftCodes, def.code];
    saveCustomCodes(codes);
    set({ customShiftCodes: codes });
    return { ok: true, code: def.code };
  },

  removeShiftCode: (code) =>
    set((state) => {
      const codes = state.customShiftCodes.filter((c) => c !== code);
      saveCustomCodes(codes);
      return { customShiftCodes: codes };
    }),

  // --- Zonas ---
  addZone: async (data) => {
    const res = await source.createZone(data);
    if (res.ok) set((s) => ({ zones: [...s.zones, res.zone].sort((a, b) => a.name.localeCompare(b.name)) }));
    return { ok: res.ok, error: res.error };
  },
  updateZone: async (id, patch) => {
    const res = await source.updateZone(id, patch);
    if (res.ok) set((s) => ({ zones: s.zones.map((z) => (z.id === id ? res.zone : z)) }));
    return { ok: res.ok, error: res.error };
  },
  removeZone: async (id) => {
    const res = await source.deleteZone(id);
    if (res.ok) set((s) => ({ zones: s.zones.filter((z) => z.id !== id) }));
    return { ok: res.ok, error: res.error };
  },

  // --- Puntos de venta ---
  addPointOfSale: async (data) => {
    const res = await source.createPos(data);
    if (res.ok) set((s) => ({ pointsOfSale: [...s.pointsOfSale, res.pos].sort((a, b) => a.name.localeCompare(b.name)) }));
    return { ok: res.ok, error: res.error };
  },
  updatePointOfSale: async (id, patch) => {
    const res = await source.updatePos(id, patch);
    if (res.ok) set((s) => ({ pointsOfSale: s.pointsOfSale.map((p) => (p.id === id ? res.pos : p)) }));
    return { ok: res.ok, error: res.error };
  },
  removePointOfSale: async (id) => {
    const res = await source.deletePos(id);
    if (res.ok) set((s) => ({ pointsOfSale: s.pointsOfSale.filter((p) => p.id !== id) }));
    return { ok: res.ok, error: res.error };
  },

  // --- Repartidores ---
  addDriver: async (data) => {
    const res = await source.createDriver(data);
    if (res.ok) set((s) => ({ drivers: [...s.drivers, res.driver].sort((a, b) => a.name.localeCompare(b.name)) }));
    return { ok: res.ok, error: res.error };
  },
  updateDriver: async (id, patch) => {
    const res = await source.updateDriver(id, patch);
    if (res.ok) set((s) => ({ drivers: s.drivers.map((d) => (d.id === id ? res.driver : d)) }));
    return { ok: res.ok, error: res.error };
  },
  removeDriver: async (id) => {
    const res = await source.deleteDriver(id);
    if (res.ok)
      set((s) => ({
        drivers: s.drivers.filter((d) => d.id !== id),
        shifts: s.shifts.filter((sh) => sh.driverId !== id),
      }));
    return { ok: res.ok, error: res.error };
  },
}));
