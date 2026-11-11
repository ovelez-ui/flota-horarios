"use client";

/**
 * Microinteracciones del rediseño. Todas respetan `prefers-reduced-motion`
 * y solo tocan transform/opacity (sin reflujo).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Cifra que cuenta hasta `value` (expo-out). Es dueña de su estado: no re-renderiza al padre. */
export function CountUp({ value, ms = 1200 }: { value: number; ms?: number }) {
  const [shown, setShown] = React.useState(0);
  const shownRef = React.useRef(0);

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const from = shownRef.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / ms, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      shownRef.current = Math.round(from + (value - from) * eased);
      setShown(shownRef.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return <>{shown}</>;
}

/** Zona de atracción: el hijo se desplaza hacia el cursor (solo con puntero fino). */
export function Magnetic({ children }: { children: React.ReactNode }) {
  const zone = React.useRef<HTMLSpanElement>(null);

  function move(e: React.PointerEvent<HTMLSpanElement>) {
    const el = zone.current;
    const target = el?.firstElementChild as HTMLElement | null;
    if (!el || !target || e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.28;
    const y = (e.clientY - r.top - r.height / 2) * 0.4;
    target.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  function leave() {
    const target = zone.current?.firstElementChild as HTMLElement | null;
    if (target) target.style.transform = "";
  }

  return (
    <span ref={zone} className="ed-magnet" onPointerMove={move} onPointerLeave={leave}>
      {children}
    </span>
  );
}

/** Foco de luz que sigue al cursor dentro de una celda (`.ed-cell`). */
export function spotlight(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** true mientras el elemento está fuera del viewport (bajo la barra fija). */
export function useOutOfView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = React.useRef<T>(null);
  const [out, setOut] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOut(!entry!.isIntersecting), {
      rootMargin: "-112px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, out];
}

/** Celda que se revela (una sola vez) al entrar al viewport. */
export function Reveal({
  as: Tag = "div",
  index = 0,
  className,
  children,
  ...rest
}: {
  as?: "div" | "article" | "section" | "header";
  index?: number;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry!.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={cn("ed-rise", seen && "ed-in", className)}
      style={{ "--i": index } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
