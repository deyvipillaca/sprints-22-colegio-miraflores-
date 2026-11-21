import { useEffect, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Estudiante = { nombres: string; apellidos: string; dni: string; codigo_qr: string };

/** Texto que lleva el QR del carnet. El escáner acepta "CM:<código>" o solo el código. */
export const textoQR = (codigo: string) => `CM:${codigo}`;

export function CarnetQR({ estudiante }: { estudiante: Estudiante }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let vivo = true;
    import("qrcode").then((QR) =>
      QR.toDataURL(textoQR(estudiante.codigo_qr), { width: 512, margin: 1, errorCorrectionLevel: "M" }).then((u) => vivo && setSrc(u)),
    );
    return () => {
      vivo = false;
    };
  }, [estudiante.codigo_qr]);

  return (
    <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl border bg-card text-center shadow-soft">
      <div className="bg-primary px-4 py-3 text-primary-foreground">
        <div className="font-display text-lg font-semibold leading-tight">Colegio Miraflores</div>
        <div className="text-xs opacity-80">Carnet de asistencia</div>
      </div>
      <div className="p-5">
        {src ? <img src={src} alt={`Código QR de ${estudiante.nombres}`} className="mx-auto aspect-square w-52" /> : <div className="mx-auto aspect-square w-52 animate-pulse rounded-lg bg-muted" />}
        <div className="mt-3 font-display text-lg font-semibold">{estudiante.apellidos}, {estudiante.nombres}</div>
        <div className="text-sm text-muted-foreground">DNI {estudiante.dni}</div>
        <div className="mt-2 font-mono text-xs tracking-widest text-muted-foreground">{estudiante.codigo_qr}</div>
        {src && (
          <Button asChild variant="outline" size="sm" className="mt-4">
            <a href={src} download={`qr-${estudiante.dni}.png`}><Download /> Descargar QR</a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function BotonCarnetQR({ estudiante, etiqueta = true }: { estudiante: Estudiante; etiqueta?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size={etiqueta ? "sm" : "icon"} aria-label="Carnet QR">
          <QrCode /> {etiqueta && "Carnet QR"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Carnet QR</DialogTitle></DialogHeader>
        <CarnetQR estudiante={estudiante} />
        <p className="text-center text-xs text-muted-foreground">Muestre este código al ingresar para registrar la asistencia.</p>
      </DialogContent>
    </Dialog>
  );
}

export function QRImagen({ codigo, className }: { codigo: string; className?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let vivo = true;
    import("qrcode").then((QR) => QR.toDataURL(textoQR(codigo), { width: 320, margin: 1 }).then((u) => vivo && setSrc(u)));
    return () => {
      vivo = false;
    };
  }, [codigo]);
  return src ? <img src={src} alt="Código QR de asistencia" className={className} /> : <div className={className} />;
}
