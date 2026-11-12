"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo en movimiento del acceso: un mapa de despacho abstracto.
 * Sobre una retícula de calles, cada ruta sale de la base (que late con ondas)
 * hacia una tienda y una moto (un punto con estela) la recorre; al llegar, la
 * tienda emite un pulso y nace una ruta nueva. Una sola ruta va en rojo de señal.
 *
 * Rendimiento y accesibilidad:
 * - Un único <canvas> 2D, DPR limitado a 2, ~20 polilíneas por cuadro.
 * - Se pausa con la pestaña oculta y se reconstruye al cambiar de tamaño.
 * - Con `prefers-reduced-motion` dibuja un solo cuadro estático.
 * - Decorativo: `aria-hidden` y sin eventos de puntero.
 */

const CELL = 56; // lado de la manzana, en px
const REVEAL_S = 1.6; // lo que tarda una ruta en trazarse
const FADE_S = 0.9; // lo que tarda en desvanecerse al terminar
const HUB_PERIOD_S = 2.6; // cada cuánto late la base
const HUB_REACH = CELL * 5; // hasta dónde llegan sus ondas

type Point = { x: number; y: number };

interface Route {
  points: Point[];
  /** Longitud acumulada hasta cada punto; el último valor es la longitud total. */
  lengths: number[];
  age: number; // segundos desde que nació
  delay: number; // espera antes de que salga la moto
  speed: number; // px/s
  trail: number; // largo de la estela, px
  doneAt: number | null; // `age` en el que llegó a la tienda
  signal: boolean; // la ruta en rojo
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

/** Ruta de la base a una tienda: alterna tramos horizontales y verticales, siempre alejándose. */
function makeRoute(cols: number, rows: number, hub: Point, signal: boolean): Route {
  let cx = hub.x;
  let cy = hub.y;
  const cells: Point[] = [{ x: cx, y: cy }];
  const steps = randInt(4, 8);
  const heading = Math.random() < 0.5 ? 1 : -1;
  const first = Math.random() < 0.5 ? 0 : 1; // unas salen en horizontal, otras en vertical
  for (let i = first; i < steps + first; i++) {
    if (i % 2 === 0) {
      cx += randInt(2, 5) * (Math.random() < 0.9 ? heading : -heading);
      cx = Math.max(-1, Math.min(cols + 1, cx));
    } else {
      cy += randInt(1, 4) * (Math.random() < 0.5 ? 1 : -1);
      cy = Math.max(0, Math.min(rows, cy));
    }
    const last = cells[cells.length - 1]!;
    if (last.x !== cx || last.y !== cy) cells.push({ x: cx, y: cy });
  }
  const points = cells.map((c) => ({ x: c.x * CELL, y: c.y * CELL }));
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    lengths.push(lengths[i - 1]! + Math.abs(b.x - a.x) + Math.abs(b.y - a.y));
  }
  return {
    points, lengths, signal,
    age: 0,
    delay: rand(0.1, 1.8),
    speed: rand(90, 150),
    trail: rand(150, 260),
    doneAt: null,
  };
}

