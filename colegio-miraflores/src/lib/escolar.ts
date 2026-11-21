import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type EstadoMatricula = Database["public"]["Enums"]["estado_matricula"];
export type TipoMatricula = Database["public"]["Enums"]["tipo_matricula"];
export type EstadoAsistencia = Database["public"]["Enums"]["estado_asistencia"];
export type EstadoRevision = Database["public"]["Enums"]["estado_revision"];
export type EstadoDocumento = Database["public"]["Enums"]["estado_documento"];

export type BadgeTone = "success" | "warning" | "info" | "danger" | "muted" | "default" | "terracota";

export const ROLES: AppRole[] = [
  "admin",
  "secretaria",
  "tesoreria",
  "director",
  "docente",
  "auxiliar",
  "apoderado",
  "estudiante",
];

export const ROL_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  secretaria: "Secretaría",
  tesoreria: "Tesorería",
  director: "Director",
  docente: "Docente",
  auxiliar: "Auxiliar",
  apoderado: "Apoderado",
  estudiante: "Estudiante",
};

export const STAFF_ROLES: AppRole[] = ["admin", "secretaria", "tesoreria", "director", "docente", "auxiliar"];

export function tieneRol(roles: AppRole[], ...buscados: AppRole[]) {
  return buscados.some((r) => roles.includes(r));
}

export function esPersonal(roles: AppRole[]) {
  return tieneRol(roles, ...STAFF_ROLES);
}

export function gradoLabel(g: { nivel: string; numero: number } | null | undefined) {
  if (!g) return "—";
  if (g.nivel === "Inicial") return `Inicial ${g.numero} años`;
  return `${g.numero}.° ${g.nivel}`;
}

export const ESTADO_MATRICULA: Record<EstadoMatricula, { label: string; tone: BadgeTone }> = {
  SOLICITADA: { label: "Solicitada", tone: "info" },
  EN_REVISION: { label: "En revisión", tone: "warning" },
  MATRICULADA: { label: "Matriculada", tone: "success" },
  RECHAZADA: { label: "Rechazada", tone: "danger" },
  RETIRADA: { label: "Retirada", tone: "muted" },
  ANULADA: { label: "Anulada", tone: "muted" },
};

export const TIPO_MATRICULA: Record<TipoMatricula, string> = {
  NUEVA: "Nueva",
  RATIFICACION: "Ratificación",
  TRASLADO: "Traslado",
};

export const ESTADO_ASISTENCIA: Record<EstadoAsistencia, { label: string; corto: string; tone: BadgeTone }> = {
  PRESENTE: { label: "Presente", corto: "P", tone: "success" },
  TARDANZA: { label: "Tardanza", corto: "T", tone: "warning" },
  FALTA: { label: "Falta", corto: "F", tone: "danger" },
  JUSTIFICADA: { label: "Justificada", corto: "J", tone: "info" },
};

export const ESTADO_REVISION: Record<EstadoRevision, { label: string; tone: BadgeTone }> = {
  PENDIENTE: { label: "Pendiente", tone: "warning" },
  APROBADA: { label: "Aprobada", tone: "success" },
  RECHAZADA: { label: "Rechazada", tone: "danger" },
};

export const ESTADO_DOCUMENTO: Record<EstadoDocumento, { label: string; tone: BadgeTone }> = {
  PENDIENTE: { label: "Por revisar", tone: "warning" },
  VALIDADO: { label: "Validado", tone: "success" },
  OBSERVADO: { label: "Observado", tone: "danger" },
};

/** Mirrors public.documentos_requeridos() in the database. */
export function documentosRequeridos(tipo: TipoMatricula): string[] {
  const base = ["DNI del estudiante", "Partida de nacimiento", "DNI del apoderado"];
  return tipo === "TRASLADO" ? [...base, "Certificado de estudios"] : base;
}

export const MATRICULA_ACTIVA: EstadoMatricula[] = ["SOLICITADA", "EN_REVISION", "MATRICULADA"];

export interface ChecklistMatricula {
  documentosFaltantes: string[];
  pagado: number;
  montoRequerido: number;
  pagoCompleto: boolean;
  listaParaConfirmar: boolean;
}

/** Same checks the database runs in confirmar_matricula, used to guide Secretaría in the UI. */
export function checklistMatricula(input: {
  tipo: TipoMatricula;
  estado: EstadoMatricula;
  documentos: { tipo: string; estado: EstadoDocumento }[];
  pagos: { monto: number; estado: string }[];
  montoRequerido: number;
}): ChecklistMatricula {
  const validados = new Set(input.documentos.filter((d) => d.estado === "VALIDADO").map((d) => d.tipo));
  const documentosFaltantes = documentosRequeridos(input.tipo).filter((t) => !validados.has(t));
  const pagado = input.pagos
    .filter((p) => p.estado === "CONFIRMADO")
    .reduce((acc, p) => acc + Number(p.monto), 0);
  const pagoCompleto = pagado >= input.montoRequerido;
  const abierta = input.estado === "SOLICITADA" || input.estado === "EN_REVISION";
  return {
    documentosFaltantes,
    pagado,
    montoRequerido: input.montoRequerido,
    pagoCompleto,
    listaParaConfirmar: abierta && documentosFaltantes.length === 0 && pagoCompleto,
  };
}

export function vacantes(s: { capacidad: number; ocupadas: number }) {
  return Math.max(s.capacidad - s.ocupadas, 0);
}

/** Attendance rate: present + late + justified count as attended. */
export function porcentajeAsistencia(estados: EstadoAsistencia[]) {
  if (estados.length === 0) return null;
  const asistio = estados.filter((e) => e !== "FALTA").length;
  return Math.round((asistio / estados.length) * 1000) / 10;
}

export function matriculaHabilitada(p: { inicio_matricula: string; fin_matricula: string }, hoy: string) {
  return hoy >= p.inicio_matricula && hoy <= p.fin_matricula;
}

export function hoyISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function fechaLarga(iso: string) {
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function soles(n: number | string) {
  return `S/ ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function mensajeError(e: unknown) {
  if (e && typeof e === "object" && "message" in e) {
    const m = String((e as { message: string }).message);
    if (m.includes("matricula_unica_activa")) return "El estudiante ya tiene una matrícula activa en ese año.";
    if (m.includes("duplicate key") && m.includes("dni")) return "Ese DNI ya está registrado.";
    if (m.includes("row-level security")) return "No tiene permiso para realizar esta acción.";
    return m;
  }
  return "Ocurrió un error inesperado.";
}

/** CSV export with the nómina columns used for SIAGIE uploads. */
export function aCSV(filas: (string | number)[][]) {
  return filas
    .map((f) =>
      f
        .map((c) => {
          const v = String(c ?? "");
          return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(","),
    )
    .join("\n");
}

export function descargar(nombre: string, contenido: string, tipo = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff" + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/** Shows an error toast; returns void so handlers can `return avisar(...)`. */
export function avisar(msg: string): void {
  toast.error(msg);
}
