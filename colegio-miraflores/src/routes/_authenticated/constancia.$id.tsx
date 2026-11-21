import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRImagen } from "@/components/escolar/carnet-qr";
import { Escudo } from "@/components/escolar/escudo";
import { Cargando, Vacio } from "@/components/escolar/ui";
import { Button } from "@/components/ui/button";
import { TIPO_MATRICULA, fechaCorta, fechaLarga, gradoLabel, hoyISO } from "@/lib/escolar";
import { MATRICULA_SELECT } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/constancia/$id")({
  head: () => ({ meta: [{ title: "Constancia de matrícula — Colegio Miraflores" }] }),
  component: Constancia,
});

function Constancia() {
  const { id } = Route.useParams();
  const { data: m, isLoading } = useQuery({
    queryKey: ["constancia", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("matriculas").select(MATRICULA_SELECT).eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <Cargando />;
  if (!m || m.estado !== "MATRICULADA") {
    return <Vacio icono={Printer} titulo="Constancia no disponible" texto="La constancia se emite cuando la matrícula está confirmada." />;
  }
  return (
    <>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link to="/matriculas/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir o guardar PDF
        </Button>
      </div>
      <article className="mx-auto max-w-2xl rounded-2xl border bg-card p-10 shadow-soft print:border-0 print:shadow-none">
        <header className="flex items-center gap-4 border-b pb-6">
          <Escudo className="size-16" />
          <div>
            <div className="font-display text-2xl font-semibold">Colegio Miraflores</div>
            <div className="text-sm text-muted-foreground">Miraflores, Lima — Perú</div>
          </div>
        </header>
        <h1 className="mt-8 text-center text-2xl font-semibold uppercase tracking-wide">Constancia de matrícula</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">N.° {String(m.codigo).padStart(6, "0")} — Año escolar {m.periodos?.anio}</p>
        <p className="mt-8 leading-relaxed">
          La Secretaría del Colegio Miraflores hace constar que el (la) estudiante{" "}
          <strong>
            {m.estudiantes?.nombres} {m.estudiantes?.apellidos}
          </strong>
          , identificado(a) con DNI N.° <strong>{m.estudiantes?.dni}</strong>, se encuentra matriculado(a) en{" "}
          <strong>
            {gradoLabel(m.grados)}, sección “{m.secciones?.nombre}”
          </strong>{" "}
          para el año escolar <strong>{m.periodos?.anio}</strong>.
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-4 rounded-xl bg-muted p-5 text-sm">
          <div><dt className="text-muted-foreground">Tipo de matrícula</dt><dd className="font-medium">{TIPO_MATRICULA[m.tipo]}</dd></div>
          <div><dt className="text-muted-foreground">Fecha de confirmación</dt><dd className="font-medium">{fechaCorta(m.confirmada_en)}</dd></div>
          <div><dt className="text-muted-foreground">Apoderado</dt><dd className="font-medium">{m.estudiantes?.apoderados?.nombre}</dd></div>
          <div><dt className="text-muted-foreground">DNI del apoderado</dt><dd className="font-medium">{m.estudiantes?.apoderados?.dni}</dd></div>
        </dl>
        <p className="mt-8 text-sm">Se expide la presente a solicitud del interesado, para los fines que estime conveniente.</p>
        <p className="mt-2 text-sm">Miraflores, {fechaLarga(hoyISO())}.</p>
        <div className="mt-16 flex items-end justify-between gap-6">
          <div className="text-center">
            {m.estudiantes && <QRImagen codigo={m.estudiantes.codigo_qr} className="size-28" />}
            <div className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">QR de asistencia · {m.estudiantes?.codigo_qr}</div>
          </div>
          <div className="w-56 border-t pt-2 text-center text-sm">
            Secretaría Académica
            <div className="text-xs text-muted-foreground">Colegio Miraflores</div>
          </div>
        </div>
      </article>
    </>
  );
}
