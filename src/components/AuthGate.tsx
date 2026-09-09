"use client";

import { useEffect, useState } from "react";
import { Loader2, LogIn, Truck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, Card, CardContent, Field, Input } from "@/components/ui";

function LoginForm() {
  const signIn = useAuth((s) => s.signIn);
  const signingIn = useAuth((s) => s.signingIn);
  const error = useAuth((s) => s.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm overflow-hidden shadow-soft">
        <div className="flex items-center gap-3 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Truck size={20} />
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-tight">Flota Horarios</p>
            <p className="text-xs text-brand-100">Ingresa para continuar</p>
          </div>
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
            <Button type="submit" className="w-full" disabled={signingIn}>
              <LogIn size={16} /> {signingIn ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
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
