"use client";

import { useState } from "react";
import { Smartphone, ExternalLink, RefreshCw } from "lucide-react";
import { Button, Card, Eyebrow, IconChip } from "@/components/ui";

// Inventario de equipos (Google Sheets publicado en la web).
const SHEET_ID = "1w-Ys6tEvV7D26LJHKs0t3OExbKWllBZubvMLnzt8-1g";
// URL de publicación (Archivo → Publicar en la Web → pestaña Insertar).
const EMBED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRt27LVxf15HEZfKdgIK5cRPthIfiHdE7omo26FVaZeKQr36K5lHgTUtICtYTNh4QxI2sa0kB-BooyB/pubhtml?widget=true&headers=false";
const OPEN_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

/** Módulo Inventario de Equipos: muestra la hoja de Google en vivo. */
export function EquipmentInventory() {
  const [nonce, setNonce] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Operación · activos</Eyebrow>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-light tracking-tight text-slate-900 sm:text-2xl">
            <IconChip icon={<Smartphone size={16} />} /> Inventario de Equipos
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Dispositivos de la flota por punto de venta y zona (IMEI, operador, entrega, NFC/QR).
            La hoja de Google se muestra en vivo dentro de la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw size={15} /> Actualizar
          </Button>
          <Button onClick={() => window.open(OPEN_URL, "_blank", "noopener,noreferrer")}>
            <ExternalLink size={15} /> Abrir en Google Sheets
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <iframe
          key={nonce}
          src={EMBED_URL}
          title="Inventario de Equipos · Flota Pasteur"
          className="h-[72vh] w-full border-0 bg-white"
          loading="lazy"
        />
      </Card>

      <p className="text-xs text-slate-400">
        ¿No se muestra la hoja? En Google Sheets: <strong className="text-slate-500">Archivo → Compartir → Publicar en la Web</strong> (hoja “Inventario Equipos”).
        Mientras tanto, usa “Abrir en Google Sheets”.
      </p>
    </div>
  );
}
