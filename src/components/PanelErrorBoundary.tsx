"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/** Evita que un error de una sección tumbe todo el dashboard. */
export class PanelErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="glass rounded-2xl border border-slate-200/70 p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto text-accent" size={26} />
          <p className="mt-3 font-semibold text-slate-800">No se pudo mostrar esta sección</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 break-words">{error.message}</p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
