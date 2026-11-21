import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

/** Lee códigos QR con la cámara. Ignora el mismo código repetido durante 4 s. */
export function EscanerQR({ onLeer, activo = true }: { onLeer: (texto: string) => void; activo?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onLeer);
  cb.current = onLeer;
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!activo || !video.current) return;
    let scanner: { start: () => Promise<void>; destroy: () => void } | undefined;
    let cancelado = false;
    const ultimo = { texto: "", t: 0 };
    import("qr-scanner").then(({ default: QrScanner }) => {
      if (cancelado || !video.current) return;
      const s = new QrScanner(
        video.current,
        (r) => {
          const ahora = Date.now();
          if (r.data === ultimo.texto && ahora - ultimo.t < 4000) return;
          ultimo.texto = r.data;
          ultimo.t = ahora;
          cb.current(r.data);
        },
        { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 8 },
      );
      scanner = s;
      s.start().catch(() => setError("No se pudo abrir la cámara. Revise el permiso del navegador o escriba el código a mano."));
    });
    return () => {
      cancelado = true;
      scanner?.destroy();
    };
  }, [activo]);

  if (error)
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        <CameraOff className="size-8" />
        {error}
      </div>
    );
  return (
    <div className="relative overflow-hidden rounded-xl bg-foreground/90">
      <video ref={video} className="aspect-video w-full object-cover" muted playsInline />
    </div>
  );
}
