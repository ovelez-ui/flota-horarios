"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface PaletteGroup<Id extends string> {
  label: string;
  items: { id: Id; label: string }[];
}

/** Quita tildes y mayúsculas para comparar ("analitica" encuentra "Analítica"). */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Paleta de comandos (Ctrl/⌘ K): todas las secciones del panel detrás de un
 * buscador. Usa <dialog> nativo: foco atrapado, Escape y fondo inerte gratis.
 */
export function CommandPalette<Id extends string>({
  groups,
  open,
  onClose,
  onSelect,
}: {
  groups: PaletteGroup<Id>[];
  open: boolean;
  onClose: () => void;
  onSelect: (id: Id) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery("");
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const term = normalize(query.trim());
  const visible = groups
    .map((g) => ({
      label: g.label,
      items: g.items.filter((it) => !term || normalize(it.label).includes(term) || normalize(g.label).includes(term)),
    }))
    .filter((g) => g.items.length > 0);

  function choose(id: Id) {
    onSelect(id);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const buttons = [...(list.current?.querySelectorAll("button") ?? [])];
    if (buttons.length === 0) return;
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const input = dialog.current?.querySelector("input");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      buttons[(i + 1) % buttons.length]!.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i <= 0) input?.focus();
      else buttons[i - 1]!.focus();
    } else if (e.key === "Enter" && document.activeElement === input) {
      e.preventDefault();
      buttons[0]!.click();
    }
  }

  return (
    <dialog
      ref={dialog}
      className="ed-cmd"
      aria-label="Ir a una sección"
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === dialog.current) onClose(); // clic en el fondo
      }}
    >
      <div className="ed-cmd-search">
        <Search size={20} aria-hidden />
        <label className="sr-only" htmlFor="ed-cmd-q">Buscar una sección</label>
        <input
          id="ed-cmd-q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="¿A dónde vas? Calendario, reglas, reportes…"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" className="ed-tool" onClick={onClose}>Cerrar</button>
      </div>
      <nav ref={list} className="ed-cmd-list" aria-label="Todas las secciones">
        {visible.map((g) => (
          <div key={g.label}>
            <h3 className="ed-eyebrow">{g.label}</h3>
            <ul>
              {g.items.map((it) => (
                <li key={it.id}>
                  <button type="button" onClick={() => choose(it.id)}>
                    {it.label}
                    <span>{g.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="px-5 py-8 text-muted">Ninguna sección coincide. Prueba con «calendario» o «reportes».</p>
        )}
      </nav>
    </dialog>
  );
}
