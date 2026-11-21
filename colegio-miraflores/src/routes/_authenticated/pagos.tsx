import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Metrica, Vacio } from "@/components/escolar/ui";
import { EstadoBadge } from "@/components/escolar/estado-badge";
import { Input } from "@/components/ui/input";
import { ESTADO_MATRICULA, fechaCorta, gradoLabel, soles, MATRICULA_ACTIVA } from "@/lib/escolar";
import { periodosQuery } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({ meta: [{ title: "Pagos — Colegio Miraflores" }] }),
  component: Pagos,
});

function Pagos() {
  const s = useSesion();
  const [texto, setTexto] = useState("");
  const { data: periodos = [] } = useQuery(periodosQuery);

  const { data, isLoading } = useQuery({
    queryKey: ["pagos-resumen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select("id, codigo, estado, periodo_id, grados(*), estudiantes(nombres, apellidos, dni), pagos(*)")
        .in("estado", MATRICULA_ACTIVA)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return (data ?? [])
      .map((m) => {
        const p = periodos.find((x) => x.id === m.periodo_id);
        const pagado = m.pagos.filter((x) => x.estado === "CONFIRMADO").reduce((a, x) => a + Number(x.monto), 0);
        const monto = Number(p?.monto_matricula ?? 0);
        return { ...m, anio: p?.anio, pagado, monto, saldo: Math.max(monto - pagado, 0) };
      })
      .filter((m) => !t || `${m.estudiantes?.nombres} ${m.estudiantes?.apellidos} ${m.estudiantes?.dni} ${m.codigo}`.toLowerCase().includes(t));
  }, [data, periodos, texto]);

  const totalCobrado = filas.reduce((a, f) => a + f.pagado, 0);
  const pendientes = filas.filter((f) => f.saldo > 0 && f.estado !== "MATRICULADA");

  return (
    <>
      <EncabezadoPagina
        icono={Wallet}
        titulo="Pagos de matrícula"
        descripcion={s.es("tesoreria", "admin") ? "Abra una matrícula para registrar el pago recibido." : "Estado de los pagos de matrícula."}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Metrica etiqueta="Total cobrado" valor={soles(totalCobrado)} tono="success" />
        <Metrica etiqueta="Solicitudes con pago pendiente" valor={pendientes.length} tono="warning" />
        <Metrica etiqueta="Saldo por cobrar" valor={soles(pendientes.reduce((a, f) => a + f.saldo, 0))} tono="terracota" />
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar estudiante o N.° de matrícula" className="pl-9" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      {isLoading ? (
        <Cargando />
      ) : filas.length === 0 ? (
        <Vacio icono={Wallet} titulo="No hay matrículas activas" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Año / Grado</th>
                <th className="px-4 py-3">Pagado</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Último pago</th>
                <th className="px-4 py-3">Matrícula</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const ultimo = [...f.pagos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
                return (
                  <tr key={f.id} className="border-t hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link to="/matriculas/$id" params={{ id: f.id }} className="font-medium hover:text-primary hover:underline">
                        {f.estudiantes?.apellidos}, {f.estudiantes?.nombres}
                      </Link>
                      <div className="text-xs text-muted-foreground">N.° {f.codigo}</div>
                    </td>
                    <td className="px-4 py-3">{f.anio} · {gradoLabel(f.grados)}</td>
                    <td className="px-4 py-3">{soles(f.pagado)}</td>
                    <td className="px-4 py-3">
                      {f.saldo > 0 ? <EstadoBadge tone="warning">{soles(f.saldo)}</EstadoBadge> : <EstadoBadge tone="success">Pagado</EstadoBadge>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ultimo ? `${fechaCorta(ultimo.fecha)} ${ultimo.comprobante}` : "—"}</td>
                    <td className="px-4 py-3"><EstadoBadge tone={ESTADO_MATRICULA[f.estado].tone}>{ESTADO_MATRICULA[f.estado].label}</EstadoBadge></td>
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
