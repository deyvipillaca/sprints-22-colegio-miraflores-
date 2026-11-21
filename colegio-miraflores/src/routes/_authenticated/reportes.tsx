import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart3, Download, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Metrica, Tarjeta, Vacio } from "@/components/escolar/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aCSV, descargar, ESTADO_MATRICULA, gradoLabel, hoyISO, porcentajeAsistencia, TIPO_MATRICULA, vacantes, type EstadoMatricula, avisar } from "@/lib/escolar";
import { ESTADO_RECLAMO, TIPO_RECLAMO, type EstadoReclamo, type TipoReclamo } from "@/lib/reclamos";
import { periodosQuery, periodoVigente, seccionesQuery } from "@/lib/datos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({ meta: [{ title: "Reportes — Colegio Miraflores" }] }),
  component: Reportes,
});

function Reportes() {
  const s = useSesion();
  const { data: periodos = [] } = useQuery(periodosQuery);
  const [periodoId, setPeriodoId] = useState("");
  useEffect(() => {
    const v = periodoVigente(periodos);
    if (!periodoId && v) setPeriodoId(v.id);
  }, [periodos, periodoId]);
  const periodo = periodos.find((p) => p.id === periodoId);

  return (
    <>
      <EncabezadoPagina
        icono={BarChart3}
        titulo="Reportes"
        descripcion="Matrícula, vacantes, asistencia, justificaciones y reclamos para la toma de decisiones."
        acciones={
          <Select value={periodoId} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Año" /></SelectTrigger>
            <SelectContent>{periodos.map((p) => <SelectItem key={p.id} value={p.id}>Año {p.anio}</SelectItem>)}</SelectContent>
          </Select>
        }
      />
      <Tabs defaultValue="matricula">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="matricula">Matrícula y vacantes</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="justificaciones">Justificaciones</TabsTrigger>
          <TabsTrigger value="reclamos">Reclamos</TabsTrigger>
          <TabsTrigger value="siagie">Exportar SIAGIE</TabsTrigger>
          {s.es("admin", "director") && <TabsTrigger value="bitacora">Bitácora</TabsTrigger>}
        </TabsList>
        <TabsContent value="matricula">{periodoId && <ReporteMatricula periodoId={periodoId} />}</TabsContent>
        <TabsContent value="asistencia">{periodoId && <ReporteAsistencia periodoId={periodoId} />}</TabsContent>
        <TabsContent value="justificaciones"><ReporteJustificaciones /></TabsContent>
        <TabsContent value="reclamos"><ReporteReclamos /></TabsContent>
        <TabsContent value="siagie">{periodo && <ExportarSiagie periodoId={periodo.id} anio={periodo.anio} />}</TabsContent>
        {s.es("admin", "director") && <TabsContent value="bitacora"><Bitacora /></TabsContent>}
      </Tabs>
    </>
  );
}

