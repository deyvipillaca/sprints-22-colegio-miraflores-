import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADO_MATRICULA, TIPO_MATRICULA, fechaCorta, gradoLabel, type EstadoMatricula } from "@/lib/escolar";
import { MATRICULA_SELECT, periodosQuery } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/matriculas/")({
  head: () => ({ meta: [{ title: "Matrículas — Colegio Miraflores" }] }),
  component: Matriculas,
});

function Matriculas() {
  const s = useSesion();
  const { data: periodos } = useQuery(periodosQuery);
  const [periodo, setPeriodo] = useState<string>("todos");
  const [estado, setEstado] = useState<string>("todos");
  const [texto, setTexto] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["matriculas", periodo, estado],
    queryFn: async () => {
      let q = supabase.from("matriculas").select(MATRICULA_SELECT).order("created_at", { ascending: false }).limit(500);
      if (periodo !== "todos") q = q.eq("periodo_id", periodo);
      if (estado !== "todos") q = q.eq("estado", estado as EstadoMatricula);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return data ?? [];
    return (data ?? []).filter((m) =>
      `${m.estudiantes?.nombres} ${m.estudiantes?.apellidos} ${m.estudiantes?.dni} ${m.codigo}`.toLowerCase().includes(t),
    );
  }, [data, texto]);

  const puedeCrear = s.es("admin", "secretaria", "apoderado");

  return (
    <>
      <EncabezadoPagina
        icono={ClipboardList}
        titulo="Matrículas"
        descripcion={s.es("apoderado") && !s.es("admin", "secretaria") ? "Solicitudes y matrículas de sus hijos." : "Solicitudes, ratificaciones y traslados."}
        acciones={
          puedeCrear && (
            <Button asChild>
              <Link to="/matriculas/nueva">
                <Plus /> Nueva matrícula
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, DNI o N.°" className="pl-9" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Año" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los años</SelectItem>
            {periodos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.anio}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {(Object.keys(ESTADO_MATRICULA) as EstadoMatricula[]).map((e) => (
              <SelectItem key={e} value={e}>{ESTADO_MATRICULA[e].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Cargando />
      ) : filtradas.length === 0 ? (
        <Vacio icono={ClipboardList} titulo="No hay matrículas" texto="Cuando se registre una solicitud aparecerá aquí." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">N.°</th>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Año / Grado</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((m) => (
                <tr key={m.id} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.codigo}</td>
                  <td className="px-4 py-3">
                    <Link to="/matriculas/$id" params={{ id: m.id }} className="font-medium text-foreground hover:text-primary hover:underline">
                      {m.estudiantes?.apellidos}, {m.estudiantes?.nombres}
                    </Link>
                    <div className="text-xs text-muted-foreground">DNI {m.estudiantes?.dni}</div>
                  </td>
                  <td className="px-4 py-3">
                    {m.periodos?.anio} · {gradoLabel(m.grados)}
                    {m.secciones && <span className="text-muted-foreground"> “{m.secciones.nombre}”</span>}
                  </td>
                  <td className="px-4 py-3">{TIPO_MATRICULA[m.tipo]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fechaCorta(m.created_at)}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge tone={ESTADO_MATRICULA[m.estado].tone}>{ESTADO_MATRICULA[m.estado].label}</EstadoBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
