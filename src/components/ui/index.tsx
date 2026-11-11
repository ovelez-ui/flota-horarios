/**
 * Kit de UI mínimo, estilo Shadcn (headless + Tailwind).
 * Componentes accesibles y componibles, sin dependencias externas de UI.
 *
 * Lenguaje "Despacho Editorial": superficies planas con filete fino, sin
 * degradados ni sombras; el color queda para los datos. Tokens en globals.css.
 */
import * as React from "react";
import { X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/** Aviso de solo lectura (perfil supervisor). */
export function ReadOnlyBanner({ text }: { text?: string }) {
  return (
    <p className="mb-3 flex items-center gap-2 border border-line bg-surface p-2.5 text-sm text-muted">
      <Eye size={15} className="shrink-0" aria-hidden />
      {text ?? "Vista de supervisor: solo lectura, no se pueden guardar cambios."}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("group border border-line bg-surface", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-lg tracking-tight text-ink", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

/**
 * Ícono dentro de un marco para encabezados de sección.
 * - variant "gradient" (por defecto; nombre histórico): marco de tinta, plano.
 * - variant "soft": marco tintado (para variar el acento).
 */
export function IconChip({
  icon,
  variant = "gradient",
  tint = "bg-brand-50 text-brand-700 ring-brand-100",
  className,
}: {
  icon: React.ReactNode;
  variant?: "gradient" | "soft";
  tint?: string;
  className?: string;
}) {
  const base = "grid h-9 w-9 shrink-0 place-items-center";
  if (variant === "soft") {
    return <span className={cn(base, "ring-1 ring-inset", tint, className)}>{icon}</span>;
  }
  return <span className={cn(base, "border border-ink text-ink", className)}>{icon}</span>;
}

/** Etiqueta "eyebrow": micro-título monoespaciado en mayúsculas. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("ed-eyebrow inline-flex items-center gap-1.5", className)}>{children}</span>;
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-accent-soft text-accent ring-red-100",
  muted: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset",
        badgeStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "outline" | "ghost" | "glass";

// El rojo se reserva para la acción principal de cada vista (.ed-cta);
// el botón primario del kit es tinta sobre papel.
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:opacity-90 active:translate-y-px",
  outline: "border border-line bg-surface text-ink hover:border-ink",
  ghost: "text-muted hover:bg-line-soft hover:text-ink",
  glass: "border border-line text-ink hover:border-ink",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-data focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Input / Select
// ---------------------------------------------------------------------------

const controlClass =
  "h-10 w-full rounded border border-slate-300 bg-surface px-3 text-sm text-ink placeholder:text-slate-400 focus:border-data focus:outline-none focus:ring-2 focus:ring-brand-600/30";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClass, className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(controlClass, className)} {...props}>
      {children}
    </select>
  );
});

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("ed-eyebrow border-b border-line text-left", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-line-soft last:border-0", className)} {...props} />;
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 font-medium", className)} {...props} />;
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-2.5 align-middle", className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(1_13_38/0.6)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg border border-line bg-surface shadow-pop animate-fade-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="font-serif text-lg tracking-tight text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-line-soft hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field (label + control wrapper)
// ---------------------------------------------------------------------------

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
