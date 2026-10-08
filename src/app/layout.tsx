import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { AuthGate } from "@/components/AuthGate";
import { FleetGate } from "@/components/FleetGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// Aplica el tema guardado (o el del sistema) antes de pintar, para evitar parpadeo.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('flota-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

// Prefijo para servir assets de /public bajo el basePath de GitHub Pages.
const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Flota Horarios · Pasteur",
  description: "Gestión y visualización de horarios para la flota de repartidores.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <header className="glass sticky top-0 z-20 border-b border-white/60 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
          <div className="mx-auto flex h-14 max-w-[1760px] items-center justify-between px-4">
            <Link href="/" className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BP}/pasteur-logo.png`}
                alt="Pasteur"
                className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 shadow-[0_4px_14px_-6px_rgba(1,26,75,.45)] ring-1 ring-slate-200 transition-transform duration-200 group-hover:scale-105"
              />
              <span className="leading-none">
                <span className="block text-[15px] font-extrabold tracking-tight text-brand-800 sm:text-base">
                  Flota Horarios
                </span>
                <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
                  Pasteur · última milla
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <AppNav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1760px] px-4 py-6">
          <AuthGate>
            <FleetGate>{children}</FleetGate>
          </AuthGate>
        </main>
      </body>
    </html>
  );
}
