import { createFileRoute, redirect } from "@tanstack/react-router";
import { cargarSesion } from "@/lib/sesion";
import { AppShell } from "@/components/escolar/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const sesion = await cargarSesion();
    if (!sesion) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { sesion };
  },
  component: AppShell,
});

