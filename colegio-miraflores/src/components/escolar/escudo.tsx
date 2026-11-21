import { cn } from "@/lib/utils";

/** School crest: shield with open book and Pacific waves. */
export function Escudo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={cn("shrink-0", className)} aria-hidden="true">
      <path d="M24 2 L45 9 V27 C45 41 35.5 50 24 54 C12.5 50 3 41 3 27 V9 Z" className="fill-terracota" />
      <path d="M24 6.5 L41 12.2 V27 C41 38.6 33.4 46 24 49.6 C14.6 46 7 38.6 7 27 V12.2 Z" className="fill-primary" />
      <path d="M13 20 C17 18.5 21 18.8 24 21 C27 18.8 31 18.5 35 20 V31 C31 29.6 27 29.9 24 32 C21 29.9 17 29.6 13 31 Z" className="fill-primary-foreground" />
      <path d="M24 21 V32" className="stroke-primary" strokeWidth="1.4" />
      <path d="M11 38 C14 36 17 36 20 38 C23 40 26 40 29 38 C32 36 35 36 38 38" className="stroke-primary-foreground" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
