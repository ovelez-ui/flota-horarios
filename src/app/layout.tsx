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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-brand-700">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-white">
                <Truck size={18} />
              </span>
              Flota Horarios
            </Link>
            <AppNav />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">
          <AuthGate>
            <FleetGate>{children}</FleetGate>
          </AuthGate>
        </main>
      </body>
    </html>
  );
}
