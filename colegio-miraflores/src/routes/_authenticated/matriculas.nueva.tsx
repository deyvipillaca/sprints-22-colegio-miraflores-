import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertCircle, ClipboardList, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Tarjeta } from "@/components/escolar/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  TIPO_MATRICULA,
  documentosRequeridos,
  fechaCorta,
  gradoLabel,
  hoyISO,
  matriculaHabilitada,
  mensajeError,
  soles,
  type TipoMatricula,
  avisar,
} from "@/lib/escolar";
import { gradosQuery, periodosQuery } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/matriculas/nueva")({
  head: () => ({ meta: [{ title: "Nueva matrícula — Colegio Miraflores" }] }),
  component: NuevaMatricula,
});

type Apoderado = { id: string; nombre: string; dni: string };

function NuevaMatricula() {
  const s = useSesion();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const esSecretaria = s.es("admin", "secretaria");
  const { data: periodos = [] } = useQuery(periodosQuery);
  const { data: grados = [] } = useQuery(gradosQuery);
  const abiertos = periodos.filter((p) => matriculaHabilitada(p, hoyISO()));

  // Apoderado (Secretaría busca o registra; el apoderado usa su propia ficha)
  const [apoderado, setApoderado] = useState<Apoderado | null>(s.apoderado && !esSecretaria ? s.apoderado : null);
  const [dniBusqueda, setDniBusqueda] = useState("");
  const [nuevoApo, setNuevoApo] = useState<{ nombre: string; telefono: string; correo: string } | null>(null);

  const [estudianteId, setEstudianteId] = useState<string>("nuevo");
  const [est, setEst] = useState({ nombres: "", apellidos: "", dni: "", fecha_nacimiento: "" });
  const [periodoId, setPeriodoId] = useState<string>("");
  const [gradoId, setGradoId] = useState<string>("");
  const [tipo, setTipo] = useState<TipoMatricula>("NUEVA");
  const [enviando, setEnviando] = useState(false);

  const periodoSel = abiertos.find((p) => p.id === periodoId) ?? abiertos[0];

  const { data: hijos = [] } = useQuery({
    queryKey: ["hijos", apoderado?.id],
    enabled: !!apoderado,
    queryFn: async () => {
      const { data } = await supabase.from("estudiantes").select("*").eq("apoderado_id", apoderado!.id).order("nombres");
      return data ?? [];
    },
  });

  async function buscarApoderado() {
    if (!/^\d{8}$/.test(dniBusqueda)) return avisar("Ingrese un DNI de 8 dígitos.");
    const { data } = await supabase.from("apoderados").select("id, nombre, dni").eq("dni", dniBusqueda).maybeSingle();
    if (data) {
      setApoderado(data);
      setNuevoApo(null);
    } else {
      setApoderado(null);
      setNuevoApo({ nombre: "", telefono: "", correo: "" });
    }
  }

  if (!esSecretaria && !s.apoderado) {
    return (
      <>
        <EncabezadoPagina icono={ClipboardList} titulo="Nueva matrícula" />
        <Tarjeta className="flex items-center gap-4">
          <AlertCircle className="size-6 text-terracota" />
          <p className="flex-1 text-sm">Primero complete sus datos de apoderado.</p>
          <Button asChild variant="terracota"><Link to="/mi-perfil">Completar datos</Link></Button>
        </Tarjeta>
      </>
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!periodoSel) return avisar("No hay un periodo de matrícula habilitado.");
    if (!gradoId) return avisar("Elija el grado.");
    setEnviando(true);
    try {
      let apo = apoderado;
      if (!apo && nuevoApo) {
        if (!nuevoApo.nombre.trim()) throw new Error("Escriba el nombre del apoderado.");
        const { data, error } = await supabase
          .from("apoderados")
          .insert({ nombre: nuevoApo.nombre.trim(), dni: dniBusqueda, telefono: nuevoApo.telefono, correo: nuevoApo.correo.trim().toLowerCase() })
          .select("id, nombre, dni")
          .single();
        if (error) throw error;
        apo = data;
      }
      if (!apo) throw new Error("Indique el apoderado.");
      let idEst = estudianteId;
      if (idEst === "nuevo") {
        if (!/^\d{8}$/.test(est.dni)) throw new Error("El DNI del estudiante debe tener 8 dígitos.");
        const { data, error } = await supabase
          .from("estudiantes")
          .insert({
            apoderado_id: apo.id,
            nombres: est.nombres.trim(),
            apellidos: est.apellidos.trim(),
            dni: est.dni,
            fecha_nacimiento: est.fecha_nacimiento || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        idEst = data.id;
      }
      const { data: m, error } = await supabase
        .from("matriculas")
        .insert({ estudiante_id: idEst, periodo_id: periodoSel.id, grado_id: gradoId, tipo })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Solicitud registrada. Ahora adjunte los documentos.");
      qc.invalidateQueries({ queryKey: ["matriculas"] });
      navigate({ to: "/matriculas/$id", params: { id: m.id } });
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <EncabezadoPagina icono={ClipboardList} titulo="Nueva matrícula" descripcion="Registre la solicitud; luego adjuntará los documentos y se registrará el pago." />
      {abiertos.length === 0 ? (
        <Tarjeta className="flex items-center gap-3">
          <AlertCircle className="size-5 text-warning-foreground" />
          <p className="text-sm">No hay un periodo de matrícula habilitado en este momento.</p>
        </Tarjeta>
      ) : (
        <form onSubmit={enviar} className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-6">
            {esSecretaria && (
              <Tarjeta>
                <h2 className="text-lg font-semibold">1. Apoderado</h2>
                <div className="mt-4 flex gap-2">
                  <Input placeholder="DNI del apoderado" inputMode="numeric" maxLength={8} value={dniBusqueda} onChange={(e) => setDniBusqueda(e.target.value.replace(/\D/g, ""))} />
                  <Button type="button" variant="outline" onClick={buscarApoderado}><Search /> Buscar</Button>
                </div>
                {apoderado && (
                  <div className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                    {apoderado.nombre} · DNI {apoderado.dni}
                  </div>
                )}
                {nuevoApo && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <p className="text-sm text-muted-foreground sm:col-span-3">No está registrado. Complete sus datos:</p>
                    <Input placeholder="Nombre completo" value={nuevoApo.nombre} onChange={(e) => setNuevoApo({ ...nuevoApo, nombre: e.target.value })} required />
                    <Input placeholder="Celular" inputMode="numeric" maxLength={9} value={nuevoApo.telefono} onChange={(e) => setNuevoApo({ ...nuevoApo, telefono: e.target.value.replace(/\D/g, "") })} />
                    <Input placeholder="Correo" type="email" value={nuevoApo.correo} onChange={(e) => setNuevoApo({ ...nuevoApo, correo: e.target.value })} />
                  </div>
                )}
              </Tarjeta>
            )}

            <Tarjeta>
              <h2 className="text-lg font-semibold">{esSecretaria ? "2." : "1."} Estudiante</h2>
              {(apoderado || nuevoApo) ? (
                <>
                  {hijos.length > 0 && (
                    <Select value={estudianteId} onValueChange={setEstudianteId}>
                      <SelectTrigger className="mt-4"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {hijos.map((h) => <SelectItem key={h.id} value={h.id}>{h.nombres} {h.apellidos}</SelectItem>)}
                        <SelectItem value="nuevo">+ Registrar otro estudiante</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {estudianteId === "nuevo" && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5"><Label htmlFor="est-nombres">Nombres</Label><Input id="est-nombres" value={est.nombres} onChange={(e) => setEst({ ...est, nombres: e.target.value })} required /></div>
                      <div className="grid gap-1.5"><Label htmlFor="est-apellidos">Apellidos</Label><Input id="est-apellidos" value={est.apellidos} onChange={(e) => setEst({ ...est, apellidos: e.target.value })} required /></div>
                      <div className="grid gap-1.5"><Label htmlFor="est-dni">DNI del estudiante</Label><Input id="est-dni" inputMode="numeric" maxLength={8} value={est.dni} onChange={(e) => setEst({ ...est, dni: e.target.value.replace(/\D/g, "") })} required /></div>
                      <div className="grid gap-1.5"><Label htmlFor="est-nac">Fecha de nacimiento</Label><Input id="est-nac" type="date" value={est.fecha_nacimiento} onChange={(e) => setEst({ ...est, fecha_nacimiento: e.target.value })} /></div>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Primero busque al apoderado.</p>
              )}
            </Tarjeta>

            <Tarjeta>
              <h2 className="text-lg font-semibold">{esSecretaria ? "3." : "2."} Matrícula</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Año escolar</Label>
                  <Select value={periodoSel?.id ?? ""} onValueChange={setPeriodoId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{abiertos.map((p) => <SelectItem key={p.id} value={p.id}>{p.anio}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Grado</Label>
                  <Select value={gradoId} onValueChange={setGradoId}>
                    <SelectTrigger><SelectValue placeholder="Elija el grado" /></SelectTrigger>
                    <SelectContent>{grados.map((g) => <SelectItem key={g.id} value={g.id}>{gradoLabel(g)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Label className="mt-5 block">Tipo de matrícula</Label>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoMatricula)} className="mt-2 grid gap-2 sm:grid-cols-3">
                {(Object.keys(TIPO_MATRICULA) as TipoMatricula[]).map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
                    <RadioGroupItem value={t} /> {TIPO_MATRICULA[t]}
                  </label>
                ))}
              </RadioGroup>
            </Tarjeta>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Tarjeta className="bg-secondary">
              <h3 className="font-semibold">Resumen</h3>
              {periodoSel && (
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Periodo de matrícula</dt><dd>{fechaCorta(periodoSel.inicio_matricula)} – {fechaCorta(periodoSel.fin_matricula)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Costo</dt><dd className="font-semibold">{soles(periodoSel.monto_matricula)}</dd></div>
                </dl>
              )}
              <div className="mt-4 text-sm font-medium">Documentos que deberá adjuntar</div>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {documentosRequeridos(tipo).map((d) => <li key={d}>• {d}</li>)}
              </ul>
              <Button type="submit" className="mt-6 w-full" disabled={enviando || (!apoderado && !nuevoApo)}>
                {enviando ? "Registrando…" : "Registrar solicitud"}
              </Button>
            </Tarjeta>
          </div>
        </form>
      )}
    </>
  );
}
