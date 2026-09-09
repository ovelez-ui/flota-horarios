import type { Metadata } from "next";
import Link from "next/link";
import { Truck } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { AuthGate } from "@/components/AuthGate";
import { FleetGate } from "@/components/FleetGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flota Horarios · Pasteur",
  description: "Gestión y visualización de horarios para la flota de repartidores.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-full font-sans">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 shadow-[0_1px_3px_rgb(15_23_42/0.04)] backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1760px] items-center justify-between px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold text-brand-800">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm">
                <Truck size={18} />
              </span>
              <span className="hidden sm:inline">Flota Horarios</span>
            </Link>
            <AppNav />
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