/** Punto a una distancia `d` del inicio de la ruta. */
function pointAt(route: Route, d: number): Point {
  const { points, lengths } = route;
  for (let i = 1; i < points.length; i++) {
    if (d <= lengths[i]!) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const t = (d - lengths[i - 1]!) / (lengths[i]! - lengths[i - 1]! || 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return points[points.length - 1]!;
}

export function RouteField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let routes: Route[] = [];
    let hub: Point = { x: 0, y: 0 }; // en celdas
    let clock = 0;
    let colors = { ink: "#011a4b", data: "#003b71", signal: "#c81a13" };
    let raf = 0;
    let last = 0;

    function readColors() {
      const css = getComputedStyle(document.documentElement);
      colors = {
        ink: css.getPropertyValue("--ink").trim() || colors.ink,
        data: css.getPropertyValue("--data").trim() || colors.data,
        signal: css.getPropertyValue("--signal").trim() || colors.signal,
      };
    }

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
      // La base queda en el vacío entre el titular y el formulario (centrada en móvil).
      hub = width < 1024
        ? { x: Math.round(cols * 0.5), y: Math.round(rows * 0.42) }
        : { x: Math.round(cols * 0.55), y: Math.round(rows * 0.5) };
      const count = Math.max(8, Math.min(26, Math.round((width * height) / 55000)));
      routes = Array.from({ length: count }, (_, i) => makeRoute(cols, rows, hub, i === 0));
      // Arranque escalonado; con movimiento reducido, todas ya trazadas y a medio camino.
      routes.forEach((r, i) => {
        r.age = reduce ? r.delay + (r.lengths[r.lengths.length - 1]! * 0.6) / r.speed + REVEAL_S : -i * 0.12;
      });
    }

    function trace(route: Route) {
      ctx!.beginPath();
      route.points.forEach((p, i) => (i === 0 ? ctx!.moveTo(p.x, p.y) : ctx!.lineTo(p.x, p.y)));
    }

    function draw(dt: number) {
      ctx!.clearRect(0, 0, width, height);

      // Esquinas de la retícula.
      ctx!.globalAlpha = 0.16;
      ctx!.fillStyle = colors.ink;
      for (let x = 0; x <= cols; x++) for (let y = 0; y <= rows; y++) ctx!.fillRect(x * CELL - 0.75, y * CELL - 0.75, 1.5, 1.5);

      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";

      // La base: ondas que se expanden y un marcador sólido.
      clock += dt;
      const hx = hub.x * CELL;
      const hy = hub.y * CELL;
      ctx!.strokeStyle = colors.ink;
      for (let k = 0; k < 3; k++) {
        const t = ((clock / HUB_PERIOD_S + k / 3) % 1 + 1) % 1;
        ctx!.globalAlpha = 0.26 * (1 - t) * (1 - t);
        ctx!.lineWidth = 1.25;
        ctx!.beginPath();
        ctx!.arc(hx, hy, 10 + HUB_REACH * (1 - Math.pow(1 - t, 2)), 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = colors.ink;
      ctx!.fillRect(hx - 6, hy - 6, 12, 12);

      routes.forEach((route, index) => {
        route.age += dt;
        if (route.age < 0) return;
        const total = route.lengths[route.lengths.length - 1]!;
        const reveal = Math.min(route.age / REVEAL_S, 1);
        const fade = route.doneAt === null ? 1 : Math.max(0, 1 - (route.age - route.doneAt) / FADE_S);
        const color = route.signal ? colors.signal : colors.data;
        const end = route.points[route.points.length - 1]!;

        // Calle de la ruta: se traza de la base hacia la tienda.
        trace(route);
        ctx!.setLineDash([total * (1 - Math.pow(1 - reveal, 3)), total]);
        ctx!.lineDashOffset = 0;
        ctx!.strokeStyle = colors.ink;
        ctx!.lineWidth = 1;
        ctx!.globalAlpha = 0.2 * fade;
        ctx!.stroke();

        // Tienda de destino.
        if (reveal === 1) {
          ctx!.setLineDash([]);
          ctx!.globalAlpha = 0.5 * fade;
          ctx!.strokeRect(end.x - 3.5, end.y - 3.5, 7, 7);
        }

        // Moto: estela en tres capas (larga y tenue → corta e intensa) y punto de cabeza.
        const travelled = Math.max(0, route.age - route.delay) * route.speed;
        if (travelled > 0) {
          const head = Math.min(travelled, total);
          for (const [share, alpha, lineWidth] of [[1, 0.22, 1.5], [0.55, 0.45, 2.25], [0.22, 0.9, 3]] as const) {
            const len = Math.min(route.trail * share, head);
            trace(route);
            ctx!.setLineDash([len, total + route.trail]);
            ctx!.lineDashOffset = -(head - len);
            ctx!.strokeStyle = color;
            ctx!.lineWidth = lineWidth;
            ctx!.globalAlpha = alpha * fade;
            ctx!.stroke();
          }
          ctx!.setLineDash([]);
          const p = pointAt(route, head);
          ctx!.fillStyle = color;
          ctx!.globalAlpha = 0.18 * fade; // halo
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, route.signal ? 12 : 9, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = fade;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, route.signal ? 4.5 : 3.5, 0, Math.PI * 2);
          ctx!.fill();

          if (travelled >= total && route.doneAt === null) route.doneAt = route.age;
        }

        // Entrega: pulso en la tienda y relevo por una ruta nueva.
        if (route.doneAt !== null) {
          const t = (route.age - route.doneAt) / FADE_S;
          ctx!.setLineDash([]);
          ctx!.globalAlpha = Math.max(0, 0.6 * (1 - t));
          ctx!.strokeStyle = color;
          ctx!.lineWidth = 1.25;
          ctx!.beginPath();
          ctx!.arc(end.x, end.y, 5 + 22 * (1 - Math.pow(1 - Math.min(t, 1), 3)), 0, Math.PI * 2);
          ctx!.stroke();
          if (t >= 1 && !reduce) routes[index] = makeRoute(cols, rows, hub, route.signal);
        }
      });
      ctx!.globalAlpha = 1;
      ctx!.setLineDash([]);
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05); // tope: evita saltos al volver a la pestaña
      last = now;
      draw(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (reduce) {
        draw(0);
        return;
      }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    }

    readColors();
    build();
    start();

    const resize = new ResizeObserver(() => {
      build();
      if (reduce) draw(0);
    });
    resize.observe(canvas);
    // El tema cambia con la clase `dark` en <html>: vuelve a leer los colores.
    const theme = new MutationObserver(() => {
      readColors();
      if (reduce) draw(0);
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="ed-routefield" aria-hidden />;
}
