"use client";

import Link from "next/link";
import { UserSearch, LayoutDashboard, CalendarDays, ArrowRight, Eye } from "lucide-react";
import { Card, CardContent, Eyebrow } from "@/components/ui";
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

  const dispatcher: Entry = {
    href: "/dashboard",
    title: "Panel Dispatcher",
    desc: "Gestión de flota: zonas, cobertura, calendario, asignación y vacaciones.",
    icon: <LayoutDashboard size={20} />,
    tint: "bg-accent-soft text-accent",
  };
  const supervisor: Entry = {
    href: "/dashboard",
    title: "Panel de supervisión",
    desc: "Visualiza toda la flota en modo solo lectura: entidades, cobertura, calendario y reportes.",
    icon: <Eye size={20} />,
    tint: "bg-brand-50 text-brand-700",
  };
  const calendario: Entry = {
    href: "/calendario",
    title: "Calendario de turnos",
    desc: "Consulta la malla del mes por zona.",
    icon: <CalendarDays size={20} />,
    tint: "bg-emerald-50 text-emerald-700",
  };

  const entries: Entry[] =
    role === "admin"
      ? [repartidor, dispatcher]
      : role === "supervisor"
        ? [repartidor, supervisor]
        : [repartidor, calendario];

  return (
    <div className="mx-auto max-w-4xl py-12 sm:py-16">
      <div className="max-w-2xl">
        <Eyebrow>Plataforma operativa · Pasteur</Eyebrow>
        <h1 className="mt-4 text-4xl font-light leading-[1.03] tracking-tight text-slate-900 sm:text-6xl">
          Plataforma de horarios de flota
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
          Consulta y gestión de turnos para repartidores de Farmacias Pasteur.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {entries.map((e) => (
          <Link key={e.href} href={e.href}>
            <Card className="h-full p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex items-start justify-between">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${e.tint}`}>
                  {e.icon}
                </span>
                <ArrowRight
                  size={18}
                  className="text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-brand-600"
                />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{e.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{e.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                Entrar <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
