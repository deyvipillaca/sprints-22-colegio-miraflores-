import type { BadgeTone } from "@/lib/escolar";

export type TipoReclamo = "RECLAMO" | "QUEJA" | "SUGERENCIA";
export type EstadoReclamo = "PENDIENTE" | "EN_PROCESO" | "RESUELTO";

export const TIPO_RECLAMO: Record<TipoReclamo, { label: string; ayuda: string }> = {
  RECLAMO: { label: "Reclamo", ayuda: "Disconformidad con un servicio del colegio (matrícula, pagos, asistencia…)." },
  QUEJA: { label: "Queja", ayuda: "Malestar por la atención recibida, sin relación directa con un servicio." },
  SUGERENCIA: { label: "Sugerencia", ayuda: "Una idea para mejorar el colegio." },
};

export const ESTADO_RECLAMO: Record<EstadoReclamo, { label: string; tone: BadgeTone }> = {
  PENDIENTE: { label: "Pendiente", tone: "warning" },
  EN_PROCESO: { label: "En proceso", tone: "info" },
  RESUELTO: { label: "Resuelto", tone: "success" },
};
