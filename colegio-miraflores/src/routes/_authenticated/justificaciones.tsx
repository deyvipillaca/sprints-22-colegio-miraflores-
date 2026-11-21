import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Eye, FileCheck2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogoJustificar } from "@/components/escolar/dialogo-justificar";
import { ESTADO_ASISTENCIA, ESTADO_REVISION, fechaCorta, gradoLabel, mensajeError, type EstadoRevision, avisar } from "@/lib/escolar";

export const Route = createFileRoute("/_authenticated/justificaciones")({
  head: () => ({ meta: [{ title: "Justificaciones — Colegio Miraflores" }] }),
  component: Justificaciones,
});

function Justificaciones() {
  const s = useSesion();
  const qc = useQueryClient();
  const revisor = s.es("admin", "auxiliar", "secretaria");
  const [elegir, setElegir] = useState(false);
  const [justificar, setJustificar] = useState<{ id: string; matricula_id: string; fecha: string } | null>(null);
  const [filtro, setFiltro] = useState<EstadoRevision | "TODAS">(revisor ? "PENDIENTE" : "TODAS");

  const { data, isLoading } = useQuery({
    queryKey: ["justificaciones", filtro],
    queryFn: async () => {
      let q = supabase
        .from("justificaciones")
        .select("*, asistencias(fecha, estado, matriculas(grados(*), secciones(nombre), estudiantes(nombres, apellidos)))")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filtro !== "TODAS") q = q.eq("estado_revision", filtro);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function resolver(id: string, aprobar: boolean) {
    const observacion = aprobar ? "" : window.prompt("Motivo del rechazo") ?? "";
    if (!aprobar && !observacion) return;
    const { error } = await supabase.rpc("resolver_justificacion", { _justificacion_id: id, _aprobar: aprobar, _observacion: observacion });
    if (error) return avisar(mensajeError(error));
    toast.success(aprobar ? "Justificación aprobada." : "Justificación rechazada.");
    qc.invalidateQueries({ queryKey: ["justificaciones"] });
  }

  async function ver(path: string) {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 120);
    if (data) window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <>
      <EncabezadoPagina
        icono={FileCheck2}
        titulo="Justificaciones"
        descripcion={revisor ? "Revise y resuelva las justificaciones presentadas por los apoderados." : "Justificaciones que presentó por las faltas o tardanzas de sus hijos."}
        acciones={<Button onClick={() => setElegir(true)}><Plus /> Nueva justificación</Button>}
      />
      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as EstadoRevision | "TODAS")} className="mb-4">
        <TabsList>
          <TabsTrigger value="PENDIENTE">Pendientes</TabsTrigger>
          <TabsTrigger value="APROBADA">Aprobadas</TabsTrigger>
          <TabsTrigger value="RECHAZADA">Rechazadas</TabsTrigger>
          <TabsTrigger value="TODAS">Todas</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Cargando />
      ) : !data?.length ? (
        <Vacio icono={FileCheck2} titulo="No hay justificaciones" />
      ) : (
        <div className="grid gap-3">
          {data.map((j) => {
            const a = j.asistencias;
            const m = a?.matriculas;
            return (
              <div key={j.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m?.estudiantes?.nombres} {m?.estudiantes?.apellidos}</span>
                    <span className="text-sm text-muted-foreground">· {gradoLabel(m?.grados)} “{m?.secciones?.nombre}”</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {fechaCorta(a?.fecha)} · {a && ESTADO_ASISTENCIA[a.estado].label}
                  </div>
                  <p className="mt-2 text-sm">“{j.motivo}”</p>
                  {j.observacion && <p className="mt-1 text-xs text-destructive">Observación: {j.observacion}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {j.sustento_path && (
                    <Button size="sm" variant="ghost" onClick={() => ver(j.sustento_path!)}><Eye /> Sustento</Button>
                  )}
                  {revisor && j.estado_revision === "PENDIENTE" ? (
                    <>
                      <Button size="sm" variant="success" onClick={() => resolver(j.id, true)}><Check /> Aprobar</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => resolver(j.id, false)}><X /> Rechazar</Button>
                    </>
                  ) : (
                    <EstadoBadge tone={ESTADO_REVISION[j.estado_revision].tone}>{ESTADO_REVISION[j.estado_revision].label}</EstadoBadge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ElegirFalta abierto={elegir} onClose={() => setElegir(false)} onElegir={(a) => { setElegir(false); setJustificar(a); }} />
      <DialogoJustificar
        asistencia={justificar}
        onClose={() => setJustificar(null)}
        onListo={() => {
          setJustificar(null);
          setFiltro(revisor ? "PENDIENTE" : "TODAS");
          qc.invalidateQueries({ queryKey: ["justificaciones"] });
        }}
      />
    </>
  );
}

type Falta = { id: string; matricula_id: string; fecha: string };

function ElegirFalta({ abierto, onClose, onElegir }: { abierto: boolean; onClose: () => void; onElegir: (a: Falta) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["faltas-sin-justificar"],
    enabled: abierto,
    queryFn: async () => {
      const desde = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("asistencias")
        .select("id, matricula_id, fecha, estado, justificaciones(id), matriculas(estudiantes(nombres, apellidos), grados(*), secciones(nombre))")
        .in("estado", ["FALTA", "TARDANZA"])
        .gte("fecha", desde)
        .order("fecha", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data.filter((a) => !a.justificaciones);
    },
  });
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Qué falta o tardanza desea justificar?</DialogTitle>
          <DialogDescription>Se muestran las de los últimos 60 días que aún no tienen justificación.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Cargando />
        ) : !data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay faltas ni tardanzas pendientes de justificar.</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto rounded-xl border">
            {data.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onElegir(a)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted">
                  <div>
                    <div className="font-medium">{a.matriculas?.estudiantes?.nombres} {a.matriculas?.estudiantes?.apellidos}</div>
                    <div className="text-xs text-muted-foreground">{fechaCorta(a.fecha)} · {gradoLabel(a.matriculas?.grados)} “{a.matriculas?.secciones?.nombre}”</div>
                  </div>
                  <EstadoBadge tone={ESTADO_ASISTENCIA[a.estado].tone}>{ESTADO_ASISTENCIA[a.estado].label}</EstadoBadge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
