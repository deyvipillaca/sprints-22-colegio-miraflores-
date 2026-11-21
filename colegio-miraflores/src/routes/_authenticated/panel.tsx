import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  Plus,
  School,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Metrica, Tarjeta, TituloSeccion, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Button } from "@/components/ui/button";
import {
  ESTADO_MATRICULA,
  esPersonal,
  fechaLarga,
  gradoLabel,
  hoyISO,
  porcentajeAsistencia,
  vacantes,
} from "@/lib/escolar";
import { MATRICULA_SELECT, periodosQuery, periodoVigente } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [{ title: "Inicio — Colegio Miraflores" }] }),
  component: Panel,
});

function Panel() {
  const s = useSesion();
  const saludo = s.nombre.split(" ")[0];
  return (
    <>
      <EncabezadoPagina
        icono={LayoutDashboard}
        titulo={`Hola, ${saludo}`}
        descripcion={fechaLarga(hoyISO()).replace(/^\w/, (c) => c.toUpperCase())}
      />
      {esPersonal(s.roles) ? <PanelPersonal /> : s.es("apoderado") ? <PanelApoderado /> : <SinRol />}
    </>
  );
}

function SinRol() {
  return (
    <Vacio
      icono={UserRound}
      titulo="Su cuenta aún no tiene un rol"
      texto="Pida al administrador del colegio que le asigne su rol (docente, secretaría, estudiante, etc.)."
    />
  );
}

