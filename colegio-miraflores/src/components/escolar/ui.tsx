import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Tarjeta({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-5 shadow-soft md:p-6", className)}>{children}</div>;
}

export function Metrica({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  tono = "primary",
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono?: LucideIcon;
  tono?: "primary" | "success" | "warning" | "danger" | "terracota";
}) {
  const tonos = {
    primary: "bg-accent text-accent-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    danger: "bg-destructive-soft text-destructive",
    terracota: "bg-terracota/15 text-terracota",
  };
  return (
    <Tarjeta className="animate-subir">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-muted-foreground">{etiqueta}</div>
        {Icono && (
          <div className={cn("flex size-9 items-center justify-center rounded-lg", tonos[tono])}>
            <Icono className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-muted-foreground">{detalle}</div>}
    </Tarjeta>
  );
}

export function Vacio({ icono: Icono, titulo, texto, children }: { icono: LucideIcon; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icono className="size-5" />
      </div>
      <div className="mt-3 font-display text-lg font-semibold">{titulo}</div>
      {texto && <p className="mt-1 max-w-md text-sm text-muted-foreground">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Cargando() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function TituloSeccion({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">{children}</h2>
      {accion}
    </div>
  );
}
