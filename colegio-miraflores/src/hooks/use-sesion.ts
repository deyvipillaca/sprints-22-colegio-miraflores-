import { useRouteContext } from "@tanstack/react-router";
import { tieneRol, type AppRole } from "@/lib/escolar";

export function useSesion() {
  const sesion = useRouteContext({ from: "/_authenticated" }).sesion;
  return {
    ...sesion,
    es: (...roles: AppRole[]) => tieneRol(sesion.roles, ...roles),
  };
}
