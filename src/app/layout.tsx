import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { AuthGate } from "@/components/AuthGate";
import { FleetGate } from "@/components/FleetGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";
import "./redesign.css";

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
        {/* Barra navy de marca (igual en claro y oscuro) con filete rojo → azul. */}
        <header className="ed-bar px-4 2xl:px-6">
          <Link href="/" className="ed-brand" aria-label="Farmacias Pasteur · Flota Horarios, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BP}/pasteur-wordmark-blanco.png`} alt="" height={24} />
            <span>Flota</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <AppNav />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-[1920px] px-4 py-6 2xl:px-6">
          <AuthGate>
            <FleetGate>{children}</FleetGate>
          </AuthGate>
        </main>
      </body>
    </html>
  );
}
