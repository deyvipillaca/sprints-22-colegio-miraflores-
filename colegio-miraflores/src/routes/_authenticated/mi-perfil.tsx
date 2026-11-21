import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Tarjeta } from "@/components/escolar/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeError, avisar } from "@/lib/escolar";

export const Route = createFileRoute("/_authenticated/mi-perfil")({
  head: () => ({ meta: [{ title: "Mis datos — Colegio Miraflores" }] }),
  component: MiPerfil,
});

function MiPerfil() {
  const s = useSesion();
  const router = useRouter();
  const [nombre, setNombre] = useState(s.apoderado?.nombre ?? s.nombre);
  const [dni, setDni] = useState(s.apoderado?.dni ?? "");
  const [telefono, setTelefono] = useState(s.apoderado?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{8}$/.test(dni)) return avisar("El DNI debe tener 8 dígitos.");
    if (!/^\d{9}$/.test(telefono)) return avisar("El celular debe tener 9 dígitos.");
    setGuardando(true);
    const { error } = await supabase.rpc("vincular_apoderado", { _nombre: nombre.trim(), _dni: dni, _telefono: telefono });
    if (!error) await supabase.from("profiles").update({ nombre: nombre.trim() }).eq("id", s.userId);
    setGuardando(false);
    if (error) return avisar(mensajeError(error));
    toast.success("Datos guardados.");
    await router.invalidate();
  }

  return (
    <>
      <EncabezadoPagina icono={UserRound} titulo="Mis datos" descripcion="Datos del apoderado que recibirá los avisos del colegio." />
      <Tarjeta className="max-w-xl">
        <form onSubmit={guardar} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="dni">DNI</Label>
              <Input id="dni" inputMode="numeric" maxLength={8} value={dni} disabled={!!s.apoderado} onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tel">Celular</Label>
              <Input id="tel" inputMode="numeric" maxLength={9} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} required />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Correo</Label>
            <Input value={s.email} disabled />
          </div>
          <Button type="submit" disabled={guardando} className="w-fit">
            {guardando ? "Guardando…" : "Guardar datos"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Sus datos se usan solo para la gestión escolar, conforme a la Ley N.° 29733 de protección de datos personales.
          </p>
        </form>
      </Tarjeta>
    </>
  );
}
