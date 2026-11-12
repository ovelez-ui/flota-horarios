"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Field, Input } from "@/components/ui";
import { Magnetic } from "@/components/ui/motion";
import { RouteField } from "@/components/RouteField";

/**
 * Acceso: composición asimétrica 7/5. A la izquierda el nombre del producto
 * como titular; a la derecha, un formulario de dos campos y una sola acción.
 */
function LoginForm() {
  const signIn = useAuth((s) => s.signIn);
  const signingIn = useAuth((s) => s.signingIn);
  const error = useAuth((s) => s.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`grid min-h-[78vh] items-center gap-12 py-8 lg:grid-cols-[7fr_5fr] lg:gap-20 lg:px-[2.5vw] ${ready ? "ed-ready" : ""}`}>
      <RouteField />
      <div className="min-w-0">
        <p className="ed-eyebrow ed-rise">Acceso operativo · Farmacias Pasteur</p>
        <h1 className="ed-rise mt-5 font-serif text-[clamp(3.5rem,11vw,9.5rem)] font-light leading-[0.86] tracking-[-0.04em] text-ink" style={{ "--i": 1 } as React.CSSProperties}>
          Flota{" "}
          <br />
          <em className="font-light">Horarios</em>
        </h1>
        <p className="ed-lead ed-rise !mt-8 !max-w-[30ch] !text-[clamp(1.25rem,2vw,1.75rem)]" style={{ "--i": 2 } as React.CSSProperties}>
          La malla de turnos de última milla, en una sola mirada.
        </p>
      </div>

      <form
        className="ed-rise w-full max-w-md justify-self-start border-t border-ink bg-paper pt-6 lg:justify-self-end lg:px-8 lg:pb-8"
        style={{ "--i": 3 } as React.CSSProperties}
        aria-labelledby="login-title"
        onSubmit={(e) => {
          e.preventDefault();
          void signIn(email.trim(), password);
        }}
      >
        <h2 id="login-title" className="font-serif text-2xl tracking-tight text-ink">Ingresa para continuar</h2>
        <div className="mt-6 space-y-4">
          <Field label="Correo">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tienda@pasteur.com.co"
              className="h-12 text-base"
              aria-invalid={error ? true : undefined}
              required
            />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-base"
              aria-invalid={error ? true : undefined}
              required
            />
          </Field>
        </div>

        <p role="alert" className="mt-3 min-h-[1.25rem] text-sm font-bold text-signal">
          {error && `No pudimos iniciar sesión: ${error}. Revisa el correo y la contraseña.`}
        </p>

        <div className="mt-4">
          <Magnetic>
            <button type="submit" className="ed-cta disabled:opacity-60" disabled={signingIn}>
              {signingIn ? "Ingresando…" : "Ingresar"}
              {signingIn ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ArrowUpRight size={18} strokeWidth={2.25} aria-hidden />}
            </button>
          </Magnetic>
        </div>
        <p className="mt-8 text-sm text-muted">Acceso restringido al equipo de última milla.</p>
      </form>
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
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted" role="status">
        <Loader2 className="animate-spin text-ink" size={24} aria-hidden /> Cargando…
      </div>
    );
  }

  if (role === null) return <LoginForm />;

  return <>{children}</>;
}
