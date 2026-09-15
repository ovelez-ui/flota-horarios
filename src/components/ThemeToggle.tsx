"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "flota-theme";

/** Interruptor de tema claro/oscuro. Persiste la elección y respeta el sistema. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // La clase ya la fija un script inline antes de pintar; sincronizamos el estado.
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  function toggle() {
    // Lee el estado real del DOM (fuente de verdad) para evitar carreras de hidratación.
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* almacenamiento no disponible */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700"
      title={dark ? "Modo claro" : "Modo oscuro"}
      aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      {/* Evita el parpadeo del ícono equivocado antes de leer la preferencia. */}
      {ready && (dark ? <Sun size={18} /> : <Moon size={18} />)}
    </button>
  );
}
