"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { USE_MOCK } from "@/lib/mock";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Shield,
  Target,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const isAdmin = user?.rol === "admin";
  const isGestor = user?.rol === "admin" || user?.rol === "gestor";
  const isAsociado = user?.rol === "asociado" || (!isAdmin && !isGestor);

  const [stats, setStats] = useState({
    total: 0,
    pendiente: 0,
    precalificado: 0,
    aprobado: 0,
    rechazado: 0,
  });

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      if (USE_MOCK) {
        const stored = localStorage.getItem("ia-coop-mock-solicitudes");
        if (!stored) return;
        const list: any[] = JSON.parse(stored);
        const filtered = isAsociado
          ? list.filter((s) => s.asociadoId === user?.$id)
          : list;
        setStats({
          total: filtered.length,
          pendiente: filtered.filter((s) => s.estado === "pendiente").length,
          precalificado: filtered.filter((s) => s.estado === "precalificado").length,
          aprobado: filtered.filter((s) => s.estado === "aprobado").length,
          rechazado: filtered.filter((s) => s.estado === "rechazado").length,
        });
        return;
      }

      try {
        let list: any[];
        if (isAsociado && user?.$id) {
          const res = await fetch(`/api/solicitudes?asociadoId=${user.$id}`);
          const data = await res.json();
          list = data.documents || [];
        } else {
          const { databases, DB } = await import("@/lib/appwrite/client");
          const result = await databases.listDocuments(DB.id, DB.collections.SOLICITUDES);
          list = result.documents;
        }
        setStats({
          total: list.length,
          pendiente: list.filter((s) => s.estado === "pendiente").length,
          precalificado: list.filter((s) => s.estado === "precalificado").length,
          aprobado: list.filter((s) => s.estado === "aprobado").length,
          rechazado: list.filter((s) => s.estado === "rechazado").length,
        });
      } catch (err) {
        console.error("Error cargando stats:", err);
      }
    }

    loadStats();
  }, [user, isAsociado]);

  const statCards = [
    { label: "Total Solicitudes", value: stats.total, icon: FileText, color: "text-indigo-600 bg-indigo-50" },
    { label: "Pendientes", value: stats.pendiente, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Precalificados", value: stats.precalificado, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
    { label: "Aprobados", value: stats.aprobado, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
    { label: "Rechazados", value: stats.rechazado, icon: XCircle, color: "text-red-600 bg-red-50" },
  ];

  const quickActions = [];

  if (isAsociado) {
    quickActions.push(
      { href: "/dashboard/solicitud/nueva", label: "Nueva Solicitud", icon: FileText, desc: "Solicita tu crédito" },
      { href: "/dashboard/perfil", label: "Mi Perfil", icon: Shield, desc: "Revisa tu radar crediticio" },
    );
  }
  if (isAdmin || isGestor) {
    quickActions.push(
      { href: "/dashboard/admin/solicitudes", label: "Gestionar Solicitudes", icon: Target, desc: "Revisa y aprueba" },
      { href: "/dashboard/admin/reportes", label: "Ver Reportes", icon: TrendingUp, desc: "Analiza métricas" },
    );
  }

  return (
    <div className="space-y-6">
      <div className="gradient-primary rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-medium text-white/80">Bienvenido</span>
            </div>
            <h1 className="text-2xl font-bold">{user?.nombre || "Usuario"}</h1>
            <p className="text-white/70 mt-1 max-w-xl">
              {isAdmin
                ? "Administra las solicitudes, usuarios y configuración del sistema."
                : isGestor
                ? "Gestiona y evalúa las solicitudes de crédito de los asociados."
                : "Solicita tu crédito y monitorea tu perfil crediticio en tiempo real."}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 card-hover hover:shadow-card">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de solicitudes</h2>
          {stats.total > 0 ? (
            <div className="space-y-4">
              {[
                { label: "Aprobados", value: stats.aprobado, color: "bg-green-500" },
                { label: "Precalificados", value: stats.precalificado, color: "bg-blue-500" },
                { label: "Pendientes", value: stats.pendiente, color: "bg-amber-500" },
                { label: "Rechazados", value: stats.rechazado, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">{item.value}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No hay solicitudes aún</p>
              <Link
                href="/dashboard/solicitud/nueva"
                className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Crear primera solicitud <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