function ReporteMatricula({ periodoId }: { periodoId: string }) {
  const { data: secciones = [] } = useQuery(seccionesQuery(periodoId));
  const { data: matriculas, isLoading } = useQuery({
    queryKey: ["reporte-matricula", periodoId],
    queryFn: async () => {
      const { data } = await supabase.from("matriculas").select("estado, grado_id").eq("periodo_id", periodoId);
      return data ?? [];
    },
  });
  if (isLoading || !matriculas) return <Cargando />;

  const grados = [...new Map(secciones.map((x) => [x.grado_id, x.grados])).entries()];
  const capacidad = secciones.reduce((a, x) => a + x.capacidad, 0);
  const ocupadas = secciones.reduce((a, x) => a + x.ocupadas, 0);
  const cuenta = (e: EstadoMatricula) => matriculas.filter((m) => m.estado === e).length;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Metrica etiqueta="Matriculados" valor={cuenta("MATRICULADA")} tono="success" />
        <Metrica etiqueta="En trámite" valor={cuenta("SOLICITADA") + cuenta("EN_REVISION")} tono="warning" />
        <Metrica etiqueta="Vacantes libres" valor={capacidad - ocupadas} detalle={`de ${capacidad}`} />
        <Metrica etiqueta="Ocupación" valor={capacidad ? `${Math.round((ocupadas / capacidad) * 100)}%` : "—"} tono="terracota" />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Grado</th>
              <th className="px-4 py-3">Secciones (ocupadas / capacidad)</th>
              {(["MATRICULADA", "SOLICITADA", "EN_REVISION", "RECHAZADA"] as EstadoMatricula[]).map((e) => (
                <th key={e} className="px-3 py-3 text-center">{ESTADO_MATRICULA[e].label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grados.map(([gid, g]) => {
              const ss = secciones.filter((x) => x.grado_id === gid);
              const ms = matriculas.filter((m) => m.grado_id === gid);
              return (
                <tr key={gid} className="border-t">
                  <td className="px-4 py-3 font-medium">{gradoLabel(g)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      {ss.map((x) => (
                        <div key={x.id} className="w-32">
                          <div className="flex justify-between text-xs"><span>“{x.nombre}”</span><span className="text-muted-foreground">{x.ocupadas}/{x.capacidad}</span></div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full rounded-full", vacantes(x) === 0 ? "bg-destructive" : "bg-primary")} style={{ width: `${(x.ocupadas / x.capacidad) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  {(["MATRICULADA", "SOLICITADA", "EN_REVISION", "RECHAZADA"] as EstadoMatricula[]).map((e) => (
                    <td key={e} className="px-3 py-3 text-center">{ms.filter((m) => m.estado === e).length || <span className="text-muted-foreground">·</span>}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteAsistencia({ periodoId }: { periodoId: string }) {
  const [desde, setDesde] = useState(hoyISO().slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoyISO());
  const { data: secciones = [] } = useQuery(seccionesQuery(periodoId));
  const { data, isLoading } = useQuery({
    queryKey: ["reporte-asistencia", periodoId, desde, hasta],
    queryFn: async () => {
      const ids = secciones.map((x) => x.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("asistencias").select("seccion_id, estado").in("seccion_id", ids).gte("fecha", desde).lte("fecha", hasta).limit(10000);
      return data ?? [];
    },
    enabled: secciones.length > 0,
  });
  const filas = secciones
    .map((x) => {
      const a = (data ?? []).filter((r) => r.seccion_id === x.id).map((r) => r.estado);
      return { x, total: a.length, pct: porcentajeAsistencia(a), faltas: a.filter((e) => e === "FALTA").length, tard: a.filter((e) => e === "TARDANZA").length, just: a.filter((e) => e === "JUSTIFICADA").length };
    })
    .filter((f) => f.total > 0);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        <div className="grid gap-1"><Label>Desde</Label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="grid gap-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
      </div>
      {isLoading ? (
        <Cargando />
      ) : filas.length === 0 ? (
        <Vacio icono={BarChart3} titulo="Sin asistencia registrada en ese rango" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Sección</th>
                <th className="px-4 py-3">Asistencia</th>
                <th className="px-3 py-3 text-center">Tardanzas</th>
                <th className="px-3 py-3 text-center">Faltas</th>
                <th className="px-3 py-3 text-center">Justificadas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.x.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{gradoLabel(f.x.grados)} “{f.x.nombre}”</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", (f.pct ?? 0) >= 90 ? "bg-success" : (f.pct ?? 0) >= 80 ? "bg-warning" : "bg-destructive")} style={{ width: `${f.pct ?? 0}%` }} />
                      </div>
                      <span className="font-semibold">{f.pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">{f.tard}</td>
                  <td className="px-3 py-3 text-center">{f.faltas}</td>
                  <td className="px-3 py-3 text-center">{f.just}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExportarSiagie({ periodoId, anio }: { periodoId: string; anio: number }) {
  const [mes, setMes] = useState(hoyISO().slice(0, 7));

  async function nomina() {
    const { data, error } = await supabase
      .from("matriculas")
      .select("codigo, tipo, confirmada_en, estudiantes(dni, apellidos, nombres, fecha_nacimiento, apoderados(dni, nombre)), grados(*), secciones(nombre)")
      .eq("periodo_id", periodoId)
      .eq("estado", "MATRICULADA");
    if (error) return avisar("No se pudo generar la nómina.");
    const filas: (string | number)[][] = [
      ["CODIGO", "DNI_ESTUDIANTE", "APELLIDOS", "NOMBRES", "FECHA_NACIMIENTO", "NIVEL", "GRADO", "SECCION", "TIPO_MATRICULA", "FECHA_MATRICULA", "DNI_APODERADO", "APODERADO"],
      ...(data ?? []).map((m) => [
        m.codigo, m.estudiantes?.dni ?? "", (m.estudiantes?.apellidos ?? "").toUpperCase(), (m.estudiantes?.nombres ?? "").toUpperCase(),
        m.estudiantes?.fecha_nacimiento ?? "", m.grados?.nivel.toUpperCase() ?? "", m.grados?.numero ?? "", m.secciones?.nombre ?? "",
        TIPO_MATRICULA[m.tipo].toUpperCase(), m.confirmada_en?.slice(0, 10) ?? "", m.estudiantes?.apoderados?.dni ?? "", (m.estudiantes?.apoderados?.nombre ?? "").toUpperCase(),
      ]),
    ];
    descargar(`nomina-matricula-${anio}.csv`, aCSV(filas));
    toast.success(`Nómina exportada (${filas.length - 1} estudiantes).`);
  }

  async function asistenciaMes() {
    const [y = 2026, m = 1] = mes.split("-").map(Number);
    const hasta = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    const { data, error } = await supabase
      .from("asistencias")
      .select("fecha, estado, matriculas!inner(periodo_id, estudiantes(dni, apellidos, nombres), grados(*), secciones(nombre))")
      .eq("matriculas.periodo_id", periodoId)
      .gte("fecha", `${mes}-01`)
      .lte("fecha", hasta)
      .order("fecha")
      .limit(20000);
    if (error) return avisar("No se pudo generar el reporte.");
    const cod = { PRESENTE: "A", TARDANZA: "T", FALTA: "I", JUSTIFICADA: "J" } as const;
    const filas: (string | number)[][] = [
      ["DNI_ESTUDIANTE", "APELLIDOS", "NOMBRES", "NIVEL", "GRADO", "SECCION", "FECHA", "ASISTENCIA"],
      ...(data ?? []).map((a) => [
        a.matriculas?.estudiantes?.dni ?? "", (a.matriculas?.estudiantes?.apellidos ?? "").toUpperCase(), (a.matriculas?.estudiantes?.nombres ?? "").toUpperCase(),
        a.matriculas?.grados?.nivel.toUpperCase() ?? "", a.matriculas?.grados?.numero ?? "", a.matriculas?.secciones?.nombre ?? "", a.fecha, cod[a.estado],
      ]),
    ];
    descargar(`asistencia-${mes}.csv`, aCSV(filas));
    toast.success(`Asistencia exportada (${filas.length - 1} registros).`);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tarjeta>
        <h3 className="text-lg font-semibold">Nómina de matrícula {anio}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Estudiantes matriculados con datos del apoderado, en CSV para cargar en SIAGIE.</p>
        <Button className="mt-4" onClick={nomina}><Download /> Descargar nómina</Button>
      </Tarjeta>
      <Tarjeta>
        <h3 className="text-lg font-semibold">Asistencia mensual</h3>
        <p className="mt-1 text-sm text-muted-foreground">Códigos: A asistió, T tardanza, I inasistencia, J justificada.</p>
        <div className="mt-4 flex gap-2">
          <Input type="month" className="w-44" value={mes} onChange={(e) => setMes(e.target.value)} />
          <Button onClick={asistenciaMes}><Download /> Descargar</Button>
        </div>
      </Tarjeta>
    </div>
  );
}

function Bitacora() {
  const { data, isLoading } = useQuery({
    queryKey: ["bitacora"],
    queryFn: async () => {
      const [b, perfiles] = await Promise.all([
        supabase.from("auditoria").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, nombre, correo"),
      ]);
      return (b.data ?? []).map((r) => ({ ...r, usuario: perfiles.data?.find((p) => p.id === r.usuario_id) }));
    },
  });
  if (isLoading) return <Cargando />;
  if (!data?.length) return <Vacio icono={ScrollText} titulo="La bitácora está vacía" />;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Módulo</th><th className="px-4 py-3">Acción</th></tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{new Date(r.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="px-4 py-2.5">{r.usuario?.nombre || r.usuario?.correo || "Sistema"}</td>
              <td className="px-4 py-2.5 capitalize">{r.tabla}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{r.accion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useRango() {
  const [desde, setDesde] = useState(hoyISO().slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoyISO());
  const filtros = (
    <div className="flex flex-wrap gap-3">
      <div className="grid gap-1"><Label>Desde</Label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
      <div className="grid gap-1"><Label>Hasta</Label><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
    </div>
  );
  return { desde, hasta, filtros };
}

function ReporteJustificaciones() {
  const { desde, hasta, filtros } = useRango();
  const { data, isLoading } = useQuery({
    queryKey: ["reporte-justificaciones", desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("justificaciones")
        .select("estado_revision, motivo, created_at, asistencias(fecha, estado, matriculas(estudiantes(dni, nombres, apellidos), grados(*), secciones(nombre)))")
        .gte("created_at", desde)
        .lte("created_at", hasta + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });
  const n = (e: string) => (data ?? []).filter((j) => j.estado_revision === e).length;
  function exportar() {
    descargar(`justificaciones-${desde}-a-${hasta}.csv`, aCSV([
      ["PRESENTADA", "DNI", "ESTUDIANTE", "GRADO", "SECCION", "FECHA_FALTA", "TIPO", "MOTIVO", "ESTADO"],
      ...(data ?? []).map((j) => {
        const m = j.asistencias?.matriculas;
        return [j.created_at.slice(0, 10), m?.estudiantes?.dni ?? "", `${m?.estudiantes?.apellidos ?? ""}, ${m?.estudiantes?.nombres ?? ""}`, gradoLabel(m?.grados), m?.secciones?.nombre ?? "", j.asistencias?.fecha ?? "", j.asistencias?.estado ?? "", j.motivo, j.estado_revision];
      }),
    ]));
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">{filtros}<Button variant="outline" onClick={exportar} disabled={!data?.length}><Download /> Exportar CSV</Button></div>
      {isLoading ? <Cargando /> : (
        <div className="grid gap-4 sm:grid-cols-4">
          <Metrica etiqueta="Presentadas" valor={data?.length ?? 0} />
          <Metrica etiqueta="Pendientes" valor={n("PENDIENTE")} tono="warning" />
          <Metrica etiqueta="Aprobadas" valor={n("APROBADA")} tono="success" />
          <Metrica etiqueta="Rechazadas" valor={n("RECHAZADA")} tono="danger" />
        </div>
      )}
    </div>
  );
}

function ReporteReclamos() {
  const { desde, hasta, filtros } = useRango();
  const { data, isLoading } = useQuery({
    queryKey: ["reporte-reclamos", desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reclamos")
        .select("codigo, tipo, asunto, estado, created_at, respondido_en, apoderados(nombre, dni)")
        .gte("created_at", desde)
        .lte("created_at", hasta + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });
  const rs = data ?? [];
  const resueltos = rs.filter((r) => r.estado === "RESUELTO" && r.respondido_en);
  const dias = resueltos.length ? Math.round(resueltos.reduce((a, r) => a + (new Date(r.respondido_en!).getTime() - new Date(r.created_at).getTime()) / 86400000, 0) / resueltos.length) : null;
  function exportar() {
    descargar(`reclamos-${desde}-a-${hasta}.csv`, aCSV([
      ["NUMERO", "FECHA", "TIPO", "ASUNTO", "APODERADO", "DNI_APODERADO", "ESTADO", "RESPONDIDO"],
      ...rs.map((r) => [r.codigo, r.created_at.slice(0, 10), TIPO_RECLAMO[r.tipo as TipoReclamo].label, r.asunto, r.apoderados?.nombre ?? "", r.apoderados?.dni ?? "", ESTADO_RECLAMO[r.estado as EstadoReclamo].label, r.respondido_en?.slice(0, 10) ?? ""]),
    ]));
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">{filtros}<Button variant="outline" onClick={exportar} disabled={!rs.length}><Download /> Exportar CSV</Button></div>
      {isLoading ? <Cargando /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Metrica etiqueta="Recibidos" valor={rs.length} />
            <Metrica etiqueta="Sin resolver" valor={rs.filter((r) => r.estado !== "RESUELTO").length} tono="warning" />
            <Metrica etiqueta="Resueltos" valor={resueltos.length} tono="success" />
            <Metrica etiqueta="Días para resolver" valor={dias ?? "—"} detalle="promedio" tono="terracota" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.keys(TIPO_RECLAMO) as TipoReclamo[]).map((t) => (
              <Tarjeta key={t}>
                <div className="text-sm text-muted-foreground">{TIPO_RECLAMO[t].label}s</div>
                <div className="mt-1 font-display text-2xl font-semibold">{rs.filter((r) => r.tipo === t).length}</div>
              </Tarjeta>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
