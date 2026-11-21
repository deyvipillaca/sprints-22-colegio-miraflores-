import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { modoLocal, supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Escudo } from "@/components/escolar/escudo";
import { mensajeError } from "@/lib/escolar";

const searchSchema = z.object({
  redirect: z.string().optional(),
  modo: z.enum(["ingreso", "registro"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Ingresar — Colegio Miraflores" },
      { name: "description", content: "Ingrese o cree su cuenta para gestionar matrículas y asistencia del Colegio Miraflores." },
      { property: "og:title", content: "Ingresar — Colegio Miraflores" },
      { property: "og:description", content: "Acceso para apoderados, docentes y personal del Colegio Miraflores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function destinoSeguro(r?: string) {
  if (!r) return "/panel";
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin || u.pathname.startsWith("/auth")) return "/panel";
    return u.pathname + u.search;
  } catch {
    return "/panel";
  }
}

function GoogleG() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"ingreso" | "registro" | "olvido">(search.modo ?? "ingreso");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
      if (modo === "ingreso") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: destinoSeguro(search.redirect), replace: true });
      } else if (modo === "registro") {
        if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/panel", data: { nombre } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/panel", replace: true });
        else setEnviado("Le enviamos un correo para confirmar su cuenta. Ábralo y luego ingrese.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setEnviado("Si el correo está registrado, recibirá un enlace para crear una nueva contraseña.");
      }
    } catch (err) {
      const m = mensajeError(err);
      toast.error(m === "Invalid login credentials" ? "Correo o contraseña incorrectos." : m);
    } finally {
      setCargando(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error("No se pudo iniciar sesión. Intente de nuevo.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: destinoSeguro(search.redirect), replace: true });
  }

  const titulo = modo === "ingreso" ? "Ingresar" : modo === "registro" ? "Crear cuenta" : "Recuperar contraseña";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-mar text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 texture-olas" />
        <div className="relative flex items-center gap-3">
          <Escudo className="size-12" />
          <span className="font-display text-xl font-semibold">Colegio Miraflores</span>
        </div>
        <div className="relative">
          <p className="font-display text-4xl font-semibold leading-tight">
            “Educar es acompañar cada día.”
          </p>
          <p className="mt-4 max-w-md text-primary-foreground/75">
            Apoderados, docentes y personal administrativo ingresan con su propia cuenta. Cada uno ve solo lo que le
            corresponde.
          </p>
        </div>
        <div className="relative text-sm text-primary-foreground/60">Matrícula · Asistencia · Avisos</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-subir">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Escudo className="size-10" />
            <span className="font-display text-lg font-semibold">Colegio Miraflores</span>
          </div>
          <h1 className="text-3xl font-semibold">{titulo}</h1>
          <p className="mt-1 text-muted-foreground">
            {modo === "registro"
              ? "Para apoderados que matricularán a sus hijos."
              : modo === "olvido"
                ? "Le enviaremos un enlace a su correo."
                : "Bienvenido de nuevo."}
          </p>

          {enviado ? (
            <div className="mt-8 rounded-xl border bg-success-soft p-4 text-sm text-success">{enviado}</div>
          ) : (
            <>
              {!modoLocal && modo !== "olvido" && (
                <div className="mt-8 grid gap-2">
                  <Button type="button" variant="outline" size="lg" onClick={() => social("google")}>
                    <GoogleG /> Continuar con Google
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={() => social("lovable")}>
                    <LovableMark className="size-[18px]" /> Continuar con Lovable
                  </Button>
                  <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" /> o con su correo <div className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}
              {modoLocal && modo === "ingreso" && (
                <details className="my-5 rounded-xl border p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-primary">Cuentas de demostración</summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries({
                      admin: "Administración", apoderado: "Apoderado", docente: "Docente",
                      secretaria: "Secretaría", tesoreria: "Tesorería", director: "Dirección", auxiliar: "Auxiliar",
                    }).map(([rol, etiqueta]) => (
                      <Button key={rol} type="button" size="sm" variant="outline" onClick={() => {
                        setEmail(rol + "@miraflores.test");
                        setPassword("Miraflores2026!");
                      }}>{etiqueta}</Button>
                    ))}
                  </div>
                </details>
              )}
              <form onSubmit={enviar} className={modo === "olvido" ? "mt-8 grid gap-4" : "grid gap-4"}>
                {modo === "registro" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="nombre">Nombre completo</Label>
                    <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {modo !== "olvido" && (
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Contraseña</Label>
                      {!modoLocal && modo === "ingreso" && (
                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => setModo("olvido")}>
                          ¿La olvidó?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={modo === "registro" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
                <Button type="submit" size="lg" disabled={cargando} className="mt-2">
                  {cargando ? "Un momento…" : modo === "ingreso" ? "Ingresar" : modo === "registro" ? "Crear cuenta" : "Enviar enlace"}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {modo === "ingreso" ? (
              <>
                ¿No tiene cuenta?{" "}
                <button className="font-medium text-primary hover:underline" onClick={() => { setModo("registro"); setEnviado(null); }}>
                  Regístrese
                </button>
              </>
            ) : (
              <button className="font-medium text-primary hover:underline" onClick={() => { setModo("ingreso"); setEnviado(null); }}>
                Volver a ingresar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
