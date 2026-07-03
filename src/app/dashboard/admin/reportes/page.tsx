"use client";

import { useState, useEffect, useMemo } from "react";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { databases, DB } from "@/lib/appwrite/client";
import { USE_MOCK } from "@/lib/mock";
import { formatCOP } from "@/lib/utils/format";
import { DESTINOS_CREDITO } from "@/lib/utils/constants";
import type { Solicitud, Evaluacion } from "@/lib/types";
import {
  FileText, CheckCircle2, Clock, XCircle, TrendingUp,
  DollarSign, BarChart3, Users, Activity, Calendar,
} from "lucide-react";

const MOCK_SOLICITUDES_KEY = "ia-coop-mock-solicitudes";
const MOCK_EVALUACIONES_KEY = "ia-coop-mock-evaluaciones";

export default function AdminReportesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (USE_MOCK) {
          const solStore = localStorage.getItem(MOCK_SOLICITUDES_KEY);
          const evalStore = localStorage.getItem(MOCK_EVALUACIONES_KEY);
          setSolicitudes(solStore ? JSON.parse(solStore) : []);
          setEvaluaciones(evalStore ? JSON.parse(evalStore) : []);
        } else {
          const [solResult, evalResult] = await Promise.all([
            databases.listDocuments(DB.id, DB.collections.SOLICITUDES),
            databases.listDocuments(DB.id, DB.collections.EVALUACIONES),
          ]);
          const solDocs = solResult.documents.map((d: any) => {
            if (d.fechasolicitud && !d.fechaSolicitud) d.fechaSolicitud = d.fechasolicitud;
            return d;
          });
          setSolicitudes(solDocs as unknown as Solicitud[]);
          setEvaluaciones(evalResult.documents as unknown as Evaluacion[]);
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = solicitudes.length;
    const pendiente = solicitudes.filter((s) => s.estado === "pendiente").length;
    const precalificado = solicitudes.filter((s) => s.estado === "precalificado").length;
    const aprobado = solicitudes.filter((s) => s.estado === "aprobado").length;
    const rechazado = solicitudes.filter((s) => s.estado === "rechazado").length;

    const montoTotal = solicitudes.reduce((acc, s) => acc + (s.montoSolicitado || 0), 0);
    const montoPromedio = total > 0 ? montoTotal / total : 0;
    const montoAprobados = solicitudes
      .filter((s) => s.estado === "aprobado")
      .reduce((acc, s) => acc + (s.montoSolicitado || 0), 0);

    const tasaAprobacion = total > 0 ? ((aprobado / total) * 100).toFixed(1) : "0";
    const tasaRechazo = total > 0 ? ((rechazado / total) * 100).toFixed(1) : "0";

    const porDestino: Record<string, number> = {};
    solicitudes.forEach((s) => {
      const dest = s.destino || "sin especificar";
      porDestino[dest] = (porDestino[dest] || 0) + 1;
    });

    const porMes: Record<string, { total: number; aprobados: number; rechazados: number }> = {};
    solicitudes.forEach((s) => {
      const date = new Date(s.fechaSolicitud);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!porMes[key]) porMes[key] = { total: 0, aprobados: 0, rechazados: 0 };
      porMes[key].total++;
      if (s.estado === "aprobado") porMes[key].aprobados++;
      if (s.estado === "rechazado") porMes[key].rechazados++;
    });

    const radarPromedio = { consistenciaIngresos: 0, responsabilidadPagos: 0, compromisoCooperativo: 0, perfilEndeudamiento: 0, capacidadAhorro: 0 };
    if (evaluaciones.length > 0) {
      evaluaciones.forEach((e) => {
        radarPromedio.consistenciaIngresos += e.consistenciaIngresos || 0;
        radarPromedio.responsabilidadPagos += e.responsabilidadPagos || 0;
        radarPromedio.compromisoCooperativo += e.compromisoCooperativo || 0;
        radarPromedio.perfilEndeudamiento += e.perfilEndeudamiento || 0;
        radarPromedio.capacidadAhorro += e.capacidadAhorro || 0;
      });
      const n = evaluaciones.length;
      Object.keys(radarPromedio).forEach((k) => {
        (radarPromedio as any)[k] = Math.round((radarPromedio as any)[k] / n);
      });
    }

    const montoRecomendadoPromedio =
      evaluaciones.length > 0
        ? evaluaciones.reduce((acc, e) => acc + (e.montoRecomendado || 0), 0) / evaluaciones.length
        : 0;

    return {
      total, pendiente, precalificado, aprobado, rechazado,
      montoTotal, montoPromedio, montoAprobados,
      tasaAprobacion, tasaRechazo,
      porDestino, porMes, radarPromedio, montoRecomendadoPromedio,
      totalEvaluaciones: evaluaciones.length,
    };
  }, [solicitudes, evaluaciones]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Generando reportes...</p>
        </div>
      </div>
    );
  }

  const destLabels: Record<string, string> = {};
  DESTINOS_CREDITO.forEach((d) => { destLabels[d.value] = d.label; });

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Reportes de Auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas y análisis del sistema crediticio</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Solicitudes", value: stats.total, icon: FileText, color: "text-indigo-600 bg-indigo-50" },
            { label: "Aprobadas", value: stats.aprobado, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
            { label: "Precalificadas", value: stats.precalificado, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
            { label: "Rechazadas", value: stats.rechazado, icon: XCircle, color: "text-red-600 bg-red-50" },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                      <p className="text-xs text-gray-500">{c.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatCOP(stats.montoTotal)}</p>
                  <p className="text-xs text-gray-500">Monto total solicitado</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatCOP(stats.montoPromedio)}</p>
                  <p className="text-xs text-gray-500">Monto promedio por solicitud</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatCOP(stats.montoAprobados)}</p>
                  <p className="text-xs text-gray-500">Monto total aprobado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{stats.tasaAprobacion}%</p>
                  <p className="text-xs text-gray-500">Tasa de aprobación</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{stats.tasaRechazo}%</p>
                  <p className="text-xs text-gray-500">Tasa de rechazo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📋 Solicitudes por Destino</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.porDestino).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.porDestino)
                    .sort(([, a], [, b]) => b - a)
                    .map(([dest, count]) => (
                      <div key={dest} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{destLabels[dest] || dest}</span>
                          <span className="font-medium text-gray-900">{count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">📅 Evolución Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.porMes).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.porMes)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(-6)
                    .map(([mes, data]) => (
                      <div key={mes} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16 shrink-0">
                          {new Date(mes + "-01").toLocaleDateString("es-CO", { month: "short", year: "2-digit" })}
                        </span>
                        <div className="flex-1 flex gap-1 h-5">
                          {data.aprobados > 0 && (
                            <div className="bg-green-500 rounded-l-full" style={{ width: `${(data.aprobados / data.total) * 100}%` }} />
                          )}
                          {data.total - data.aprobados - data.rechazados > 0 && (
                            <div className="bg-blue-400" style={{ width: `${((data.total - data.aprobados - data.rechazados) / data.total) * 100}%` }} />
                          )}
                          {data.rechazados > 0 && (
                            <div className="bg-red-500 rounded-r-full" style={{ width: `${(data.rechazados / data.total) * 100}%` }} />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-8 text-right">{data.total}</span>
                      </div>
                    ))}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Aprobados</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Otros</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Rechazados</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {stats.totalEvaluaciones > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🎯 Perfil Promedio de Evaluaciones ({stats.totalEvaluaciones} eval)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { label: "Consistencia Ingresos", value: stats.radarPromedio.consistenciaIngresos, color: "bg-indigo-500" },
                  { label: "Responsabilidad Pagos", value: stats.radarPromedio.responsabilidadPagos, color: "bg-green-500" },
                  { label: "Compromiso Cooperativo", value: stats.radarPromedio.compromisoCooperativo, color: "bg-blue-500" },
                  { label: "Perfil Endeudamiento", value: stats.radarPromedio.perfilEndeudamiento, color: "bg-amber-500" },
                  { label: "Capacidad Ahorro", value: stats.radarPromedio.capacidadAhorro, color: "bg-purple-500" },
                ].map((dim) => (
                  <div key={dim.label} className="text-center space-y-2">
                    <p className="text-xs text-gray-500">{dim.label}</p>
                    <div className="relative w-16 h-16 mx-auto">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-100" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className={dim.color} stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${dim.value}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">{dim.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">Monto recomendado promedio</span>
                <span className="font-semibold text-gray-900">{formatCOP(stats.montoRecomendadoPromedio)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
