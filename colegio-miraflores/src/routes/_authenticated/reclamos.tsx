import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquareWarning, Plus, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fechaCorta, mensajeError, avisar } from "@/lib/escolar";
import { ESTADO_RECLAMO, TIPO_RECLAMO, type EstadoReclamo, type TipoReclamo } from "@/lib/reclamos";

export const Route = createFileRoute("/_authenticated/reclamos")({
  head: () => ({
    meta: [
      { title: "Libro de reclamos — Colegio Miraflores" },
      { name: "description", content: "Presente y haga seguimiento a reclamos, quejas y sugerencias al Colegio Miraflores." },
    ],
  }),
  component: Reclamos,
});

const SIN_ESTUDIANTE = "ninguno";

function Reclamos() {
  const s = useSesion();
  const qc = useQueryClient();
  const gestor = s.es("admin", "secretaria", "director");
  const [filtro, setFiltro] = useState<EstadoReclamo | "TODOS">(gestor ? "PENDIENTE" : "TODOS");
  const [nuevo, setNuevo] = useState(false);
  const [respondiendo, setRespondiendo] = useState<{ id: string; codigo: number; asunto: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reclamos", filtro],
    queryFn: async () => {
      let q = supabase.from("reclamos").select("*, estudiantes(nombres, apellidos), apoderados(nombre, telefono)").order("created_at", { ascending: false }).limit(300);
      if (filtro !== "TODOS") q = q.eq("estado", filtro);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  const refrescar = () => qc.invalidateQueries({ queryKey: ["reclamos"] });

  return (
    <>
      <EncabezadoPagina
        icono={MessageSquareWarning}
        titulo="Libro de reclamos"
        descripcion={gestor ? "Atienda los reclamos, quejas y sugerencias de las familias." : "Presente un reclamo, queja o sugerencia y vea la respuesta del colegio."}
        acciones={<Button onClick={() => setNuevo(true)}><Plus /> Nuevo reclamo</Button>}
      />
      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as EstadoReclamo | "TODOS")} className="mb-4">
        <TabsList>
          <TabsTrigger value="PENDIENTE">Pendientes</TabsTrigger>
          <TabsTrigger value="EN_PROCESO">En proceso</TabsTrigger>
          <TabsTrigger value="RESUELTO">Resueltos</TabsTrigger>
          <TabsTrigger value="TODOS">Todos</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Cargando />
      ) : !data?.length ? (
        <Vacio icono={MessageSquareWarning} titulo="No hay reclamos" {...(gestor ? {} : { texto: "Si algo no salió bien, cuéntenos con “Nuevo reclamo”." })} />
      ) : (
        <div className="grid gap-3">
          {data.map((r) => (
            <article key={r.id} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">N.° {String(r.codigo).padStart(5, "0")}</span>
                    <span>· {TIPO_RECLAMO[r.tipo as TipoReclamo].label}</span>
                    <span>· {fechaCorta(r.created_at)}</span>
                    {r.estudiantes && <span>· {r.estudiantes.nombres} {r.estudiantes.apellidos}</span>}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">{r.asunto}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm">{r.detalle}</p>
                  {r.pedido && <p className="mt-2 text-sm"><span className="text-muted-foreground">Pedido: </span>{r.pedido}</p>}
                  {gestor && r.apoderados && <p className="mt-2 text-xs text-muted-foreground">Apoderado: {r.apoderados.nombre} · Cel. {r.apoderados.telefono}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <EstadoBadge tone={ESTADO_RECLAMO[r.estado as EstadoReclamo].tone}>{ESTADO_RECLAMO[r.estado as EstadoReclamo].label}</EstadoBadge>
                  {gestor && r.estado !== "RESUELTO" && (
                    <Button size="sm" variant="outline" onClick={() => setRespondiendo({ id: r.id, codigo: r.codigo, asunto: r.asunto })}><Reply /> Responder</Button>
                  )}
                </div>
              </div>
              {r.respuesta && (
                <div className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">
                  <div className="text-xs font-medium text-muted-foreground">Respuesta del colegio · {fechaCorta(r.respondido_en)}</div>
                  <p className="mt-1 whitespace-pre-line">{r.respuesta}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <DialogoNuevoReclamo abierto={nuevo} onClose={() => setNuevo(false)} onListo={() => { setNuevo(false); setFiltro("TODOS"); refrescar(); }} />
      <DialogoResponder reclamo={respondiendo} onClose={() => setRespondiendo(null)} onListo={() => { setRespondiendo(null); refrescar(); }} />
    </>
  );
}

function DialogoNuevoReclamo({ abierto, onClose, onListo }: { abierto: boolean; onClose: () => void; onListo: () => void }) {
  const s = useSesion();
  const [tipo, setTipo] = useState<TipoReclamo>("RECLAMO");
  const [estudiante, setEstudiante] = useState(SIN_ESTUDIANTE);
  const [asunto, setAsunto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [pedido, setPedido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { data: hijos = [] } = useQuery({
    queryKey: ["mis-hijos", s.apoderado?.id],
    enabled: abierto && !!s.apoderado,
    queryFn: async () => (await supabase.from("estudiantes").select("id, nombres, apellidos").eq("apoderado_id", s.apoderado!.id).order("nombres")).data ?? [],
  });

  async function enviar() {
    if (asunto.trim().length < 3) return avisar("Escriba un asunto.");
    if (detalle.trim().length < 10) return avisar("Cuéntenos con más detalle qué ocurrió (mínimo 10 caracteres).");
    setEnviando(true);
    const { data, error } = await supabase
      .from("reclamos")
      .insert({ tipo, asunto: asunto.trim(), detalle: detalle.trim(), pedido: pedido.trim(), estudiante_id: estudiante === SIN_ESTUDIANTE ? null : estudiante, usuario_id: s.userId })
      .select("codigo")
      .single();
    setEnviando(false);
    if (error) return avisar(mensajeError(error));
    toast.success(`${TIPO_RECLAMO[tipo].label} N.° ${String(data.codigo).padStart(5, "0")} registrado. Le responderemos por la app.`);
    setAsunto(""); setDetalle(""); setPedido(""); setEstudiante(SIN_ESTUDIANTE);
    onListo();
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo reclamo</DialogTitle>
          <DialogDescription>{TIPO_RECLAMO[tipo].ayuda}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="r-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoReclamo)}>
                <SelectTrigger id="r-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TIPO_RECLAMO) as TipoReclamo[]).map((t) => <SelectItem key={t} value={t}>{TIPO_RECLAMO[t].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {hijos.length > 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="r-est">Sobre el estudiante</Label>
                <Select value={estudiante} onValueChange={setEstudiante}>
                  <SelectTrigger id="r-est"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_ESTUDIANTE}>General</SelectItem>
                    {hijos.map((h) => <SelectItem key={h.id} value={h.id}>{h.nombres} {h.apellidos}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-1.5"><Label htmlFor="r-asunto">Asunto</Label><Input id="r-asunto" maxLength={150} value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej.: Cobro duplicado de matrícula" /></div>
          <div className="grid gap-1.5"><Label htmlFor="r-detalle">¿Qué ocurrió?</Label><Textarea id="r-detalle" rows={4} maxLength={3000} value={detalle} onChange={(e) => setDetalle(e.target.value)} /></div>
          {tipo !== "SUGERENCIA" && (
            <div className="grid gap-1.5"><Label htmlFor="r-pedido">¿Qué solicita al colegio? (opcional)</Label><Input id="r-pedido" maxLength={500} value={pedido} onChange={(e) => setPedido(e.target.value)} /></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando}>{enviando ? "Enviando…" : "Enviar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoResponder({ reclamo, onClose, onListo }: { reclamo: { id: string; codigo: number; asunto: string } | null; onClose: () => void; onListo: () => void }) {
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(estado: "EN_PROCESO" | "RESUELTO") {
    if (!reclamo) return;
    setEnviando(true);
    const { error } = await supabase.rpc("responder_reclamo", { _reclamo_id: reclamo.id, _estado: estado, _respuesta: respuesta });
    setEnviando(false);
    if (error) return avisar(mensajeError(error));
    toast.success(estado === "RESUELTO" ? "Reclamo resuelto. Se avisó al apoderado." : "Reclamo marcado en proceso.");
    setRespuesta("");
    onListo();
  }

  return (
    <Dialog open={!!reclamo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Responder reclamo N.° {reclamo && String(reclamo.codigo).padStart(5, "0")}</DialogTitle>
          <DialogDescription>{reclamo?.asunto}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="r-resp">Respuesta para el apoderado</Label>
          <Textarea id="r-resp" rows={5} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => guardar("EN_PROCESO")} disabled={enviando}>Marcar en proceso</Button>
          <Button onClick={() => guardar("RESUELTO")} disabled={enviando}>Resolver y enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
