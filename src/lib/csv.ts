/**
 * Utilidades para exportar reportes a CSV en el navegador (sin backend).
 * Se usa `;` como separador y BOM UTF-8 para que Excel (es-CO) lea acentos
 * y separe columnas correctamente.
 */

type Cell = string | number | null | undefined;

export function toCSV(rows: Cell[][]): string {
  const esc = (v: Cell) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

/** Genera y descarga un archivo CSV en el navegador. */
export function downloadCSV(filename: string, rows: Cell[][]): void {
  const csv = "﻿" + toCSV(rows); // BOM UTF-8 para que Excel lea acentos
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
