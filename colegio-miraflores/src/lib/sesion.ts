import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/escolar";

export interface Sesion {
  userId: string;
  email: string;
  nombre: string;
  roles: AppRole[];
  apoderado: { id: string; nombre: string; dni: string; telefono: string } | null;
}

export async function cargarSesion(): Promise<Sesion | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [rolesRes, perfilRes, apoRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle(),
    supabase.from("apoderados").select("id, nombre, dni, telefono").eq("user_id", user.id).maybeSingle(),
  ]);
  return {
    userId: user.id,
    email: user.email ?? "",
    nombre: perfilRes.data?.nombre || apoRes.data?.nombre || user.email?.split("@")[0] || "Usuario",
    roles: (rolesRes.data ?? []).map((r) => r.role),
    apoderado: apoRes.data ?? null,
  };
}
