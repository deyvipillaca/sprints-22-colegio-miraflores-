import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/lib/escolar";

export function EstadoBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <Badge variant={tone}>{children}</Badge>;
}
