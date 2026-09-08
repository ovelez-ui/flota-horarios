"use client";

import Link from "next/link";
import { UserSearch, LayoutDashboard, CalendarDays, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";

interface Entry {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tint: string;
}

export default function HomePage() {
  const role = useAuth((s) => s.role);

  const repartidor: Entry = {
    href: "/repartidor",
    title: "Vista Repartidor",
    desc: "Consulta la malla mensual por cédula: turnos, horas y días laborados.",
    icon: <UserSearch size={20} />,
    tint: "bg-brand-50 text-brand-700",
  };

  const entries: Entry[] =
    role === "admin"
      ? [
          repartidor,
          {
            href: "/dashboard",
            title: "Panel Dispatcher",
            desc: "Gestión de flota: zonas, cobertura, calendario, asignación y vacaciones.",
            icon: <LayoutDashboard size={20} />,
            tint: "bg-accent-soft text-accent",
          },
        ]
      : [
          repartidor,
          {
            href: "/calendario",
            title: "Calendario de turnos",
            desc: "Consulta la malla del mes por zona.",
            icon: <CalendarDays size={20} />,
            tint: "bg-emerald-50 text-emerald-700",
          },
        ];

  return (
    <div className="mx-auto max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-slate-900">Plataforma de horarios de flota</h1>
      <p className="mt-2 text-slate-600">
        Consulta y gestión de turnos para repartidores de Farmacias Pasteur.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {entries.map((e) => (
          <Link key={e.href} href={e.href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="pt-5">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${e.tint}`}>
                  {e.icon}
                </div>
                <h2 className="mt-3 flex items-center gap-1 font-semibold text-slate-900">
                  {e.title}
                  <ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" />
                </h2>
                <p className="mt-1 text-sm text-slate-600">{e.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
