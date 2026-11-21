import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { History, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Metrica, Tarjeta, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { DialogoJustificar } from "@/components/escolar/dialogo-justificar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ESTADO_ASISTENCIA,
  ESTADO_REVISION,
  esPersonal,
  fechaLarga,
  gradoLabel,
  hoyISO,
  porcentajeAsistencia,
  type EstadoAsistencia,
  type EstadoRevision,
} from "@/lib/escolar";
import { periodosQuery, periodoVigente, seccionesQuery } from "@/lib/datos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/asistencia/historial")({
  head: () => ({ meta: [{ title: "Historial de asistencia — Colegio Miraflores" }] }),
  component: Historial,
});

function rangoMes(mes: string) {
  const [y = 2026, m = 1] = mes.split("-").map(Number);
  const fin = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(fin).padStart(2, "0")}`, dias: fin };
}

const CELDA: Record<EstadoAsistencia, string> = {
  PRESENTE: "bg-success-soft text-success",
  TARDANZA: "bg-warning-soft text-warning-foreground",
  FALTA: "bg-destructive-soft text-destructive",
  JUSTIFICADA: "bg-info-soft text-info",
};

function Historial() {
  const s = useSesion();
  return (
    <>
      <EncabezadoPagina icono={History} titulo="Historial de asistencia" descripcion="Consulte la asistencia por mes." />
      {esPersonal(s.roles) ? <HistorialSeccion /> : <HistorialEstudiante />}
    </>
  );
}

function HistorialSeccion() {
  const s = useSesion();
  const verTodo = s.es("admin", "auxiliar", "secretaria", "director");
  const { data: periodos } = useQuery(periodosQuery);
  const vigente = periodos ? periodoVigente(periodos) : undefined;
  const { data: secciones = [] } = useQuery(seccionesQuery(vigente?.id));
  const disponibles = secciones.filter((x) => x.ocupadas > 0 && (verTodo || x.docente_id === s.userId));
  const [seccionId, setSeccionId] = useState("");
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  useEffect(() => {
    if (!seccionId && disponibles[0]) setSeccionId(disponibles[0].id);
  }, [disponibles, seccionId]);
  const r = rangoMes(mes);

  const { data, isLoading } = useQuery({
    queryKey: ["historial-seccion", seccionId, mes],
    enabled: !!seccionId,
    queryFn: async () => {
      const [ms, asis] = await Promise.all([
        supabase.from("matriculas").select("id, estudiantes(nombres, apellidos)").eq("seccion_id", seccionId).eq("estado", "MATRICULADA"),
        supabase.from("asistencias").select("matricula_id, fecha, estado").eq("seccion_id", seccionId).gte("fecha", r.desde).lte("fecha", r.hasta),
      ]);
      return {
        lista: (ms.data ?? []).sort((a, b) => (a.estudiantes?.apellidos ?? "").localeCompare(b.estudiantes?.apellidos ?? "")),
        asis: asis.data ?? [],
      };
    },
  });

  const dias = useMemo(() => [...new Set((data?.asis ?? []).map((a) => a.fecha))].sort(), [data]);

  if (disponibles.length === 0) return <Vacio icono={Users} titulo="Sin secciones para mostrar" />;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select value={seccionId} onValueChange={setSeccionId}>
          <SelectTrigger className="sm:w-72"><SelectValue placeholder="Sección" /></SelectTrigger>
          <SelectContent>{disponibles.map((x) => <SelectItem key={x.id} value={x.id}>{gradoLabel(x.grados)} “{x.nombre}”</SelectItem>)}</SelectContent>
        </Select>
        <Input type="month" className="sm:w-48" value={mes} onChange={(e) => setMes(e.target.value)} />
      </div>
      {isLoading || !data ? (
        <Cargando />
      ) : dias.length === 0 ? (
        <Vacio icono={History} titulo="Sin registros en este mes" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="sticky left-0 bg-muted px-4 py-3 text-left">Estudiante</th>
                {dias.map((d) => <th key={d} className="px-1.5 py-3 font-medium">{d.slice(8)}</th>)}
                <th className="px-4 py-3">%</th>
              </tr>
            </thead>
            <tbody>
              {data.lista.map((m) => {
                const suyas = data.asis.filter((a) => a.matricula_id === m.id);
                const pct = porcentajeAsistencia(suyas.map((a) => a.estado));
                return (
                  <tr key={m.id} className="border-t">
                    <td className="sticky left-0 whitespace-nowrap bg-card px-4 py-2 font-medium">{m.estudiantes?.apellidos}, {m.estudiantes?.nombres}</td>
                    {dias.map((d) => {
                      const a = suyas.find((x) => x.fecha === d);
                      return (
                        <td key={d} className="px-1 py-1.5 text-center">
                          {a ? (
                            <span className={cn("inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold", CELDA[a.estado])} title={ESTADO_ASISTENCIA[a.estado].label}>
                              {ESTADO_ASISTENCIA[a.estado].corto}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-center font-semibold">{pct ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function HistorialEstudiante() {
  const qc = useQueryClient();
  const [matriculaId, setMatriculaId] = useState("");
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [justificar, setJustificar] = useState<{ id: string; matricula_id: string; fecha: string } | null>(null);
  const r = rangoMes(mes);

  const { data: matriculas = [] } = useQuery({
    queryKey: ["mis-matriculas-activas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matriculas")
        .select("id, estudiantes(nombres, apellidos), grados(*), secciones(nombre), periodos(anio)")
        .eq("estado", "MATRICULADA");
      return data ?? [];
    },
  });
  useEffect(() => {
    if (!matriculaId && matriculas[0]) setMatriculaId(matriculas[0].id);
  }, [matriculas, matriculaId]);

  const key = ["historial-estudiante", matriculaId, mes];
  const { data: asis, isLoading } = useQuery({
    queryKey: key,
    enabled: !!matriculaId,
    queryFn: async () => {
      const { data } = await supabase
        .from("asistencias")
        .select("id, matricula_id, fecha, estado, justificaciones(estado_revision)")
        .eq("matricula_id", matriculaId)
        .gte("fecha", r.desde)
        .lte("fecha", r.hasta)
        .order("fecha", { ascending: false });
      return data ?? [];
    },
  });

  if (matriculas.length === 0) return <Vacio icono={Users} titulo="No hay estudiantes matriculados" texto="Cuando su hijo esté matriculado verá aquí su asistencia." />;

  const estados = (asis ?? []).map((a) => a.estado);
  const pct = porcentajeAsistencia(estados);

  return (
    <>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <Select value={matriculaId} onValueChange={setMatriculaId}>
          <SelectTrigger className="sm:w-80"><SelectValue /></SelectTrigger>
          <SelectContent>
            {matriculas.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.estudiantes?.nombres} {m.estudiantes?.apellidos} · {m.periodos?.anio} {gradoLabel(m.grados)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="month" className="sm:w-48" value={mes} onChange={(e) => setMes(e.target.value)} />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Metrica etiqueta="Asistencia del mes" valor={pct === null ? "—" : `${pct}%`} tono="success" />
        <Metrica etiqueta="Tardanzas" valor={estados.filter((e) => e === "TARDANZA").length} tono="warning" />
        <Metrica etiqueta="Faltas" valor={estados.filter((e) => e === "FALTA").length} tono="danger" />
        <Metrica etiqueta="Justificadas" valor={estados.filter((e) => e === "JUSTIFICADA").length} />
      </div>
      {isLoading ? (
        <Cargando />
      ) : (asis ?? []).length === 0 ? (
        <Vacio icono={History} titulo="Sin registros en este mes" />
      ) : (
        <Tarjeta className="p-0 md:p-0">
          {(asis ?? []).map((a) => {
            const j = a.justificaciones;
            const just = (Array.isArray(j) ? j[0] : j) as { estado_revision: EstadoRevision } | null | undefined;
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 last:border-0">
                <div className="capitalize">{fechaLarga(a.fecha)}</div>
                <div className="flex items-center gap-2">
                  <EstadoBadge tone={ESTADO_ASISTENCIA[a.estado].tone}>{ESTADO_ASISTENCIA[a.estado].label}</EstadoBadge>
                  {just ? (
                    <EstadoBadge tone={ESTADO_REVISION[just.estado_revision].tone}>Justificación {ESTADO_REVISION[just.estado_revision].label.toLowerCase()}</EstadoBadge>
                  ) : (
                    (a.estado === "FALTA" || a.estado === "TARDANZA") && (
                      <Button size="sm" variant="outline" onClick={() => setJustificar(a)}>Justificar</Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </Tarjeta>
      )}
      <DialogoJustificar
        asistencia={justificar}
        onClose={() => setJustificar(null)}
        onListo={() => {
          setJustificar(null);
          qc.invalidateQueries({ queryKey: key });
        }}
      />
    </>
  );
}
