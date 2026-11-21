import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fechaCorta, mensajeError } from "@/lib/escolar";

export function DialogoJustificar({
  asistencia,
  onClose,
  onListo,
}: {
  asistencia: { id: string; matricula_id: string; fecha: string } | null;
  onClose: () => void;
  onListo: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!asistencia) return;
    setEnviando(true);
    try {
      let sustento_path: string | null = null;
      if (archivo) {
        if (archivo.size > 10 * 1024 * 1024) throw new Error("El archivo supera los 10 MB.");
        sustento_path = `${asistencia.matricula_id}/justificaciones/${Date.now()}-${archivo.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from("documentos").upload(sustento_path, archivo);
        if (up.error) throw up.error;
      }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("justificaciones")
        .insert({ asistencia_id: asistencia.id, motivo: motivo.trim(), sustento_path, presentado_por: u.user!.id });
      if (error) throw error;
      toast.success("Justificación enviada. Le avisaremos cuando sea revisada.");
      setMotivo("");
      setArchivo(null);
      onListo();
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={!!asistencia} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificar inasistencia</DialogTitle>
          <DialogDescription>{asistencia && `Día ${fechaCorta(asistencia.fecha)}`}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: cita médica, enfermedad…" />
          </div>
          <div className="grid gap-1.5">
            <Label>Sustento (opcional)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!motivo.trim() || enviando} onClick={enviar}>{enviando ? "Enviando…" : "Enviar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
