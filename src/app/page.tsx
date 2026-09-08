import Link from "next/link";
import { UserSearch, LayoutDashboard, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-slate-900">
        Plataforma de horarios de flota
      </h1>
      <p className="mt-2 text-slate-600">
        Consulta y gestión de turnos para repartidores de Farmacias Pasteur.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/repartidor" className="group">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="pt-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <UserSearch size={20} />
              </div>
              <h2 className="mt-3 flex items-center gap-1 font-semibold text-slate-900">
                Vista Repartidor
                <ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" />
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Consulta tu malla mensual por cédula: turnos, horas y días laborados.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard" className="group">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="pt-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent">
                <LayoutDashboard size={20} />
              </div>
              <h2 className="mt-3 flex items-center gap-1 font-semibold text-slate-900">
                Panel Dispatcher
                <ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" />
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Gestión de flota: zonas, puntos de venta, cobertura y asignación de turnos.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
