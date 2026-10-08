"use client";

import { useEffect, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Card, CardContent, Field, Input } from "@/components/ui";

const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

function LoginForm() {
  const signIn = useAuth((s) => s.signIn);
  const signingIn = useAuth((s) => s.signingIn);
  const error = useAuth((s) => s.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-[78vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm overflow-hidden shadow-pop">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white">
          {/* Glow decorativo */}
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BP}/pasteur-logo.png`} alt="Pasteur" className="h-12 w-12 rounded-2xl bg-white object-contain p-1.5 ring-1 ring-white/25" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-100/90">
            Acceso operativo
          </p>
          <p className="mt-1 text-2xl font-light leading-tight tracking-tight">Flota Horarios</p>
          <p className="mt-1 text-sm text-brand-100">Ingresa para continuar</p>
        </div>
        <CardContent className="pt-5">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(email.trim(), password);
            }}
          >
            <Field label="Correo">
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tienda@pasteur.com.co"
                required
              />
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && <p className="text-sm text-accent">{error}</p>}
            <Button type="submit" className="mt-1 w-full" disabled={signingIn}>
              <LogIn size={16} /> {signingIn ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">
            Acceso restringido · Farmacias Pasteur
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Exige inicio de sesión antes de renderizar la app (cuando hay Supabase). */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const ready = useAuth((s) => s.ready);
  const role = useAuth((s) => s.role);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-brand-600" size={24} /> Cargando…
      </div>
    );
  }

  if (role === null) return <LoginForm />;

  return <>{children}</>;
}
