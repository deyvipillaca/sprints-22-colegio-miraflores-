import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Tarjeta } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROL_LABEL, ROLES, gradoLabel, mensajeError, type AppRole, avisar } from "@/lib/escolar";
import { gradosQuery, periodosQuery, periodoVigente, personalQuery, seccionesQuery } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — Colegio Miraflores" }] }),
  component: Configuracion,
});

function Configuracion() {
  const s = useSesion();
  if (!s.es("admin")) return <Navigate to="/panel" />;
  return (
    <>
      <EncabezadoPagina icono={Settings} titulo="Configuración" descripcion="Años escolares, secciones, docentes y roles de usuario." />
      <Tabs defaultValue="usuarios">
        <TabsList className="mb-6">
          <TabsTrigger value="usuarios">Usuarios y roles</TabsTrigger>
          <TabsTrigger value="secciones">Secciones</TabsTrigger>
          <TabsTrigger value="periodos">Años escolares</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios"><Usuarios /></TabsContent>
        <TabsContent value="secciones"><Secciones /></TabsContent>
        <TabsContent value="periodos"><Periodos /></TabsContent>
      </Tabs>
    </>
  );
}

function Usuarios() {
  const s = useSesion();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(personalQuery);

  async function alternar(userId: string, rol: AppRole, activo: boolean) {
    if (userId === s.userId && rol === "admin" && !activo) return avisar("No puede quitarse su propio rol de administrador.");
    const { error } = activo
      ? await supabase.from("user_roles").insert({ user_id: userId, role: rol })
      : await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", rol);
    if (error) return avisar(mensajeError(error));
    qc.invalidateQueries({ queryKey: ["personal"] });
  }

  if (isLoading || !data) return <Cargando />;
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Las personas crean su cuenta desde la página de ingreso. Luego, aquí les asigna su rol. Las cuentas nuevas empiezan como Apoderado.
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              {ROLES.map((r) => <th key={r} className="px-2 py-3 text-center">{ROL_LABEL[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.nombre || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.correo}</div>
                </td>
                {ROLES.map((r) => (
                  <td key={r} className="px-2 py-3 text-center">
                    <Checkbox aria-label={`${ROL_LABEL[r]} para ${u.correo}`} checked={u.roles.includes(r)} onCheckedChange={(v) => alternar(u.id, r, v === true)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Secciones() {
  const qc = useQueryClient();
  const { data: periodos = [] } = useQuery(periodosQuery);
  const { data: grados = [] } = useQuery(gradosQuery);
  const { data: personal = [] } = useQuery(personalQuery);
  const docentes = personal.filter((p) => p.roles.includes("docente"));
  const [periodoId, setPeriodoId] = useState("");
  useEffect(() => {
    const v = periodoVigente(periodos);
    if (!periodoId && v) setPeriodoId(v.id);
  }, [periodos, periodoId]);
  const { data: secciones = [], isLoading } = useQuery(seccionesQuery(periodoId));
  const [nuevoGrado, setNuevoGrado] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");

  const refrescar = () => qc.invalidateQueries({ queryKey: ["secciones", periodoId] });

  async function actualizar(id: string, cambios: { capacidad?: number; docente_id?: string | null }) {
    const { error } = await supabase.from("secciones").update(cambios).eq("id", id);
    if (error) return avisar(cambios.capacidad !== undefined ? "La capacidad no puede ser menor que los matriculados." : mensajeError(error));
    toast.success("Sección actualizada.");
    refrescar();
  }

  async function agregar() {
    if (!nuevoGrado || !nuevoNombre.trim()) return;
    const { error } = await supabase.from("secciones").insert({ periodo_id: periodoId, grado_id: nuevoGrado, nombre: nuevoNombre.trim().toUpperCase(), capacidad: 30 });
    if (error) return avisar(mensajeError(error));
    setNuevoNombre("");
    refrescar();
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from("secciones").delete().eq("id", id);
    if (error) return avisar("No se puede eliminar una sección con matrículas.");
    refrescar();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label>Año</Label>
          <Select value={periodoId} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{periodos.map((p) => <SelectItem key={p.id} value={p.id}>{p.anio}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <Select value={nuevoGrado} onValueChange={setNuevoGrado}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Grado" /></SelectTrigger>
            <SelectContent>{grados.map((g) => <SelectItem key={g.id} value={g.id}>{gradoLabel(g)}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="w-24" placeholder="C" maxLength={3} value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
          <Button variant="outline" onClick={agregar}><Plus /> Agregar sección</Button>
        </div>
      </div>
      {docentes.length === 0 && (
        <p className="rounded-xl bg-info-soft px-4 py-3 text-sm text-info">Para asignar docentes, primero marque el rol “Docente” en la pestaña Usuarios y roles.</p>
      )}
      {isLoading ? (
        <Cargando />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Sección</th>
                <th className="px-4 py-3">Matriculados</th>
                <th className="px-4 py-3">Capacidad</th>
                <th className="px-4 py-3">Docente</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {secciones.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{gradoLabel(x.grados)} “{x.nombre}”</td>
                  <td className="px-4 py-2.5">{x.ocupadas}</td>
                  <td className="px-4 py-2.5">
                    <Input
                      type="number"
                      min={Math.max(x.ocupadas, 1)}
                      defaultValue={x.capacidad}
                      className="h-8 w-20"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== x.capacidad && v > 0) actualizar(x.id, { capacidad: v });
                      }}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Select value={x.docente_id ?? "ninguno"} onValueChange={(v) => actualizar(x.id, { docente_id: v === "ninguno" ? null : v })}>
                      <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ninguno">Sin asignar</SelectItem>
                        {docentes.map((d) => <SelectItem key={d.id} value={d.id}>{d.nombre || d.correo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {x.ocupadas === 0 && (
                      <Button size="icon" variant="ghost" aria-label="Eliminar sección" onClick={() => eliminar(x.id)}><Trash2 /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Periodos() {
  const qc = useQueryClient();
  const { data: periodos = [], isLoading } = useQuery(periodosQuery);
  const { data: grados = [] } = useQuery(gradosQuery);
  const [nuevoAnio, setNuevoAnio] = useState("");

  const refrescar = () => qc.invalidateQueries({ queryKey: ["periodos"] });

  async function guardar(id: string, cambios: { inicio_matricula?: string; fin_matricula?: string; monto_matricula?: number; hora_tardanza?: string }) {
    const { error } = await supabase.from("periodos").update(cambios).eq("id", id);
    if (error) return avisar(mensajeError(error));
    toast.success("Año escolar actualizado.");
    refrescar();
  }

  async function activar(id: string) {
    await supabase.from("periodos").update({ activo: false }).neq("id", id);
    const { error } = await supabase.from("periodos").update({ activo: true }).eq("id", id);
    if (error) return avisar(mensajeError(error));
    toast.success("Año en curso actualizado.");
    refrescar();
  }

  async function crear() {
    const anio = Number(nuevoAnio);
    if (!anio || anio < 2000) return avisar("Escriba un año válido.");
    const { data, error } = await supabase
      .from("periodos")
      .insert({ anio, inicio_matricula: `${anio - 1}-11-01`, fin_matricula: `${anio}-03-31`, monto_matricula: periodos[0]?.monto_matricula ?? 300 })
      .select("id")
      .single();
    if (error) return avisar(mensajeError(error));
    await supabase.from("secciones").insert(
      grados.flatMap((g) => ["A", "B"].map((nombre) => ({ periodo_id: data.id, grado_id: g.id, nombre, capacidad: g.nivel === "Inicial" ? 20 : 30 }))),
    );
    toast.success(`Año ${anio} creado con secciones A y B.`);
    setNuevoAnio("");
    refrescar();
  }

  if (isLoading) return <Cargando />;
  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <Input className="w-32" placeholder="2028" inputMode="numeric" value={nuevoAnio} onChange={(e) => setNuevoAnio(e.target.value.replace(/\D/g, ""))} />
        <Button variant="outline" onClick={crear}><Plus /> Nuevo año escolar</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {periodos.map((p) => (
          <Tarjeta key={p.id}>
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl font-semibold">{p.anio}</div>
              {p.activo ? <EstadoBadge tone="success">Año en curso</EstadoBadge> : <Button size="sm" variant="ghost" onClick={() => activar(p.id)}>Marcar en curso</Button>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="grid gap-1"><Label className="text-xs">Inicio matrícula</Label><Input type="date" defaultValue={p.inicio_matricula} onBlur={(e) => e.target.value !== p.inicio_matricula && guardar(p.id, { inicio_matricula: e.target.value })} /></div>
              <div className="grid gap-1"><Label className="text-xs">Fin matrícula</Label><Input type="date" defaultValue={p.fin_matricula} onBlur={(e) => e.target.value !== p.fin_matricula && guardar(p.id, { fin_matricula: e.target.value })} /></div>
              <div className="grid gap-1"><Label className="text-xs">Costo (S/)</Label><Input type="number" min="0" step="0.01" defaultValue={p.monto_matricula} onBlur={(e) => Number(e.target.value) !== Number(p.monto_matricula) && guardar(p.id, { monto_matricula: Number(e.target.value) })} /></div>
              <div className="grid gap-1"><Label className="text-xs">Tardanza desde</Label><Input type="time" defaultValue={p.hora_tardanza.slice(0, 5)} onBlur={(e) => e.target.value && e.target.value !== p.hora_tardanza.slice(0, 5) && guardar(p.id, { hora_tardanza: e.target.value })} /></div>
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}
