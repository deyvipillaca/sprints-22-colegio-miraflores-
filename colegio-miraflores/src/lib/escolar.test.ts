import { describe, expect, it } from "vitest";
import { checklistMatricula, documentosRequeridos, matriculaHabilitada, porcentajeAsistencia, vacantes } from "./escolar";

const docs = (tipos: string[]) => tipos.map((tipo) => ({ tipo, estado: "VALIDADO" as const }));

describe("Reglas de matrícula", () => {
  it("un traslado exige también el certificado de estudios", () => {
    expect(documentosRequeridos("NUEVA")).toHaveLength(3);
    expect(documentosRequeridos("TRASLADO")).toContain("Certificado de estudios");
  });

  it("no se puede confirmar sin el pago completo de S/ 300", () => {
    const r = checklistMatricula({
      tipo: "NUEVA",
      estado: "SOLICITADA",
      documentos: docs(documentosRequeridos("NUEVA")),
      pagos: [{ monto: 200, estado: "CONFIRMADO" }],
      montoRequerido: 300,
    });
    expect(r.pagoCompleto).toBe(false);
    expect(r.listaParaConfirmar).toBe(false);
  });

  it("no se puede confirmar con documentos sin validar", () => {
    const r = checklistMatricula({
      tipo: "NUEVA",
      estado: "SOLICITADA",
      documentos: [
        { tipo: "DNI del estudiante", estado: "VALIDADO" },
        { tipo: "Partida de nacimiento", estado: "PENDIENTE" },
      ],
      pagos: [{ monto: 300, estado: "CONFIRMADO" }],
      montoRequerido: 300,
    });
    expect(r.documentosFaltantes).toEqual(["Partida de nacimiento", "DNI del apoderado"]);
    expect(r.listaParaConfirmar).toBe(false);
  });

  it("con documentos validados y pago completo queda lista para confirmar", () => {
    const r = checklistMatricula({
      tipo: "NUEVA",
      estado: "EN_REVISION",
      documentos: docs(documentosRequeridos("NUEVA")),
      pagos: [
        { monto: 300, estado: "CONFIRMADO" },
        { monto: 50, estado: "ANULADO" },
      ],
      montoRequerido: 300,
    });
    expect(r.pagado).toBe(300);
    expect(r.listaParaConfirmar).toBe(true);
  });

  it("la matrícula solo se registra dentro del periodo habilitado", () => {
    const p = { inicio_matricula: "2026-11-01", fin_matricula: "2027-03-31" };
    expect(matriculaHabilitada(p, "2026-11-17")).toBe(true);
    expect(matriculaHabilitada(p, "2027-04-01")).toBe(false);
  });

  it("una sección llena no tiene vacantes", () => {
    expect(vacantes({ capacidad: 30, ocupadas: 30 })).toBe(0);
    expect(vacantes({ capacidad: 30, ocupadas: 28 })).toBe(2);
  });
});

describe("Reglas de asistencia", () => {
  it("las faltas bajan el porcentaje; tardanzas y justificadas cuentan como asistencia", () => {
    expect(porcentajeAsistencia(["PRESENTE", "TARDANZA", "JUSTIFICADA", "FALTA"])).toBe(75);
    expect(porcentajeAsistencia([])).toBeNull();
  });
});
