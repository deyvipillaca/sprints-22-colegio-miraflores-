import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { EncabezadoPagina } from "@/components/escolar/app-shell";
import { Cargando, Vacio } from "@/components/escolar/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notificaciones")({
  head: () => ({ meta: [{ title: "Avisos — Colegio Miraflores" }] }),
  component: Notificaciones,
});

function Notificaciones() {
  const s = useSesion();
  const qc = useQueryClient();
  const propias = !!s.apoderado && !s.es("admin", "secretaria", "director");
  const { data, isLoading } = useQuery({
    queryKey: ["notificaciones", propias],
    queryFn: async () => {
      let q = supabase
        .from("notificaciones")
        .select("*, estudiantes(nombres, apellidos), apoderados(nombre)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (propias) q = q.eq("apoderado_id", s.apoderado!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function marcarTodas() {
    if (!s.apoderado) return;
    await supabase.from("notificaciones").update({ leida: true }).eq("apoderado_id", s.apoderado.id).eq("leida", false);
    qc.invalidateQueries({ queryKey: ["notificaciones"] });
  }

  const sinLeer = (data ?? []).filter((n) => !n.leida && n.apoderado_id === s.apoderado?.id).length;

  return (
    <>
      <EncabezadoPagina
        icono={Bell}
        titulo="Avisos"
        descripcion={propias ? "Mensajes del colegio sobre sus hijos." : "Avisos enviados a los apoderados."}
        acciones={
          sinLeer > 0 && (
            <Button variant="outline" size="sm" onClick={marcarTodas}><CheckCheck /> Marcar como leídos</Button>
          )
        }
      />
      {isLoading ? (
        <Cargando />
      ) : !data?.length ? (
        <Vacio icono={Bell} titulo="Sin avisos por ahora" />
      ) : (
        <div className="grid gap-2">
          {data.map((n) => (
            <div key={n.id} className={cn("flex gap-4 rounded-xl border bg-card px-5 py-4", !n.leida && n.apoderado_id === s.apoderado?.id && "border-terracota/40 bg-terracota/5")}>
              <div className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.leida ? "bg-border" : "bg-terracota")} />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-semibold">{n.asunto}</div>
                  <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</div>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.mensaje}</p>
                {!propias && <p className="mt-1 text-xs text-muted-foreground">Para: {n.apoderados?.nombre}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
