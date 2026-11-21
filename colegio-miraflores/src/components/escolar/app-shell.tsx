import type { ReactNode } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
  Users,
  Wallet,
  BarChart3,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { ROL_LABEL, type AppRole } from "@/lib/escolar";
import { Escudo } from "@/components/escolar/escudo";

type NavItem = { to: string; label: string; icon: LucideIcon; roles: AppRole[] | "todos" };

const NAV: { grupo: string; items: NavItem[] }[] = [
  {
    grupo: "General",
    items: [
      { to: "/panel", label: "Inicio", icon: LayoutDashboard, roles: "todos" },
      { to: "/notificaciones", label: "Avisos", icon: Bell, roles: ["apoderado", "admin", "secretaria", "director"] },
    ],
  },
  {
    grupo: "Matrícula",
    items: [
      { to: "/matriculas", label: "Matrículas", icon: ClipboardList, roles: ["admin", "secretaria", "tesoreria", "director", "apoderado", "estudiante"] },
      { to: "/estudiantes", label: "Estudiantes", icon: Users, roles: ["admin", "secretaria", "director"] },
      { to: "/pagos", label: "Pagos", icon: Wallet, roles: ["admin", "tesoreria", "secretaria", "director", "apoderado"] },
    ],
  },
  {
    grupo: "Asistencia",
    items: [
      { to: "/asistencia", label: "Tomar asistencia", icon: CalendarCheck, roles: ["admin", "docente", "auxiliar", "secretaria"] },
      { to: "/asistencia/historial", label: "Historial", icon: History, roles: "todos" },
      { to: "/justificaciones", label: "Justificaciones", icon: FileCheck2, roles: ["admin", "auxiliar", "secretaria", "apoderado"] },
    ],
  },
  {
    grupo: "Atención",
    items: [{ to: "/reclamos", label: "Reclamos", icon: MessageSquareWarning, roles: "todos" }],
  },
  {
    grupo: "Gestión",
    items: [
      { to: "/reportes", label: "Reportes", icon: BarChart3, roles: ["admin", "director", "secretaria"] },
      { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
    ],
  },
];

export function AppShell() {
  const sesion = useSesion();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: sinLeer = 0 } = useQuery({
    queryKey: ["notificaciones", "sin-leer", sesion.apoderado?.id],
    enabled: !!sesion.apoderado,
    queryFn: async () => {
      const { count } = await supabase
        .from("notificaciones")
        .select("id", { count: "exact", head: true })
        .eq("apoderado_id", sesion.apoderado!.id)
        .eq("leida", false);
      return count ?? 0;
    },
  });

  async function salir() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const visible = (i: NavItem) => i.roles === "todos" || sesion.es(...i.roles);

  return (
    <SidebarProvider>
      <Sidebar className="print:hidden">
        <SidebarHeader className="px-4 pt-5 pb-3">
          <Link to="/panel" className="flex items-center gap-3">
            <Escudo className="size-10" />
            <div className="leading-tight">
              <div className="font-display text-base font-semibold text-sidebar-accent-foreground">Colegio Miraflores</div>
              <div className="text-xs text-sidebar-foreground/70">Matrícula y asistencia</div>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {NAV.map((g) => {
            const items = g.items.filter(visible);
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={g.grupo}>
                <SidebarGroupLabel className="text-sidebar-foreground/50">{g.grupo}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((i) => {
                      const activo = i.to === "/asistencia" ? pathname === "/asistencia" : pathname.startsWith(i.to);
                      return (
                        <SidebarMenuItem key={i.to}>
                          <SidebarMenuButton asChild isActive={activo}>
                            <Link to={i.to}>
                              <i.icon />
                              <span>{i.label}</span>
                            </Link>
                          </SidebarMenuButton>
                          {i.to === "/notificaciones" && sinLeer > 0 && (
                            <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground">{sinLeer}</SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <SidebarMenu>
            {sesion.es("apoderado") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/mi-perfil")}>
                  <Link to="/mi-perfil">
                    <UserRound />
                    <span>Mis datos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={salir}>
                <LogOut />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="mt-2 rounded-lg bg-sidebar-accent px-3 py-2">
            <div className="truncate text-sm font-medium text-sidebar-accent-foreground">{sesion.nombre}</div>
            <div className="truncate text-xs text-sidebar-foreground/70">
              {sesion.roles.map((r) => ROL_LABEL[r]).join(" · ") || "Sin rol asignado"}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur print:hidden md:hidden">
          <SidebarTrigger />
          <span className="font-display font-semibold">Colegio Miraflores</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10 print:p-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  icono: Icono = BookOpenCheck,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  icono?: LucideIcon;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 animate-subir sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div className="flex items-start gap-4">
        <div className="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground sm:flex">
          <Icono className="size-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{titulo}</h1>
          {descripcion && <p className="mt-1.5 max-w-2xl text-muted-foreground">{descripcion}</p>}
        </div>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}


