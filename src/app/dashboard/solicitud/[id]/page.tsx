"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { RadarChart } from "@/components/radar/RadarChart";
import { RadarSimulation } from "@/components/radar/RadarSimulation";
import { Explanation } from "@/components/xai/Explanation";
import { useRadar } from "@/lib/hooks/useRadar";
import { useAuth } from "@/lib/hooks/useAuth";
import { USE_MOCK } from "@/lib/mock";
import { evaluateRadar, calcularPerfilExito, type RadarInput } from "@/lib/mock-evaluate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { databases, DB } from "@/lib/appwrite/client";
import { getSolicitud, getServiciosByUser, getIngresosByUser, getCuestionarioByUser } from "@/lib/appwrite/db";
import type { Evaluacion, Solicitud, ServicioPublico, IngresoDigital, CuestionarioSocioConductual } from "@/lib/types";
import {
  MessageSquare, DollarSign, Brain, Receipt, Link2,
  CheckCircle, XCircle, ArrowLeft, Sparkles,
} from "lucide-react";

const FUENTES_LABEL: Record<string, string> = {
  empleado: "Empleado formal", independiente: "Independiente / Freelance",
  plataforma: "Plataforma digital", emprendedor: "Emprendedor",
  pensionado: "Pensionado", otro: "Otro",
};

const DESTINOS_LABEL: Record<string, string> = {
  emprendimiento: "Emprendimiento", vivienda: "Mejora de vivienda",
  educacion: "Educación", vehiculo: "Vehículo",
  deudas: "Consolidación de deudas", otro: "Otro",
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  precalificado: "bg-blue-50 text-blue-700 border-blue-200",
  aprobado: "bg-green-50 text-green-700 border-green-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
};

const TIPO_SERVICIO_ICON: Record<string, string> = {
  agua: "💧", luz: "💡", gas: "🔥", internet: "🌐", telefono: "📞", tv: "📺",
};

