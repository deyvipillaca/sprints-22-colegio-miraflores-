import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function ok<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

export const periodosQuery = queryOptions({
  queryKey: ["periodos"],
  queryFn: () => ok(supabase.from("periodos").select("*").order("anio", { ascending: false })),
});

export const gradosQuery = queryOptions({
  queryKey: ["grados"],
  queryFn: () => ok(supabase.from("grados").select("*").order("orden")),
});

export const seccionesQuery = (periodoId?: string) =>
  queryOptions({
    queryKey: ["secciones", periodoId],
    enabled: !!periodoId,
    queryFn: () =>
      ok(
        supabase
          .from("secciones")
          .select("*, grados(*)")
          .eq("periodo_id", periodoId!)
          .order("nombre"),
      ).then((rows) =>
        [...rows].sort((a, b) => (a.grados?.orden ?? 0) - (b.grados?.orden ?? 0) || a.nombre.localeCompare(b.nombre)),
      ),
  });

export const personalQuery = queryOptions({
  queryKey: ["personal"],
  queryFn: async () => {
    const [perfiles, roles] = await Promise.all([
      ok(supabase.from("profiles").select("*").order("nombre")),
      ok(supabase.from("user_roles").select("*")),
    ]);
    return perfiles.map((p) => ({ ...p, roles: roles.filter((r) => r.user_id === p.id).map((r) => r.role) }));
  },
});

export const MATRICULA_SELECT =
  "*, estudiantes(*, apoderados(*)), grados(*), secciones(*), periodos(*)" as const;

export function periodoVigente<T extends { activo: boolean; anio: number }>(periodos: T[]) {
  return periodos.find((p) => p.activo) ?? periodos[0];
}