function PanelApoderado() {
  const s = useSesion();
  const { data, isLoading } = useQuery({
    queryKey: ["panel-apoderado", s.apoderado?.id],
    enabled: !!s.apoderado,
    queryFn: async () => {
      const { data: hijos, error } = await supabase
        .from("estudiantes")
        .select("*, matriculas(*, grados(*), secciones(*), periodos(*))")
        .eq("apoderado_id", s.apoderado!.id)
        .order("nombres");
      if (error) throw error;
      const desde = hoyISO().slice(0, 8) + "01";
      const ids = (hijos ?? []).flatMap((h) => h.matriculas.map((m) => m.id));
      const { data: asis } = ids.length
        ? await supabase.from("asistencias").select("matricula_id, estado").in("matricula_id", ids).gte("fecha", desde)
        : { data: [] };
      return { hijos: hijos ?? [], asis: asis ?? [] };
    },
  });

  if (!s.apoderado) {
    return (
      <Tarjeta className="flex flex-col items-start gap-4 border-terracota/40 bg-terracota/5 sm:flex-row sm:items-center">
        <AlertCircle className="size-8 text-terracota" />
        <div className="flex-1">
          <div className="font-display text-lg font-semibold">Complete sus datos de apoderado</div>
          <p className="text-sm text-muted-foreground">Necesitamos su DNI y teléfono antes de registrar la matrícula de sus hijos.</p>
        </div>
        <Button asChild variant="terracota">
          <Link to="/mi-perfil">Completar datos</Link>
        </Button>
      </Tarjeta>
    );
  }
  if (isLoading || !data) return <Cargando />;

  return (
    <div className="grid gap-8">
      <div>
        <TituloSeccion
          accion={
            <Button asChild size="sm">
              <Link to="/matriculas/nueva">
                <Plus /> Nueva matrícula
              </Link>
            </Button>
          }
        >
          Mis hijos
        </TituloSeccion>
        {data.hijos.length === 0 ? (
          <Vacio icono={Users} titulo="Aún no registra estudiantes" texto="Registre la matrícula de su hijo o hija para empezar.">
            <Button asChild>
              <Link to="/matriculas/nueva">Registrar matrícula</Link>
            </Button>
          </Vacio>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.hijos.map((h) => {
              const ms = [...h.matriculas].sort((a, b) => (b.periodos?.anio ?? 0) - (a.periodos?.anio ?? 0));
              const pct = porcentajeAsistencia(
                data.asis.filter((a) => ms.some((m) => m.id === a.matricula_id)).map((a) => a.estado),
              );
              return (
                <Tarjeta key={h.id} className="animate-subir">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-xl font-semibold">
                        {h.nombres} {h.apellidos}
                      </div>
                      <div className="text-sm text-muted-foreground">DNI {h.dni}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl font-semibold text-success">{pct === null ? "—" : `${pct}%`}</div>
                      <div className="text-xs text-muted-foreground">asistencia del mes</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {ms.map((m) => (
                      <Link
                        key={m.id}
                        to="/matriculas/$id"
                        params={{ id: m.id }}
                        className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm hover:bg-accent"
                      >
                        <span>
                          {m.periodos?.anio} · {gradoLabel(m.grados)} {m.secciones ? `"${m.secciones.nombre}"` : ""}
                        </span>
                        <EstadoBadge tone={ESTADO_MATRICULA[m.estado].tone}>{ESTADO_MATRICULA[m.estado].label}</EstadoBadge>
                      </Link>
                    ))}
                  </div>
                </Tarjeta>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PanelPersonal() {
  const s = useSesion();
  const { data: periodos } = useQuery(periodosQuery);
  const vigente = periodos ? periodoVigente(periodos) : undefined;
  const campaña = periodos?.find((p) => hoyISO() >= p.inicio_matricula && hoyISO() <= p.fin_matricula);

  const { data } = useQuery({
    queryKey: ["panel-personal", vigente?.id, campaña?.id, s.userId],
    enabled: !!vigente,
    queryFn: async () => {
      const hoy = hoyISO();
      const [secciones, asisHoy, pendJust, solicitudes] = await Promise.all([
        supabase.from("secciones").select("*, grados(*)").eq("periodo_id", vigente!.id),
        supabase.from("asistencias").select("seccion_id, estado").eq("fecha", hoy),
        supabase.from("justificaciones").select("id", { count: "exact", head: true }).eq("estado_revision", "PENDIENTE"),
        campaña
          ? supabase.from("matriculas").select(MATRICULA_SELECT).eq("periodo_id", campaña.id).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as never[] }),
      ]);
      return {
        secciones: secciones.data ?? [],
        asisHoy: asisHoy.data ?? [],
        pendJust: pendJust.count ?? 0,
        solicitudes: solicitudes.data ?? [],
      };
    },
  });

  if (!data || !vigente) return <Cargando />;

  const conAlumnos = data.secciones.filter((x) => x.ocupadas > 0);
  const registradas = new Set(data.asisHoy.map((a) => a.seccion_id));
  const pctHoy = porcentajeAsistencia(data.asisHoy.map((a) => a.estado));
  const misSecciones = data.secciones.filter((x) => x.docente_id === s.userId);
  const pendientes = data.solicitudes.filter((m) => m.estado === "SOLICITADA" || m.estado === "EN_REVISION");
  const matriculados = data.solicitudes.filter((m) => m.estado === "MATRICULADA").length;

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          etiqueta={`Asistencia de hoy`}
          valor={pctHoy === null ? "—" : `${pctHoy}%`}
          detalle={`${registradas.size} de ${conAlumnos.length} secciones registradas`}
          icono={CalendarCheck}
          tono="success"
        />
        <Metrica
          etiqueta={campaña ? `Solicitudes ${campaña.anio} por atender` : "Campaña de matrícula"}
          valor={campaña ? pendientes.length : "Cerrada"}
          detalle={campaña ? `${matriculados} ya matriculados` : undefined}
          icono={ClipboardList}
          tono="terracota"
        />
        <Metrica
          etiqueta="Justificaciones pendientes"
          valor={data.pendJust}
          icono={FileCheck2}
          tono={data.pendJust > 0 ? "warning" : "primary"}
        />
        <Metrica
          etiqueta={`Estudiantes ${vigente.anio}`}
          valor={data.secciones.reduce((a, x) => a + x.ocupadas, 0)}
          detalle={`${data.secciones.reduce((a, x) => a + vacantes(x), 0)} vacantes libres`}
          icono={School}
        />
      </div>

      {(s.es("docente") || misSecciones.length > 0) && (
        <div>
          <TituloSeccion>Mis secciones</TituloSeccion>
          {misSecciones.length === 0 ? (
            <Vacio icono={School} titulo="Sin secciones asignadas" texto="El administrador debe asignarle sus secciones en Configuración." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {misSecciones.map((x) => (
                <Tarjeta key={x.id}>
                  <div className="font-display text-lg font-semibold">
                    {gradoLabel(x.grados)} “{x.nombre}”
                  </div>
                  <div className="text-sm text-muted-foreground">{x.ocupadas} estudiantes</div>
                  <div className="mt-4 flex items-center justify-between">
                    {registradas.has(x.id) ? (
                      <EstadoBadge tone="success">Asistencia registrada</EstadoBadge>
                    ) : (
                      <EstadoBadge tone="warning">Falta registrar hoy</EstadoBadge>
                    )}
                    <Button asChild size="sm" variant={registradas.has(x.id) ? "outline" : "default"}>
                      <Link to="/asistencia" search={{ seccion: x.id }}>
                        Tomar lista
                      </Link>
                    </Button>
                  </div>
                </Tarjeta>
              ))}
            </div>
          )}
        </div>
      )}

      {s.es("admin", "secretaria", "tesoreria", "director") && campaña && (
        <div>
          <TituloSeccion
            accion={
              <Button asChild variant="outline" size="sm">
                <Link to="/matriculas">Ver todas</Link>
              </Button>
            }
          >
            Últimas solicitudes {campaña.anio}
          </TituloSeccion>
          {pendientes.length === 0 ? (
            <Vacio icono={ClipboardList} titulo="No hay solicitudes por atender" />
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              {pendientes.slice(0, 6).map((m) => (
                <Link
                  key={m.id}
                  to="/matriculas/$id"
                  params={{ id: m.id }}
                  className="flex items-center justify-between gap-3 border-b px-5 py-3 last:border-0 hover:bg-muted/60"
                >
                  <div>
                    <div className="font-medium">
                      {m.estudiantes?.nombres} {m.estudiantes?.apellidos}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      N.° {m.codigo} · {gradoLabel(m.grados)}
                    </div>
                  </div>
                  <EstadoBadge tone={ESTADO_MATRICULA[m.estado].tone}>{ESTADO_MATRICULA[m.estado].label}</EstadoBadge>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {s.es("tesoreria") && (
        <Button asChild variant="outline" className="w-fit">
          <Link to="/pagos">
            <Wallet /> Ir a pagos
          </Link>
        </Button>
      )}
    </div>
  );
}