export default function SolicitudDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const solicitudId = params.id as string;
  const realHook = useRadar(solicitudId);
  const [mockData, setMockData] = useState<Evaluacion | null>(null);
  const [mockLoading, setMockLoading] = useState(true);
  const [tab, setTab] = useState<"evaluacion" | "simulacion">("evaluacion");
  const [successProfile, setSuccessProfile] = useState<RadarInput | null>(null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [actionType, setActionType] = useState<"aprobar" | "rechazar" | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionMontoAprobado, setActionMontoAprobado] = useState(0);
  const [actionRazon, setActionRazon] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [servicios, setServicios] = useState<ServicioPublico[]>([]);
  const [ingresos, setIngresos] = useState<IngresoDigital[]>([]);
  const [cuestionario, setCuestionario] = useState<CuestionarioSocioConductual | null>(null);
  const isAdmin = user?.rol === "admin" || user?.rol === "gestor";

  const PERFIL_BADGE: Record<string, string> = {
    lider: "bg-emerald-100 text-emerald-700",
    comprometido: "bg-blue-100 text-blue-700",
    participativo: "bg-amber-100 text-amber-700",
    basico: "bg-gray-100 text-gray-700",
    observador: "bg-slate-100 text-slate-700",
  };

  useEffect(() => {
    async function loadSolicitud() {
      try {
        if (USE_MOCK) {
          const stored = localStorage.getItem("ia-coop-mock-solicitudes");
          const list: Solicitud[] = stored ? JSON.parse(stored) : [];
          const sol = list.find((s) => s.$id === solicitudId) || null;
          setSolicitud(sol);
          if (sol) {
            setActionMontoAprobado(sol.montoSolicitado);
            const svcs = (sol.metadata as any)?.serviciosPublicos || [];
            const pals = (sol.metadata as any)?.ingresosPalenca || [];
            setServicios(svcs);
            setIngresos(pals);
          }
        } else {
          const sol = await getSolicitud(solicitudId);
          setSolicitud(sol);
          if (sol) setActionMontoAprobado(sol.montoSolicitado);
          if (sol?.asociadoId) {
            getServiciosByUser(sol.asociadoId).then(setServicios).catch(() => {});
            getIngresosByUser(sol.asociadoId).then(setIngresos).catch(() => {});
            getCuestionarioByUser(sol.asociadoId).then(setCuestionario).catch(() => {});
          }
        }
      } catch {}
    }
    loadSolicitud();
  }, [solicitudId]);

  const loadMock = useCallback(() => {
    if (!USE_MOCK) return;
    const stored = localStorage.getItem("ia-coop-mock-evaluaciones");
    const evals: Evaluacion[] = stored ? JSON.parse(stored) : [];
    const found = evals.find((e) => e.solicitudId === solicitudId);
    setMockData(found || null);
    setMockLoading(false);
    setSuccessProfile(calcularPerfilExito());
  }, [solicitudId]);

  useEffect(() => { loadMock(); }, [loadMock]);

  const data = USE_MOCK ? mockData : realHook.data;
  const loading = USE_MOCK ? mockLoading : realHook.loading;
  const radarData = USE_MOCK
    ? data ? {
        consistenciaIngresos: data.consistenciaIngresos,
        responsabilidadPagos: data.responsabilidadPagos,
        compromisoCooperativo: data.compromisoCooperativo,
        perfilEndeudamiento: data.perfilEndeudamiento,
        capacidadAhorro: data.capacidadAhorro,
      } : null
    : realHook.radarData;
  const isFavorable = USE_MOCK
    ? data?.decision === "precalificado" || data?.decision === "aprobado"
    : realHook.isFavorable;

  const meta = solicitud?.metadata as Record<string, any> | undefined;

  const handleSimulate = async (changes: Record<string, number>) => {
    await new Promise((r) => setTimeout(r, 600));
    if (!data) throw new Error("No hay datos de evaluación");
    const merged = {
      consistenciaIngresos: changes.consistenciaIngresos ?? data.consistenciaIngresos,
      responsabilidadPagos: changes.responsabilidadPagos ?? data.responsabilidadPagos,
      compromisoCooperativo: changes.compromisoCooperativo ?? data.compromisoCooperativo,
      perfilEndeudamiento: changes.perfilEndeudamiento ?? data.perfilEndeudamiento,
      capacidadAhorro: changes.capacidadAhorro ?? data.capacidadAhorro,
    };
    const evalResult = evaluateRadar(merged, data.montoRecomendado || 5000000);
    return { ...merged, ...evalResult };
  };

  const confirmAction = async () => {
    if (!solicitud) return;
    setActionLoading(true);
    const nuevoEstado = actionType === "aprobar" ? "aprobado" : "rechazado";
    try {
      if (USE_MOCK) {
        const stored = localStorage.getItem("ia-coop-mock-solicitudes");
        const lista: Solicitud[] = stored ? JSON.parse(stored) : [];
        const idx = lista.findIndex((s) => s.$id === solicitudId);
        if (idx >= 0) {
          lista[idx] = {
            ...lista[idx],
            estado: nuevoEstado as any,
            metadata: {
              ...(typeof lista[idx].metadata === "object" ? lista[idx].metadata : {}),
              mensajeAdmin: actionMessage,
              montoAprobado: actionType === "aprobar" ? actionMontoAprobado : 0,
              decisionAdmin: nuevoEstado,
              razonderespuesta: actionRazon,
              fechaDecision: new Date().toISOString(),
            },
          };
          localStorage.setItem("ia-coop-mock-solicitudes", JSON.stringify(lista));
          setSolicitud(lista[idx]);
        }
      } else {
        await databases.updateDocument(DB.id, DB.collections.SOLICITUDES, solicitudId, {
          estado: nuevoEstado,
          mensajeAdmin: actionMessage,
          montoAprobado: actionType === "aprobar" ? actionMontoAprobado : 0,
          decisionAdmin: nuevoEstado,
          razonderespuesta: actionRazon,
          fechaDecision: new Date().toISOString(),
        });
        setSolicitud((prev) => prev ? { ...prev, estado: nuevoEstado as any } : prev);
      }
      setActionType(null);
      setActionMessage("");
      setActionRazon("");
    } catch (err) {
      console.error("Error al actualizar solicitud:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-bold">Detalle de Solicitud</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Cargando...</CardTitle></CardHeader><CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" />
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Radar</CardTitle></CardHeader><CardContent><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return <div className="text-center py-12 text-gray-500">No se encontró la solicitud</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Detalle de Solicitud</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">#{solicitudId.slice(0, 8)}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${ESTADO_STYLES[solicitud?.estado || "pendiente"]}`}>
          {solicitud?.estado}
        </span>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setTab("evaluacion")}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${tab === "evaluacion" ? "border-blue-600 text-blue-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >Evaluación</button>
        <button onClick={() => setTab("simulacion")}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${tab === "simulacion" ? "border-blue-600 text-blue-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >Simulador Radar</button>
      </div>

      {tab === "evaluacion" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Información de la Solicitud */}
            <Card>
              <CardHeader><CardTitle className="text-base">Información de la Solicitud</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><span className="text-gray-400">Monto solicitado</span><p className="font-semibold">${solicitud?.montoSolicitado.toLocaleString()}</p></div>
                <div><span className="text-gray-400">Plazo</span><p className="font-semibold">{solicitud?.plazoMeses} meses</p></div>
                <div><span className="text-gray-400">Destino</span><p className="font-semibold capitalize">{DESTINOS_LABEL[solicitud?.destino || ""] || solicitud?.destino}</p></div>
                <div><span className="text-gray-400">Fecha</span><p className="font-semibold">{solicitud?.fechaSolicitud ? new Date(solicitud.fechaSolicitud).toLocaleDateString("es-CO") : "-"}</p></div>
              </CardContent>
            </Card>

            {/* Información del Asociado */}
            {meta && (
              <Card>
                <CardHeader><CardTitle className="text-base">Información del Asociado</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div><span className="text-gray-400">Fuente de ingreso</span><p className="font-semibold">{FUENTES_LABEL[meta.fuenteIngreso] || meta.fuenteIngreso}</p></div>
                  <div><span className="text-gray-400">Ingreso mensual</span><p className="font-semibold">${meta.ingresoMensual?.toLocaleString()}</p></div>
                  <div><span className="text-gray-400">Gastos fijos</span><p className="font-semibold">${meta.gastosFijos?.toLocaleString()}</p></div>
                  <div><span className="text-gray-400">Personas a cargo</span><p className="font-semibold">{meta.personasACargo ?? 0}</p></div>
                  <div><span className="text-gray-400">Tiene deudas</span><p className="font-semibold">{meta.tieneOtrasDeudas ? "Sí" : "No"}</p></div>
                  {meta.tieneOtrasDeudas && <div><span className="text-gray-400">Monto deudas</span><p className="font-semibold">${meta.montoDeudas?.toLocaleString()}</p></div>}
                  <div><span className="text-gray-400">Ahorra mensualmente</span><p className="font-semibold">{meta.ahorraMensualmente ? "Sí" : "No"}</p></div>
                  {meta.ahorraMensualmente && <div><span className="text-gray-400">Monto ahorro</span><p className="font-semibold">${meta.montoAhorro?.toLocaleString()}</p></div>}
                  <div><span className="text-gray-400">Antigüedad</span><p className="font-semibold">{meta.antiguedadMeses ?? 0} meses</p></div>
                  <div><span className="text-gray-400">Asambleas asistidas</span><p className="font-semibold">{meta.participacionAsambleas ?? 0}</p></div>
                </CardContent>
              </Card>
            )}

            {/* Ingresos Digitales */}
            {ingresos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-indigo-500" /> Ingresos Digitales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ingresos.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                      <span className="text-sm font-medium capitalize text-indigo-700">{ing.plataforma}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-indigo-700">${ing.promedioMensual?.toLocaleString()}/mes</p>
                        <p className="text-xs text-indigo-400">{ing.mesesActivo} meses activo</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Servicios Públicos */}
            {servicios.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-500" /> Servicios Públicos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {servicios.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{TIPO_SERVICIO_ICON[s.tipo] || "📋"}</span>
                        <div>
                          <p className="text-sm font-medium text-emerald-700">{s.contrato}</p>
                          <p className="text-xs text-emerald-500">{s.mesFactura}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-700">${s.montoPagado?.toLocaleString()}</p>
                        <p className={`text-xs ${s.pagoCompleto ? "text-green-600" : "text-amber-600"}`}>
                          {s.pagoCompleto ? "Pagado completo" : "Pendiente"}
                          {s.fechaPago && ` · ${s.fechaPago}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Reporte Ético Cooperativo */}
            {cuestionario && (
              <Card className="border-purple-100">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" /> Perfil Ético Cooperativo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${PERFIL_BADGE[cuestionario.perfil] || "bg-gray-100 text-gray-700"}`}>
                      {cuestionario.perfil === "lider" ? "Líder Cooperativo" :
                       cuestionario.perfil === "comprometido" ? "Comprometido" :
                       cuestionario.perfil === "participativo" ? "Participativo" :
                       cuestionario.perfil === "basico" ? "Básico" : "Observador"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {Math.round((cuestionario.puntajeTotal / 50) * 100)}% afinidad
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{cuestionario.interpretacion}</p>
                </CardContent>
              </Card>
            )}

            {/* Decisión del Admin/Gestor */}
            {solicitud && (solicitud as any).mensajeAdmin && (
              <Card className="border-amber-100">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-500" />
                    Decisión de la Cooperativa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(solicitud as any).montoAprobado > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-green-600 font-medium">Monto Aprobado</p>
                        <p className="text-lg font-bold text-green-700">${(solicitud as any).montoAprobado.toLocaleString()}</p>
                        {(solicitud as any).montoAprobado < solicitud.montoSolicitado && (
                          <p className="text-xs text-amber-600">(Solicitó ${solicitud.montoSolicitado.toLocaleString()})</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{(solicitud as any).mensajeAdmin}</p>
                  </div>
                  {(solicitud as any).razonderespuesta && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-400 mb-1">Razón</p>
                      <p className="text-sm text-amber-700">{(solicitud as any).razonderespuesta}</p>
                    </div>
                  )}
                  {(solicitud as any).fechaDecision && (
                    <p className="text-xs text-gray-400">
                      Decisión tomada: {new Date((solicitud as any).fechaDecision).toLocaleString("es-CO")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Acciones Admin/Gestor */}
            {isAdmin && solicitud?.estado !== "aprobado" && solicitud?.estado !== "rechazado" && (
              <Card className="border-indigo-100">
                <CardHeader>
                  <CardTitle className="text-base">Tomar Decisión</CardTitle>
                  <CardDescription>Revisa la información y el análisis de la IA antes de decidir</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button
                    className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    onClick={() => setActionType("aprobar")}
                  >
                    <CheckCircle className="h-4 w-4" /> Aprobar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => setActionType("rechazar")}
                  >
                    <XCircle className="h-4 w-4" /> Rechazar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {radarData && (
              <RadarChart
                data={radarData}
                comparisonData={(data as any)?.radarIdeal || successProfile || undefined}
                title="Radar Decisorio"
                height={400}
              />
            )}
            {(data as any)?.radarIdeal ? (
              <p className="text-xs text-gray-400 text-center -mt-4">
                <span className="text-blue-600">Azul:</span> Perfil actual · <span className="text-green-600">Verde:</span> Perfil ideal IA
              </p>
            ) : successProfile ? (
              <p className="text-xs text-gray-400 text-center -mt-4">
                El área verde muestra el perfil promedio de solicitudes exitosas
              </p>
            ) : null}

            {/* Análisis de la IA */}
            {data ? (
            <Card className="border-purple-100">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" /> Análisis de la IA
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                    <p className="text-xs text-purple-500 mb-0.5">Decisión IA</p>
                    <p className="font-bold text-sm capitalize text-purple-700">{data.decision}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                    <p className="text-xs text-purple-500 mb-0.5">Score Perfil</p>
                    <p className="font-bold text-sm text-purple-700">{(data as any)?.scorePerfil ?? data.puntajeRiesgo}%</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                    <p className="text-xs text-purple-500 mb-0.5">Riesgo</p>
                    <p className="font-bold text-sm text-purple-700">{data.puntajeRiesgo}%</p>
                  </div>
                </div>

                {(data as any)?.fortalezas && (data as any).fortalezas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fortalezas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(data as any).fortalezas.map((f: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Explanation
                  decision={data.decision}
                  explicacion={data.explicacionResumen || "Sin explicación disponible"}
                  recomendaciones={data.recomendaciones}
                  montoRecomendado={data.montoRecomendado}
                />
              </CardContent>
            </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Evaluación pendiente</p>
                  <p className="text-xs text-gray-400 mt-1">El análisis de la IA estará disponible pronto</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "simulacion" && radarData && (
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-gray-500 mb-4">
            Ajusta los sliders para simular cómo cambios en tu perfil afectarían la evaluación crediticia.
          </p>
          <RadarSimulation currentData={radarData} onSimulate={handleSimulate} />
        </div>
      )}

      {/* Dialog Aprobar/Rechazar */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === "aprobar" ? "Aprobar solicitud" : "Rechazar solicitud"}</DialogTitle>
            <DialogDescription>
              {actionType === "aprobar" ? "Define el monto aprobado y envía un mensaje al asociado." : "Indica al asociado las razones del rechazo."}
            </DialogDescription>
          </DialogHeader>
          {solicitud && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                <p><strong>Monto solicitado:</strong> ${solicitud.montoSolicitado.toLocaleString()}</p>
                <p><strong>Plazo:</strong> {solicitud.plazoMeses} meses</p>
                <p><strong>Destino:</strong> {DESTINOS_LABEL[solicitud.destino] || solicitud.destino}</p>
              </div>

              {actionType === "aprobar" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Monto aprobado (COP)</label>
                  <input type="number" value={actionMontoAprobado}
                    onChange={(e) => setActionMontoAprobado(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    min={0} max={solicitud.montoSolicitado}
                  />
                  {actionMontoAprobado < solicitud.montoSolicitado && (
                    <p className="text-xs text-amber-600 mt-1">Monto menor al solicitado. Explica la razón abajo.</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {actionType === "aprobar" ? "Mensaje para el asociado" : "Razón del rechazo"}
                </label>
                <textarea value={actionMessage} onChange={(e) => setActionMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  rows={3}
                  placeholder={actionType === "aprobar" ? "Ej: Felicidades, su solicitud ha sido aprobada..." : "Ej: Su solicitud no pudo ser aprobada..."}
                />
              </div>

              {actionType === "aprobar" && actionMontoAprobado < solicitud.montoSolicitado && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Razón del monto reducido</label>
                  <textarea value={actionRazon} onChange={(e) => setActionRazon(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                    rows={3} placeholder="Explique por qué el monto aprobado es menor..."
                  />
                </div>
              )}

              {actionType === "rechazar" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Razón del rechazo</label>
                  <textarea value={actionRazon} onChange={(e) => setActionRazon(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                    rows={3} placeholder="Explique las razones del rechazo..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setActionType(null)}>Cancelar</Button>
                <Button
                  variant={actionType === "aprobar" ? "default" : "destructive"}
                  onClick={confirmAction}
                  disabled={actionLoading}
                  className={actionType === "aprobar" ? "gradient-primary" : ""}
                >
                  {actionLoading ? "Guardando..." : actionType === "aprobar" ? "Aprobar y Enviar" : "Rechazar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
