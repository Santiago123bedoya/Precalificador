"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { databases, DB } from "@/lib/appwrite/client";
import { Query } from "appwrite";
import { USE_MOCK } from "@/lib/mock";
import { RadarChart } from "@/components/radar/RadarChart";
import { calcularPerfilExito } from "@/lib/mock-evaluate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Solicitud, Evaluacion } from "@/lib/types";
import {
  Eye, ArrowLeft, Clock, TrendingUp, CheckCircle2,
  XCircle, FileText, MessageSquare, DollarSign, Award,
} from "lucide-react";

const MOCK_SOLICITUDES_KEY = "ia-coop-mock-solicitudes";
const MOCK_EVALUACIONES_KEY = "ia-coop-mock-evaluaciones";

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  precalificado: "bg-blue-50 text-blue-700 border-blue-200",
  aprobado: "bg-green-50 text-green-700 border-green-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
};

const ESTADO_ICONS: Record<string, any> = {
  pendiente: Clock,
  precalificado: TrendingUp,
  aprobado: CheckCircle2,
  rechazado: XCircle,
};

export default function MisSolicitudesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.$id;
    async function load() {
      try {
        if (USE_MOCK) {
          const stored = localStorage.getItem(MOCK_SOLICITUDES_KEY);
          const list: Solicitud[] = stored ? JSON.parse(stored) : [];
          setSolicitudes(list.filter((s) => s.asociadoId === userId));
        } else {
          const res = await fetch(`/api/solicitudes?asociadoId=${userId}`);
          const data = await res.json();
          const docs = (data.documents || []).map((d: any) => {
            if (d.fechasolicitud && !d.fechaSolicitud) d.fechaSolicitud = d.fechasolicitud;
            return d;
          });
          setSolicitudes(docs as unknown as Solicitud[]);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  useEffect(() => {
    if (!selectedId) { setEvaluacion(null); setSelectedSolicitud(null); return; }
    async function loadDetail() {
      const sol = solicitudes.find((s) => s.$id === selectedId);
      setSelectedSolicitud(sol || null);
      try {
        if (USE_MOCK) {
          const stored = localStorage.getItem(MOCK_EVALUACIONES_KEY);
          const evals: Evaluacion[] = stored ? JSON.parse(stored) : [];
          setEvaluacion(evals.find((e) => e.solicitudId === selectedId) || null);
        } else {
          const result = await databases.listDocuments(
            DB.id,
            DB.collections.EVALUACIONES,
            [Query.equal("solicitudId", selectedId!)]
          );
          if (result.documents.length > 0) {
            const doc = result.documents[result.documents.length - 1] as any;
            if (typeof doc.recomendaciones === "string") {
              try { doc.recomendaciones = JSON.parse(doc.recomendaciones); } catch { doc.recomendaciones = []; }
            }
            setEvaluacion(doc as Evaluacion);
          } else {
            setEvaluacion(null);
          }
        }
      } catch { setEvaluacion(null); }
    }
    loadDetail();
  }, [selectedId, solicitudes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

    if (selectedId && selectedSolicitud) {
    const hasDecision = selectedSolicitud.estado === "aprobado" || selectedSolicitud.estado === "rechazado";
    const radarData = evaluacion ? {
      consistenciaIngresos: evaluacion.consistenciaIngresos,
      responsabilidadPagos: evaluacion.responsabilidadPagos,
      compromisoCooperativo: evaluacion.compromisoCooperativo,
      perfilEndeudamiento: evaluacion.perfilEndeudamiento,
      capacidadAhorro: evaluacion.capacidadAhorro,
    } : null;

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Volver a mis solicitudes
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalle de Solicitud</h1>
          <p className="text-sm text-gray-500">#{selectedSolicitud.$id.slice(0, 8)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Información</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Estado</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${ESTADO_STYLES[selectedSolicitud.estado] || ""}`}>
                    {selectedSolicitud.estado}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Monto solicitado</span>
                  <span className="font-semibold">${selectedSolicitud.montoSolicitado.toLocaleString()}</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Plazo</span>
                  <span>{selectedSolicitud.plazoMeses} meses</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Destino</span>
                  <span className="capitalize">{selectedSolicitud.destino}</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Fecha</span>
                  <span>{new Date(selectedSolicitud.fechaSolicitud).toLocaleDateString("es-CO")}</span>
                </div>
              </CardContent>
            </Card>

            {evaluacion && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" /> Análisis de la IA
                </CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Decisión IA</span>
                    <span className="font-semibold capitalize">{evaluacion.decision}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Puntaje de riesgo</span>
                    <span className="font-semibold">{evaluacion.puntajeRiesgo}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monto recomendado IA</span>
                    <span className="font-semibold">${evaluacion.montoRecomendado?.toLocaleString()}</span>
                  </div>
                  {evaluacion.explicacionResumen && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-2">
                      <p className="text-xs text-gray-400 mb-1">Explicación</p>
                      <p className="text-gray-700">{evaluacion.explicacionResumen}</p>
                    </div>
                  )}
                  {evaluacion.recomendaciones && evaluacion.recomendaciones.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-400 mb-1">Recomendaciones</p>
                      <ul className="space-y-1">
                        {evaluacion.recomendaciones.map((r, i) => (
                          <li key={i} className="text-sm text-blue-700">• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasDecision && (selectedSolicitud as any).mensajeAdmin && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Decisión de la Cooperativa
                </CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(selectedSolicitud as any).montoAprobado > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-green-600 font-medium">Monto Aprobado</p>
                        <p className="text-lg font-bold text-green-700">${(selectedSolicitud as any).montoAprobado.toLocaleString()}</p>
                        {(selectedSolicitud as any).montoAprobado < selectedSolicitud.montoSolicitado && (
                          <p className="text-xs text-amber-600">(Solicitó ${selectedSolicitud.montoSolicitado.toLocaleString()})</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Mensaje del gestor/administrador</p>
                    <p className="text-sm text-gray-700">{(selectedSolicitud as any).mensajeAdmin}</p>
                  </div>
                  {(selectedSolicitud as any).razonderespuesta && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-400 mb-1">Razón de la respuesta</p>
                      <p className="text-sm text-amber-700">{(selectedSolicitud as any).razonderespuesta}</p>
                    </div>
                  )}
                  {(selectedSolicitud as any).fechaDecision && (
                    <p className="text-xs text-gray-400">
                      Decisión tomada: {new Date((selectedSolicitud as any).fechaDecision).toLocaleString("es-CO")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {radarData && (
              <Card>
                <CardHeader><CardTitle className="text-base">Radar Decisorio</CardTitle></CardHeader>
                <CardContent>
                  <RadarChart
                    data={radarData}
                    comparisonData={(evaluacion as any)?.radarIdeal || calcularPerfilExito() || undefined}
                    title="Mi Perfil vs Perfil Ideal IA"
                    height={350}
                  />
                  {(evaluacion as any)?.radarIdeal ? (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      <span className="text-blue-600">Azul:</span> Tu perfil actual · <span className="text-green-600">Verde:</span> Perfil ideal recomendado por la IA
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      El área verde muestra el perfil promedio de solicitudes exitosas
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {!radarData && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">Esperando análisis de la IA...</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Solicitudes</h1>
        <p className="text-sm text-gray-500 mt-1">{solicitudes.length} solicitudes realizadas</p>
      </div>

      {solicitudes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tienes solicitudes aún</p>
            <Button className="mt-4 gradient-primary" onClick={() => router.push("/dashboard/solicitud/nueva")}>
              Crear mi primera solicitud
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plazo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Destino</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s, idx) => {
                  const Icon = ESTADO_ICONS[s.estado] || FileText;
                  return (
                    <tr key={s.$id} className={`border-b last:border-0 hover:bg-indigo-50/30 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">#{s.$id.slice(0, 6)}</td>
                      <td className="px-4 py-3 font-semibold">${s.montoSolicitado.toLocaleString()}</td>
                      <td className="px-4 py-3">{s.plazoMeses} meses</td>
                      <td className="px-4 py-3 capitalize">{s.destino}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_STYLES[s.estado] || ""}`}>
                          <Icon className="h-3 w-3" /> {s.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(s.fechaSolicitud).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setSelectedId(s.$id)}
                          className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
