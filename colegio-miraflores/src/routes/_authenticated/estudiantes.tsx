import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BotonCarnetQR } from "@/components/escolar/carnet-qr";
import { ESTADO_MATRICULA, fechaCorta, gradoLabel, mensajeError, avisar } from "@/lib/escolar";

export const Route = createFileRoute("/_authenticated/estudiantes")({
  head: () => ({ meta: [{ title: "Estudiantes — Colegio Miraflores" }] }),
  component: Estudiantes,
});

type Editando = { id: string; nombres: string; apellidos: string; fecha_nacimiento: string; apoId: string; apoTelefono: string; apoCorreo: string };

function Estudiantes() {
  const s = useSesion();
  const qc = useQueryClient();
  const puedeEditar = s.es("admin", "secretaria");
  const [texto, setTexto] = useState("");
  const [edit, setEdit] = useState<Editando | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["estudiantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estudiantes")
        .select("*, apoderados(*), matriculas(id, estado, grados(*), secciones(nombre), periodos(anio))")
        .order("apellidos");
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return (data ?? []).filter((e) => !t || `${e.nombres} ${e.apellidos} ${e.dni} ${e.apoderados?.nombre} ${e.apoderados?.dni}`.toLowerCase().includes(t));
  }, [data, texto]);

  async function guardar() {
    if (!edit) return;
    const r1 = await supabase.from("estudiantes").update({ nombres: edit.nombres, apellidos: edit.apellidos, fecha_nacimiento: edit.fecha_nacimiento || null }).eq("id", edit.id);
    const r2 = await supabase.from("apoderados").update({ telefono: edit.apoTelefono, correo: edit.apoCorreo }).eq("id", edit.apoId);
    if (r1.error || r2.error) return avisar(mensajeError(r1.error ?? r2.error));
    toast.success("Datos actualizados.");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["estudiantes"] });
  }

  return (
    <>
      <EncabezadoPagina icono={Users} titulo="Estudiantes y apoderados" descripcion={`${data?.length ?? 0} estudiantes registrados.`} />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por estudiante, apoderado o DNI" className="pl-9" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      {isLoading ? (
        <Cargando />
      ) : filtrados.length === 0 ? (
        <Vacio icono={Users} titulo="No se encontraron estudiantes" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Nacimiento</th>
                <th className="px-4 py-3">Apoderado</th>
                <th className="px-4 py-3">Última matrícula</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => {
                const ultima = [...e.matriculas].sort((a, b) => (b.periodos?.anio ?? 0) - (a.periodos?.anio ?? 0))[0];
                return (
                  <tr key={e.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{e.apellidos}, {e.nombres}</div>
                      <div className="text-xs text-muted-foreground">DNI {e.dni}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fechaCorta(e.fecha_nacimiento)}</td>
                    <td className="px-4 py-3">
                      <div>{e.apoderados?.nombre}</div>
                      <div className="text-xs text-muted-foreground">{e.apoderados?.telefono} {e.apoderados?.user_id ? "· con cuenta" : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      {ultima ? (
                        <Link to="/matriculas/$id" params={{ id: ultima.id }} className="flex flex-wrap items-center gap-2 hover:underline">
                          {ultima.periodos?.anio} · {gradoLabel(ultima.grados)} {ultima.secciones && `“${ultima.secciones.nombre}”`}
                          <EstadoBadge tone={ESTADO_MATRICULA[ultima.estado].tone}>{ESTADO_MATRICULA[ultima.estado].label}</EstadoBadge>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                      <BotonCarnetQR estudiante={e} etiqueta={false} />
                      {puedeEditar && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Editar"
                          onClick={() =>
                            setEdit({
                              id: e.id,
                              nombres: e.nombres,
                              apellidos: e.apellidos,
                              fecha_nacimiento: e.fecha_nacimiento ?? "",
                              apoId: e.apoderado_id,
                              apoTelefono: e.apoderados?.telefono ?? "",
                              apoCorreo: e.apoderados?.correo ?? "",
                            })
                          }
                        >
                          <Pencil />
                        </Button>
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar datos</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label>Nombres</Label><Input value={edit.nombres} onChange={(e) => setEdit({ ...edit, nombres: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Apellidos</Label><Input value={edit.apellidos} onChange={(e) => setEdit({ ...edit, apellidos: e.target.value })} /></div>
              <div className="grid gap-1.5 sm:col-span-2"><Label>Fecha de nacimiento</Label><Input type="date" value={edit.fecha_nacimiento} onChange={(e) => setEdit({ ...edit, fecha_nacimiento: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Celular del apoderado</Label><Input value={edit.apoTelefono} onChange={(e) => setEdit({ ...edit, apoTelefono: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Correo del apoderado</Label><Input value={edit.apoCorreo} onChange={(e) => setEdit({ ...edit, apoCorreo: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
