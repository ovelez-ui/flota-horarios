"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserSearch, Settings2, CalendarDays, LogOut, Eye, type LucideIcon } from "lucide-react";
import { useAuth, type Role } from "@/hooks/use-auth";

type NavLink = { href: string; label: string; icon: LucideIcon };

/** Destinos del encabezado según el rol. */
const LINKS: Record<Role, NavLink[]> = {
  admin: [
    { href: "/repartidor", label: "Repartidor", icon: UserSearch },
    { href: "/dashboard", label: "Dispatcher", icon: LayoutDashboard },
    { href: "/admin", label: "Admin", icon: Settings2 },
  ],
  supervisor: [
    { href: "/repartidor", label: "Repartidor", icon: UserSearch },
    { href: "/dashboard", label: "Supervisión", icon: Eye },
  ],
  tienda: [
    { href: "/repartidor", label: "Repartidor", icon: UserSearch },
    { href: "/calendario", label: "Calendario", icon: CalendarDays },
  ],
};

/** Navegación del encabezado según el rol del usuario. */
export function AppNav() {
  const role = useAuth((s) => s.role);
  const email = useAuth((s) => s.email);
  const signOut = useAuth((s) => s.signOut);
  const pathname = usePathname();

  if (role === null) return null; // sin sesión → solo el login

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Principal">
      {LINKS[role].map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="ed-barlink"
          aria-current={pathname.startsWith(href) ? "page" : undefined}
          aria-label={label}
        >
          <Icon size={16} aria-hidden /> <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}

      {email && <span className="mx-1 hidden text-xs text-[#a3b6d0] lg:inline">{email}</span>}
      <button onClick={() => void signOut()} className="ed-barlink" aria-label="Cerrar sesión" title="Cerrar sesión">
        <LogOut size={16} aria-hidden />
      </button>
    </nav>
  );
}
