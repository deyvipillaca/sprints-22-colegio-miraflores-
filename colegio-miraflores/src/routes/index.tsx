import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, BellRing, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Escudo } from "@/components/escolar/escudo";
import { modoLocal } from "@/integrations/supabase/client";
import patio from "@/assets/colegio-patio.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Colegio Miraflores — Matrícula en línea y asistencia" },
      {
        name: "description",
        content: "Solicite la matrícula de su hijo en línea, revise su asistencia y reciba avisos del Colegio Miraflores.",
      },
      { property: "og:title", content: "Colegio Miraflores — Matrícula en línea y asistencia" },
      {
        property: "og:description",
        content: "Matrícula sin colas, asistencia diaria y avisos oportunos para apoderados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

const BENEFICIOS = [
  { icon: ClipboardList, titulo: "Matrícula sin colas", texto: "Solicite o ratifique la matrícula, adjunte documentos y siga su estado desde casa." },
  { icon: CalendarCheck, titulo: "Asistencia en minutos", texto: "Los docentes toman lista desde el celular: todos presentes y solo marcan excepciones." },
  { icon: BellRing, titulo: "Avisos al apoderado", texto: "Faltas, tardanzas y cambios de matrícula llegan al instante, con opción de justificar." },
  { icon: ShieldCheck, titulo: "Datos protegidos", texto: "Cada persona ve solo lo que le corresponde, según la Ley N.° 29733." },
];

function Inicio() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-mar text-primary-foreground">
        <div className="absolute inset-0 texture-olas" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <Escudo className="size-11" />
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">Colegio Miraflores</div>
              <div className="text-xs text-primary-foreground/70">Lima, Perú</div>
            </div>
          </div>
          <Button asChild variant="heroOutline">
            <Link to="/auth">Ingresar</Link>
          </Button>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
          <div className="animate-subir">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-sm text-primary-foreground/90">
              <span className="size-2 rounded-full bg-terracota" /> Matrícula 2027 abierta
            </span>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.02] md:text-6xl">
              La matrícula y la asistencia de su hijo, en un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
              Apoderados, docentes y secretaría trabajan con la misma información: solicitudes, documentos, pagos,
              lista diaria y justificaciones.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/auth" search={{ modo: "registro" }}>
                  Solicitar matrícula <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="heroOutline" size="xl">
                <Link to="/auth">Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>
          <div className="relative animate-subir [animation-delay:120ms]">
            {modoLocal ? (
              <div className="grid aspect-[4/3] place-items-center rounded-3xl border border-primary-foreground/20 bg-primary-foreground/10 shadow-lift">
                <Escudo className="size-40" />
              </div>
            ) : <img
              src={patio.url}
              alt="Estudiantes del Colegio Miraflores caminando por el patio con el mar al fondo"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift"
            />}
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl bg-card p-4 text-card-foreground shadow-lift sm:block">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Asistencia de hoy</div>
              <div className="mt-1 font-display text-3xl font-semibold text-success">96,4 %</div>
              <div className="text-xs text-muted-foreground">5.° Primaria A · 28 de 29 presentes</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <b.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{b.titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.texto}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 rounded-3xl bg-secondary p-8 md:grid-cols-3 md:p-12">
          <div className="md:col-span-1">
            <h2 className="text-3xl font-semibold">¿Cómo matriculo a mi hijo?</h2>
            <p className="mt-2 text-muted-foreground">Cuatro pasos, sin salir de casa.</p>
          </div>
          <ol className="grid gap-5 sm:grid-cols-2 md:col-span-2">
            {[
              ["Cree su cuenta", "Regístrese con su correo y complete sus datos de apoderado."],
              ["Registre la solicitud", "Indique los datos del estudiante, el grado y el tipo de matrícula."],
              ["Adjunte documentos", "DNI, partida de nacimiento y, si es traslado, certificado de estudios."],
              ["Pague y reciba su constancia", "Tesorería registra el pago y Secretaría confirma la vacante."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-terracota font-display font-semibold text-terracota-foreground">
                  {i + 1}
                </span>
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-sm text-muted-foreground">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Colegio Miraflores</span>
          <span>Sistema de matrícula y asistencia</span>
        </div>
      </footer>
    </div>
  );
}
