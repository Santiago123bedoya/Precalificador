"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  LayoutDashboard,
  FilePlus,
  Files,
  Users,
  BarChart3,
  Settings,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Building2,
  ClipboardList,
  Receipt,
  Brain,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gestor", "asociado"] },
  { href: "/dashboard/solicitud/nueva", label: "Nueva Solicitud", icon: FilePlus, roles: ["admin", "gestor", "asociado"] },
  { href: "/dashboard/mis-solicitudes", label: "Mis Solicitudes", icon: ClipboardList, roles: ["asociado"] },
  { href: "/dashboard/cuestionario", label: "Cuestionario Ético", icon: Brain, roles: ["asociado", "admin"] },
  { href: "/dashboard/mis-servicios", label: "Servicios Públicos", icon: Receipt, roles: ["asociado", "admin"] },
  { href: "/dashboard/admin/solicitudes", label: "Todas las Solicitudes", icon: Files, roles: ["admin", "gestor"] },
  { href: "/dashboard/admin/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/dashboard/admin/reportes", label: "Reportes", icon: BarChart3, roles: ["admin"] },
  { href: "/dashboard/admin/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
  { href: "/dashboard/perfil", label: "Perfil", icon: UserCircle, roles: ["admin", "gestor", "asociado"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const userRole = user?.rol || "asociado";
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const rolBadge = userRole === "admin"
    ? { label: "Admin", class: "bg-purple-100 text-purple-700" }
    : userRole === "gestor"
    ? { label: "Gestor", class: "bg-blue-100 text-blue-700" }
    : { label: "Asociado", class: "bg-green-100 text-green-700" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <div className="flex h-screen overflow-hidden">
        <aside
          className={`bg-white border-r border-gray-200/80 flex flex-col transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-[68px]"
          }`}
        >
          <div className="gradient-primary p-4 flex items-center gap-3 min-h-[64px]">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="text-white font-bold text-sm leading-tight">IA-COOP</h1>
                <p className="text-white/70 text-[10px] leading-tight">Precalificador</p>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  title={sidebarOpen ? undefined : item.label}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                  {sidebarOpen && (
                    <span className="text-sm truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-100 p-3 space-y-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/80 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.nombre || "Usuario"}</p>
                <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${rolBadge.class}`}>
                  {rolBadge.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
