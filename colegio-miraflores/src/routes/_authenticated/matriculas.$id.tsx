import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  FileText,
  Printer,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { CarnetQR } from "@/components/escolar/carnet-qr";
import { Cargando, Tarjeta, TituloSeccion } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ESTADO_DOCUMENTO,
  ESTADO_MATRICULA,
  TIPO_MATRICULA,
  checklistMatricula,
  documentosRequeridos,
  fechaCorta,
  gradoLabel,
  hoyISO,
  mensajeError,
  soles,
  vacantes,
  type EstadoMatricula,
  avisar,
} from "@/lib/escolar";
import { MATRICULA_SELECT } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/matriculas/$id")({
  head: () => ({ meta: [{ title: "Detalle de matrícula — Colegio Miraflores" }] }),
  component: DetalleMatricula,
});

function DetalleMatricula() {
  const { id } = Route.useParams();
  const s = useSesion();
  const qc = useQueryClient();
  const esSecretaria = s.es("admin", "secretaria");
  const esTesoreria = s.es("admin", "tesoreria");

  const key = ["matricula", id];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [m, docs, pagos] = await Promise.all([
        supabase.from("matriculas").select(MATRICULA_SELECT).eq("id", id).single(),
        supabase.from("documentos").select("*").eq("matricula_id", id).order("created_at"),
        supabase.from("pagos").select("*").eq("matricula_id", id).order("fecha"),
      ]);
      if (m.error) throw m.error;
      return { m: m.data, docs: docs.data ?? [], pagos: pagos.data ?? [] };
    },
  });

  const { data: secciones = [] } = useQuery({
    queryKey: ["secciones-grado", data?.m.periodo_id, data?.m.grado_id],
    enabled: !!data && esSecretaria,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("secciones")
        .select("*")
        .eq("periodo_id", data!.m.periodo_id)
        .eq("grado_id", data!.m.grado_id)
        .order("nombre");
      return rows ?? [];
    },
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["matriculas"] });
  };

  const [dlgConfirmar, setDlgConfirmar] = useState(false);
  const [dlgEstado, setDlgEstado] = useState<EstadoMatricula | null>(null);
  const [dlgPago, setDlgPago] = useState(false);

  if (isLoading || !data) return <Cargando />;
  const { m, docs, pagos } = data;
  const monto = Number(m.periodos?.monto_matricula ?? 0);
  const check = checklistMatricula({ tipo: m.tipo, estado: m.estado, documentos: docs, pagos, montoRequerido: monto });
  const abierta = m.estado === "SOLICITADA" || m.estado === "EN_REVISION";
  const puedeSubir = abierta && (esSecretaria || s.es("apoderado"));

  async function cambiarEstado(estado: EstadoMatricula, motivo: string) {
    const { error } = await supabase.rpc("cambiar_estado_matricula", { _matricula_id: id, _estado: estado, _motivo: motivo });
    if (error) return avisar(mensajeError(error));
    toast.success(`Matrícula ${ESTADO_MATRICULA[estado].label.toLowerCase()}.`);
    setDlgEstado(null);
    refrescar();
  }

  return (
    <>
      <Link to="/matriculas" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Matrículas
      </Link>
      <EncabezadoPagina
        icono={ClipboardList}
        titulo={`${m.estudiantes?.nombres} ${m.estudiantes?.apellidos}`}
        descripcion={`Matrícula N.° ${m.codigo} · ${TIPO_MATRICULA[m.tipo]} · ${m.periodos?.anio} · ${gradoLabel(m.grados)}${m.secciones ? ` “${m.secciones.nombre}”` : ""}`}
        acciones={
          <>
            <EstadoBadge tone={ESTADO_MATRICULA[m.estado].tone}>{ESTADO_MATRICULA[m.estado].label}</EstadoBadge>
            {m.estado === "MATRICULADA" && (
              <Button asChild variant="outline" size="sm">
                <Link to="/constancia/$id" params={{ id }}>
                  <Printer /> Constancia
                </Link>
              </Button>
            )}
          </>
        }
      />

      {m.observacion && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
          Observación: {m.observacion}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6">
          <Documentos
            matriculaId={id}
            requeridos={documentosRequeridos(m.tipo)}
            docs={docs}
            puedeSubir={puedeSubir}
            puedeValidar={esSecretaria && abierta}
            onCambio={refrescar}
          />

          <Tarjeta>
            <TituloSeccion
              accion={
                esTesoreria && m.estado !== "ANULADA" && m.estado !== "RECHAZADA" && (
                  <Button size="sm" variant="outline" onClick={() => setDlgPago(true)}>
                    <Wallet /> Registrar pago
                  </Button>
                )
              }
            >
              Pagos
            </TituloSeccion>
            {pagos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay pagos registrados. Costo de matrícula: {soles(monto)}.</p>
            ) : (
              <div className="divide-y">
                {pagos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <div className="font-medium">{p.concepto} · {soles(p.monto)}</div>
                      <div className="text-xs text-muted-foreground">
                        {fechaCorta(p.fecha)} {p.comprobante && `· Comprobante ${p.comprobante}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <EstadoBadge tone={p.estado === "CONFIRMADO" ? "success" : "muted"}>
                        {p.estado === "CONFIRMADO" ? "Confirmado" : "Anulado"}
                      </EstadoBadge>
                      {esTesoreria && p.estado === "CONFIRMADO" && m.estado !== "MATRICULADA" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const { error } = await supabase.from("pagos").update({ estado: "ANULADO" }).eq("id", p.id);
                            if (error) return avisar(mensajeError(error));
                            refrescar();
                          }}
                        >
                          Anular
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>
        </div>

        <div className="grid gap-6 lg:sticky lg:top-6 lg:self-start">
          {m.estudiantes && <CarnetQR estudiante={m.estudiantes} />}
          <Tarjeta className="bg-secondary">
            <h3 className="font-semibold">Requisitos para confirmar</h3>
            <ul className="mt-3 grid gap-2.5 text-sm">
              <Requisito ok={check.documentosFaltantes.length === 0}>
                Documentos validados
                {check.documentosFaltantes.length > 0 && (
                  <span className="block text-xs text-muted-foreground">Falta: {check.documentosFaltantes.join(", ")}</span>
                )}
              </Requisito>
              <Requisito ok={check.pagoCompleto}>
                Pago de matrícula
                <span className="block text-xs text-muted-foreground">
                  {soles(check.pagado)} de {soles(check.montoRequerido)}
                </span>
              </Requisito>
              <Requisito ok={m.estado === "MATRICULADA"}>Vacante asignada en sección</Requisito>
            </ul>
            {esSecretaria && abierta && (
              <div className="mt-5 grid gap-2">
                <Button onClick={() => setDlgConfirmar(true)} disabled={!check.listaParaConfirmar} variant="success">
                  <CheckCircle2 /> Confirmar matrícula
                </Button>
                {m.estado === "SOLICITADA" && (
                  <Button variant="outline" onClick={() => cambiarEstado("EN_REVISION", "")}>
                    Marcar en revisión
                  </Button>
                )}
                <Button variant="ghost" className="text-destructive" onClick={() => setDlgEstado("RECHAZADA")}>
                  Rechazar solicitud
                </Button>
              </div>
            )}
            {esSecretaria && m.estado === "MATRICULADA" && (
              <div className="mt-5 grid gap-2">
                <Button variant="outline" onClick={() => setDlgEstado("RETIRADA")}>Registrar retiro</Button>
                <Button variant="ghost" className="text-destructive" onClick={() => setDlgEstado("ANULADA")}>Anular matrícula</Button>
              </div>
            )}
          </Tarjeta>

          <Tarjeta>
            <h3 className="font-semibold">Apoderado</h3>
            <div className="mt-2 text-sm">
              <div>{m.estudiantes?.apoderados?.nombre}</div>
              <div className="text-muted-foreground">DNI {m.estudiantes?.apoderados?.dni}</div>
              {m.estudiantes?.apoderados?.telefono && <div className="text-muted-foreground">Cel. {m.estudiantes.apoderados.telefono}</div>}
              {m.estudiantes?.apoderados?.correo && <div className="text-muted-foreground">{m.estudiantes.apoderados.correo}</div>}
            </div>
          </Tarjeta>
        </div>
      </div>

      <DialogoConfirmar
        abierto={dlgConfirmar}
        onClose={() => setDlgConfirmar(false)}
        secciones={secciones}
        onConfirmar={async (seccionId) => {
          const { error } = await supabase.rpc("confirmar_matricula", { _matricula_id: id, _seccion_id: seccionId });
          if (error) return avisar(mensajeError(error));
          toast.success("Matrícula confirmada. Se avisó al apoderado.");
          setDlgConfirmar(false);
          refrescar();
        }}
      />
      <DialogoMotivo estado={dlgEstado} onClose={() => setDlgEstado(null)} onEnviar={cambiarEstado} />
      <DialogoPago
        abierto={dlgPago}
        onClose={() => setDlgPago(false)}
        montoSugerido={Math.max(monto - check.pagado, 0) || monto}
        onGuardar={async (p) => {
          const { error } = await supabase.from("pagos").insert({ ...p, matricula_id: id, registrado_por: s.userId });
          if (error) return avisar(mensajeError(error));
          toast.success("Pago registrado.");
          setDlgPago(false);
          refrescar();
        }}
      />
    </>
  );
}

function Requisito({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <div>{children}</div>
    </li>
  );
}

type Doc = { id: string; tipo: string; archivo_path: string; nombre_archivo: string; estado: "PENDIENTE" | "VALIDADO" | "OBSERVADO"; observacion: string };

function Documentos({
  matriculaId,
  requeridos,
  docs,
  puedeSubir,
  puedeValidar,
  onCambio,
}: {
  matriculaId: string;
  requeridos: string[];
  docs: Doc[];
  puedeSubir: boolean;
  puedeValidar: boolean;
  onCambio: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipoSubida, setTipoSubida] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);

  async function subir(file: File) {
    if (!tipoSubida) return;
    if (file.size > 10 * 1024 * 1024) return avisar("El archivo supera los 10 MB.");
    setSubiendo(tipoSubida);
    const limpio = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${matriculaId}/${Date.now()}-${limpio}`;
    const up = await supabase.storage.from("documentos").upload(path, file);
    if (up.error) {
      setSubiendo(null);
      return avisar(mensajeError(up.error));
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("documentos")
      .insert({ matricula_id: matriculaId, tipo: tipoSubida, archivo_path: path, nombre_archivo: file.name, subido_por: u.user?.id ?? null });
    setSubiendo(null);
    if (error) return avisar(mensajeError(error));
    toast.success("Documento adjuntado.");
    onCambio();
  }

  async function ver(path: string) {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 120);
    if (error || !data) return avisar("No se pudo abrir el archivo.");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function revisar(doc: Doc, estado: "VALIDADO" | "OBSERVADO") {
    const observacion = estado === "OBSERVADO" ? window.prompt("¿Qué debe corregir el apoderado?") ?? "" : "";
    if (estado === "OBSERVADO" && !observacion) return;
    const { error } = await supabase.from("documentos").update({ estado, observacion }).eq("id", doc.id);
    if (error) return avisar(mensajeError(error));
    onCambio();
  }

  async function borrar(doc: Doc) {
    await supabase.storage.from("documentos").remove([doc.archivo_path]);
    const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
    if (error) return avisar(mensajeError(error));
    onCambio();
  }

  return (
    <Tarjeta>
      <TituloSeccion>Documentos</TituloSeccion>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subir(f);
          e.target.value = "";
        }}
      />
      <div className="grid gap-3">
        {requeridos.map((tipo) => {
          const delTipo = docs.filter((d) => d.tipo === tipo);
          return (
            <div key={tipo} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="size-4 text-muted-foreground" /> {tipo}
                </div>
                {puedeSubir && !delTipo.some((d) => d.estado === "VALIDADO") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={subiendo === tipo}
                    onClick={() => {
                      setTipoSubida(tipo);
                      inputRef.current?.click();
                    }}
                  >
                    <Upload /> {subiendo === tipo ? "Subiendo…" : "Adjuntar"}
                  </Button>
                )}
              </div>
              {delTipo.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">Sin adjuntar</p>
              ) : (
                <div className="mt-2 grid gap-2">
                  {delTipo.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate">{d.nombre_archivo}</div>
                        {d.observacion && <div className="text-xs text-destructive">{d.observacion}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <EstadoBadge tone={ESTADO_DOCUMENTO[d.estado].tone}>{ESTADO_DOCUMENTO[d.estado].label}</EstadoBadge>
                        <Button size="icon" variant="ghost" aria-label="Ver archivo" onClick={() => ver(d.archivo_path)}><Eye /></Button>
                        {puedeValidar && d.estado !== "VALIDADO" && (
                          <>
                            <Button size="icon" variant="ghost" aria-label="Validar" className="text-success" onClick={() => revisar(d, "VALIDADO")}><Check /></Button>
                            <Button size="icon" variant="ghost" aria-label="Observar" className="text-destructive" onClick={() => revisar(d, "OBSERVADO")}><X /></Button>
                          </>
                        )}
                        {puedeSubir && d.estado !== "VALIDADO" && (
                          <Button size="icon" variant="ghost" aria-label="Quitar" onClick={() => borrar(d)}><Trash2 /></Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Tarjeta>
  );
}

function DialogoConfirmar({
  abierto,
  onClose,
  secciones,
  onConfirmar,
}: {
  abierto: boolean;
  onClose: () => void;
  secciones: { id: string; nombre: string; capacidad: number; ocupadas: number }[];
  onConfirmar: (seccionId: string) => Promise<void>;
}) {
  const [sel, setSel] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar matrícula</DialogTitle>
          <DialogDescription>Elija la sección. Se reservará la vacante y se avisará al apoderado.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {secciones.map((x) => {
            const libres = vacantes(x);
            return (
              <label
                key={x.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 ${sel === x.id ? "border-primary bg-accent" : ""} ${libres === 0 ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className="flex items-center gap-3">
                  <input type="radio" name="seccion" disabled={libres === 0} checked={sel === x.id} onChange={() => setSel(x.id)} />
                  Sección “{x.nombre}”
                </span>
                <span className="text-sm text-muted-foreground">{libres} vacantes de {x.capacidad}</span>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="success"
            disabled={!sel || enviando}
            onClick={async () => {
              setEnviando(true);
              await onConfirmar(sel);
              setEnviando(false);
            }}
          >
            {enviando ? "Confirmando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoMotivo({
  estado,
  onClose,
  onEnviar,
}: {
  estado: EstadoMatricula | null;
  onClose: () => void;
  onEnviar: (e: EstadoMatricula, motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const titulos: Partial<Record<EstadoMatricula, string>> = {
    RECHAZADA: "Rechazar solicitud",
    RETIRADA: "Registrar retiro",
    ANULADA: "Anular matrícula",
  };
  return (
    <Dialog open={!!estado} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{estado ? titulos[estado] : ""}</DialogTitle>
          <DialogDescription>El motivo se enviará al apoderado. Si había vacante asignada, se liberará.</DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={!motivo.trim()} onClick={() => estado && onEnviar(estado, motivo.trim())}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoPago({
  abierto,
  onClose,
  montoSugerido,
  onGuardar,
}: {
  abierto: boolean;
  onClose: () => void;
  montoSugerido: number;
  onGuardar: (p: { concepto: string; monto: number; fecha: string; comprobante: string }) => Promise<void>;
}) {
  const [monto, setMonto] = useState(String(montoSugerido));
  const [fecha, setFecha] = useState(hoyISO());
  const [comprobante, setComprobante] = useState("");
  const [concepto, setConcepto] = useState("Matrícula");
  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (o) setMonto(String(montoSugerido)); else onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Pago recibido en caja o por depósito.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Concepto</Label>
            <Select value={concepto} onValueChange={setConcepto}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Matrícula">Matrícula</SelectItem>
                <SelectItem value="Cuota">Cuota</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pago-monto">Monto (S/)</Label>
            <Input id="pago-monto" type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pago-fecha">Fecha</Label>
            <Input id="pago-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pago-comprobante">N.° de comprobante</Label>
            <Input id="pago-comprobante" value={comprobante} onChange={(e) => setComprobante(e.target.value)} placeholder="B001-000123" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!(Number(monto) > 0)} onClick={() => onGuardar({ concepto, monto: Number(monto), fecha, comprobante })}>
            Guardar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
