import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Escudo } from "@/components/escolar/escudo";
import { mensajeError, avisar } from "@/lib/escolar";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña — Colegio Miraflores" },
      { name: "description", content: "Cree una nueva contraseña para su cuenta del Colegio Miraflores." },
      { property: "og:title", content: "Nueva contraseña — Colegio Miraflores" },
      { property: "og:description", content: "Restablezca el acceso a su cuenta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return avisar("Use al menos 8 caracteres.");
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);
    if (error) return avisar(mensajeError(error));
    toast.success("Contraseña actualizada.");
    navigate({ to: "/panel", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={guardar} className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-soft">
        <Escudo className="size-10" />
        <h1 className="mt-4 text-2xl font-semibold">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escriba la contraseña que usará desde ahora.</p>
        <div className="mt-6 grid gap-1.5">
          <Label htmlFor="pw">Contraseña</Label>
          <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={cargando}>
          {cargando ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}
