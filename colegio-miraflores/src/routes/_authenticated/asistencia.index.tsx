import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2, Clock, Keyboard, Lock, QrCode, ScanLine, Users, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Tarjeta, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { EscanerQR } from "@/components/escolar/escaner-qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADO_ASISTENCIA, gradoLabel, mensajeError, type EstadoAsistencia, avisar } from "@/lib/escolar";
import { periodosQuery, periodoVigente, seccionesQuery } from "@/lib/datos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/asistencia/")({
  validateSearch: z.object({ seccion: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Asistencia con QR — Colegio Miraflores" },
      { name: "description", content: "Registre la asistencia escaneando el carnet QR de cada estudiante." },
    ],
  }),
  component: TomarAsistencia,
});

type Lectura = { ok: boolean; ya?: boolean; nombre?: string; estado?: EstadoAsistencia; hora?: string; mensaje?: string };

const hoyLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

function TomarAsistencia() {
  const s = useSesion();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const autorizado = s.es("admin", "auxiliar", "secretaria");
  const { data: periodos } = useQuery(periodosQuery);
  const vigente = periodos ? periodoVigente(periodos) : undefined;
  const { data: secciones = [] } = useQuery(seccionesQuery(vigente?.id));
  const disponibles = secciones.filter((x) => x.ocupadas > 0 && (autorizado || x.docente_id === s.userId));

  const [seccionId, setSeccionId] = useState(search.seccion ?? "");
  const [escaneando, setEscaneando] = useState(false);
  const [lectura, setLectura] = useState<Lectura>();
  const [codigo, setCodigo] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const ocupado = useRef(false);
  const fecha = hoyLima();

  useEffect(() => {
    if (!seccionId && disponibles[0]) setSeccionId(disponibles[0].id);
  }, [disponibles, seccionId]);

  const { data, isLoading } = useQuery({
    queryKey: ["lista", seccionId, fecha],
    enabled: !!seccionId,
    refetchInterval: 15000,
    queryFn: async () => {
      const [ms, asis] = await Promise.all([
        supabase.from("matriculas").select("id, estudiantes(nombres, apellidos, dni)").eq("seccion_id", seccionId).eq("estado", "MATRICULADA"),
        supabase.from("asistencias").select("matricula_id, estado, observacion, created_at").eq("seccion_id", seccionId).eq("fecha", fecha),
      ]);
      const lista = (ms.data ?? []).sort((a, b) => (a.estudiantes?.apellidos ?? "").localeCompare(b.estudiantes?.apellidos ?? ""));
      return { lista, marcas: new Map((asis.data ?? []).map((a) => [a.matricula_id, a])) };
    },
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ["lista", seccionId, fecha] });

  async function marcar(texto: string) {
    if (ocupado.current || !seccionId) return;
    ocupado.current = true;
    const { data: r, error } = await supabase.rpc("marcar_asistencia_qr", { _codigo: texto, _seccion_id: seccionId });
    ocupado.current = false;
    if (error) {
      setLectura({ ok: false, mensaje: mensajeError(error) });
      navigator.vibrate?.([80, 60, 80]);
      return;
    }
    const res = r as { ya: boolean; nombre: string; estado: EstadoAsistencia; hora: string };
    setLectura({ ok: true, ...res });
    navigator.vibrate?.(60);
    refrescar();
  }

  function manual(e: FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;
    marcar(codigo);
    setCodigo("");
  }

  async function cerrar() {
    if (!confirm("Los estudiantes que no escanearon su QR quedarán con falta y se avisará a sus apoderados. ¿Continuar?")) return;
    setCerrando(true);
    const { data: r, error } = await supabase.rpc("cerrar_asistencia_qr", { _seccion_id: seccionId });
    setCerrando(false);
    if (error) return avisar(mensajeError(error));
    const n = (r as { faltas: number }).faltas;
    toast.success(n ? `Asistencia cerrada: ${n} falta(s). Se avisó a los apoderados.` : "Asistencia cerrada: todos registrados.");
    setEscaneando(false);
    refrescar();
  }

  async function corregir(matricula_id: string, estado: EstadoAsistencia) {
    const { error } = await supabase.rpc("registrar_asistencia", { _seccion_id: seccionId, _fecha: fecha, _marcas: [{ matricula_id, estado }] });
    if (error) return avisar(mensajeError(error));
    toast.success("Asistencia corregida.");
    refrescar();
  }

  const seccion = secciones.find((x) => x.id === seccionId);
  const total = data?.lista.length ?? 0;
  const marcados = data ? data.lista.filter((m) => data.marcas.has(m.id)).length : 0;
  const pendientes = total - marcados;
  const cuenta = (e: EstadoAsistencia) => (data ? [...data.marcas.values()].filter((a) => a.estado === e).length : 0);
  const limite = vigente?.hora_tardanza?.slice(0, 5) ?? "08:15";

  return (
    <>
      <EncabezadoPagina
        icono={QrCode}
        titulo="Asistencia con QR"
        descripcion={`Escanee el carnet de cada estudiante. Antes de las ${limite} queda presente; después, tardanza.`}
      />
      {disponibles.length === 0 ? (
        <Vacio icono={Users} titulo="No tiene secciones asignadas" texto="El administrador debe asignarle una sección con estudiantes matriculados." />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={seccionId} onValueChange={(v) => { setSeccionId(v); setLectura(undefined); }}>
              <SelectTrigger className="sm:w-72"><SelectValue placeholder="Sección" /></SelectTrigger>
              <SelectContent>
                {disponibles.map((x) => (
                  <SelectItem key={x.id} value={x.id}>{gradoLabel(x.grados)} “{x.nombre}”</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">Hoy, {new Date(fecha + "T12:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Tarjeta className="grid content-start gap-4">
              {escaneando ? (
                <EscanerQR onLeer={marcar} />
              ) : (
                <button
                  type="button"
                  onClick={() => setEscaneando(true)}
                  className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-accent/40 text-accent-foreground transition-colors hover:bg-accent"
                >
                  <ScanLine className="size-12" />
                  <span className="font-display text-lg font-semibold">Abrir cámara y escanear</span>
                </button>
              )}

              {lectura && (
                <div
                  role="status"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3 animate-subir",
                    !lectura.ok && "border-destructive/40 bg-destructive-soft text-destructive",
                    lectura.ok && lectura.estado === "PRESENTE" && "border-success/40 bg-success-soft text-success",
                    lectura.ok && lectura.estado !== "PRESENTE" && "border-warning/40 bg-warning-soft text-warning-foreground",
                  )}
                >
                  {!lectura.ok ? <XCircle className="mt-0.5 size-5 shrink-0" /> : lectura.estado === "PRESENTE" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <Clock className="mt-0.5 size-5 shrink-0" />}
                  <div>
                    {lectura.ok ? (
                      <>
                        <div className="font-semibold">{lectura.nombre}</div>
                        <div className="text-sm">
                          {lectura.ya ? `Ya estaba registrado (${ESTADO_ASISTENCIA[lectura.estado!].label.toLowerCase()}, ${lectura.hora}).` : `${ESTADO_ASISTENCIA[lectura.estado!].label} · ${lectura.hora}`}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-medium">{lectura.mensaje}</div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={manual} className="flex gap-2">
                <div className="relative flex-1">
                  <Keyboard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Código del carnet" placeholder="Escribir código del carnet" className="pl-9 font-mono uppercase" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                </div>
                <Button type="submit" variant="outline">Marcar</Button>
              </form>

              <div className="flex flex-wrap gap-2">
                {escaneando && <Button variant="ghost" onClick={() => setEscaneando(false)}>Detener cámara</Button>}
                <Button variant="secondary" className="ml-auto" onClick={cerrar} disabled={cerrando || pendientes === 0 || !data}>
                  <Lock /> {cerrando ? "Cerrando…" : `Cerrar asistencia${pendientes ? ` (${pendientes} faltan)` : ""}`}
                </Button>
              </div>
            </Tarjeta>

            {isLoading || !data ? (
              <Cargando />
            ) : (
              <Tarjeta className="p-0 md:p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                  <div className="font-display text-lg font-semibold">
                    {seccion && `${gradoLabel(seccion.grados)} “${seccion.nombre}”`}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">{marcados}/{total} registrados</span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="text-success">P {cuenta("PRESENTE")}</span>
                    <span className="text-warning-foreground">T {cuenta("TARDANZA")}</span>
                    <span className="text-destructive">F {cuenta("FALTA")}</span>
                    {cuenta("JUSTIFICADA") > 0 && <span className="text-info">J {cuenta("JUSTIFICADA")}</span>}
                  </div>
                </div>
                <ul className="max-h-[32rem] overflow-y-auto">
                  {data.lista.map((m) => {
                    const a = data.marcas.get(m.id);
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 border-b px-5 py-2.5 last:border-0">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{m.estudiantes?.apellidos}, {m.estudiantes?.nombres}</div>
                          {a?.observacion && <div className="text-xs text-muted-foreground">{a.observacion}</div>}
                        </div>
                        {autorizado && a ? (
                          <Select value={a.estado} onValueChange={(v) => corregir(m.id, v as EstadoAsistencia)}>
                            <SelectTrigger className="h-8 w-36" aria-label="Corregir asistencia"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ESTADO_ASISTENCIA) as EstadoAsistencia[]).map((e) => (
                                <SelectItem key={e} value={e}>{ESTADO_ASISTENCIA[e].label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : a ? (
                          <EstadoBadge tone={ESTADO_ASISTENCIA[a.estado].tone}>{ESTADO_ASISTENCIA[a.estado].label}</EstadoBadge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin escanear</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Tarjeta>
            )}
          </div>
        </>
      )}
    </>
  );
}
