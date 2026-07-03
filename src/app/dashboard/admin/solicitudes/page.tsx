"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { databases, DB } from "@/lib/appwrite/client";
import { USE_MOCK } from "@/lib/mock";
import type { Solicitud, Evaluacion } from "@/lib/types";
import {
  CheckCircle, XCircle, Eye, Search, Filter,
  ArrowUpDown, FileText, Clock, TrendingUp, CheckCheck, Brain,
} from "lucide-react";

const MOCK_SOLICITUDES_KEY = "ia-coop-mock-solicitudes";

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  precalificado: "bg-blue-50 text-blue-700 border-blue-200",
  aprobado: "bg-green-50 text-green-700 border-green-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
};

const ESTADO_ICONS: Record<string, any> = {
  pendiente: Clock,
  precalificado: TrendingUp,
  aprobado: CheckCheck,
  rechazado: XCircle,
};

function actualizarSolicitud(id: string, cambios: Partial<Solicitud>) {
  const stored = localStorage.getItem(MOCK_SOLICITUDES_KEY);
  const lista: Solicitud[] = stored ? JSON.parse(stored) : [];
  const idx = lista.findIndex((s) => s.$id === id);
  if (idx >= 0) {
    lista[idx] = { ...lista[idx], ...cambios };
    localStorage.setItem(MOCK_SOLICITUDES_KEY, JSON.stringify(lista));
  }
}

export default function AdminSolicitudesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Record<string, Evaluacion>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<Solicitud | null>(null);
  const [actionType, setActionType] = useState<"aprobar" | "rechazar" | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionMontoAprobado, setActionMontoAprobado] = useState<number>(0);
  const [actionRazon, setActionRazon] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cargarSolicitudes = async () => {
    try {
      if (USE_MOCK) {
        const stored = localStorage.getItem(MOCK_SOLICITUDES_KEY);
        setSolicitudes(stored ? JSON.parse(stored) : []);
      } else {
        const result = await databases.listDocuments(DB.id, DB.collections.SOLICITUDES);
        const docs = result.documents.map((d: any) => {
          if (d.fechasolicitud && !d.fechaSolicitud) d.fechaSolicitud = d.fechasolicitud;
          return d;
        });
        setSolicitudes(docs as unknown as Solicitud[]);

        const evalResult = await databases.listDocuments(DB.id, DB.collections.EVALUACIONES);
        const evalMap: Record<string, Evaluacion> = {};
        for (const e of evalResult.documents) {
          const solId = (e as any).solicitudId;
          if (solId) {
            if (typeof (e as any).recomendaciones === "string") {
              try { (e as any).recomendaciones = JSON.parse((e as any).recomendaciones); } catch {}
            }
            evalMap[solId] = e as unknown as Evaluacion;
          }
        }
        setEvaluaciones(evalMap);
      }
    } catch (err) {
      console.error("Error al cargar solicitudes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarSolicitudes(); }, []);

  const filtered = solicitudes.filter((s) => {
    const matchSearch = s.$id.toLowerCase().includes(search.toLowerCase()) ||
      s.destino?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = !filterEstado || s.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const pendientesCount = solicitudes.filter((s) => s.estado === "pendiente").length;
  const precalificadoCount = solicitudes.filter((s) => s.estado === "precalificado").length;

  const handleAction = (solicitud: Solicitud, action: "aprobar" | "rechazar") => {
    setActionTarget(solicitud);
    setActionType(action);
    setActionMessage("");
    setActionMontoAprobado(solicitud.montoSolicitado);
    setActionRazon("");
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    const nuevoEstado = actionType === "aprobar" ? "aprobado" : "rechazado";
    if (USE_MOCK) {
      actualizarSolicitud(actionTarget.$id, { estado: nuevoEstado, metadata: { mensajeAdmin: actionMessage, montoAprobado: actionType === "aprobar" ? actionMontoAprobado : 0, decisionAdmin: nuevoEstado, razonderespuesta: actionRazon, fechaDecision: new Date().toISOString() } } as any);
    } else {
      await databases.updateDocument(DB.id, DB.collections.SOLICITUDES, actionTarget.$id, {
        estado: nuevoEstado,
        mensajeAdmin: actionMessage,
        montoAprobado: actionType === "aprobar" ? actionMontoAprobado : 0,
        decisionAdmin: nuevoEstado,
        razonderespuesta: actionRazon,
        fechaDecision: new Date().toISOString(),
      });
    }
    setActionTarget(null);
    setActionType(null);
    setActionMessage("");
    setActionMontoAprobado(0);
    await cargarSolicitudes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-gray-500">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard allowedRoles={["admin", "gestor"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
            <p className="text-sm text-gray-500 mt-1">
              {solicitudes.length} solicitudes registradas
              {pendientesCount > 0 && (
                <span className="text-amber-600 font-medium"> · {pendientesCount} pendientes</span>
              )}
              {precalificadoCount > 0 && (
                <span className="text-blue-600 font-medium"> · {precalificadoCount} por revisar</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ID o destino..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {["pendiente", "precalificado", "aprobado", "rechazado"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFilterEstado(filterEstado === estado ? null : estado)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  filterEstado === estado
                    ? `${ESTADO_STYLES[estado]} ring-2 ring-offset-1`
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {estado}
              </button>
            ))}
            {filterEstado && (
              <button
                onClick={() => setFilterEstado(null)}
                className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-soft">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron solicitudes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plazo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destino</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => {
                    const EstadoIcon = ESTADO_ICONS[s.estado] || FileText;
                    return <Fragment key={s.$id}>
                      <tr
                        key={s.$id}
                        className={`border-b border-gray-50 transition-colors hover:bg-indigo-50/30 cursor-pointer ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                        onClick={() => router.push(`/dashboard/solicitud/${s.$id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                            #{s.$id.slice(0, 6)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900">
                            ${s.montoSolicitado.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{s.plazoMeses} meses</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 capitalize">{s.destino}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_STYLES[s.estado] || ""}`}>
                            <EstadoIcon className="h-3 w-3" />
                            {s.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">
                            {new Date(s.fechaSolicitud).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Ver detalle"
                              className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                              onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/solicitud/${s.$id}`); }}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {evaluaciones[s.$id] && (s.estado === "pendiente" || s.estado === "precalificado") && (
                              <button
                                title="Ver recomendación IA"
                                className={`p-2 rounded-lg transition-colors ${expandedId === s.$id ? "bg-purple-50 text-purple-600" : "hover:bg-purple-50 text-gray-400 hover:text-purple-600"}`}
                                onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === s.$id ? null : s.$id); }}
                              >
                                <Brain className="h-4 w-4" />
                              </button>
                            )}
                            {(s.estado === "pendiente" || s.estado === "precalificado") && (
                              <>
                                <button
                                  title="Aprobar"
                                  className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleAction(s, "aprobar"); }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  title="Rechazar"
                                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleAction(s, "rechazar"); }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === s.$id && evaluaciones[s.$id] && (
                        <tr key={`${s.$id}-ia`} className="bg-purple-50/50 border-b border-purple-100">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Brain className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Recomendación de la IA</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                                    <p className="text-xs text-gray-500">Decisión IA</p>
                                    <p className="font-semibold text-sm capitalize">{evaluaciones[s.$id].decision}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                                    <p className="text-xs text-gray-500">Riesgo</p>
                                    <p className="font-semibold text-sm">{evaluaciones[s.$id].puntajeRiesgo}%</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                                    <p className="text-xs text-gray-500">Monto recomendado</p>
                                    <p className="font-semibold text-sm">${evaluaciones[s.$id].montoRecomendado?.toLocaleString()}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                                    <p className="text-xs text-gray-500">Monto solicitado</p>
                                    <p className="font-semibold text-sm">${s.montoSolicitado.toLocaleString()}</p>
                                  </div>
                                </div>
                                {evaluaciones[s.$id].explicacionResumen && (
                                  <p className="text-sm text-gray-700 bg-white rounded-lg p-2 border border-purple-100 mb-2">{evaluaciones[s.$id].explicacionResumen}</p>
                                )}
                                {evaluaciones[s.$id].recomendaciones && evaluaciones[s.$id].recomendaciones!.length > 0 && (
                                  <ul className="text-xs text-purple-700 space-y-1">
                                    {evaluaciones[s.$id].recomendaciones!.map((r, i) => (
                                      <li key={i}>• {r}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={!!actionTarget} onOpenChange={() => setActionTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionType === "aprobar" ? "Aprobar solicitud" : "Rechazar solicitud"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "aprobar"
                  ? "Define el monto aprobado y envía un mensaje al asociado."
                  : "Indica al asociado las razones del rechazo."}
              </DialogDescription>
            </DialogHeader>
            {actionTarget && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                  <p><strong>ID:</strong> #{actionTarget.$id.slice(0, 8)}</p>
                  <p><strong>Monto solicitado:</strong> ${actionTarget.montoSolicitado.toLocaleString()}</p>
                  <p><strong>Plazo:</strong> {actionTarget.plazoMeses} meses</p>
                  <p><strong>Destino:</strong> {actionTarget.destino}</p>
                </div>

                {actionType === "aprobar" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Monto aprobado (COP)</label>
                    <input
                      type="number"
                      value={actionMontoAprobado}
                      onChange={(e) => setActionMontoAprobado(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      min={0}
                      max={actionTarget.montoSolicitado}
                    />
                    {actionMontoAprobado < actionTarget.montoSolicitado && (
                      <p className="text-xs text-amber-600 mt-1">
                        Monto menor al solicitado. Explica la razón abajo.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {actionType === "aprobar" ? "Mensaje para el asociado" : "Razón del rechazo"}
                  </label>
                  <textarea
                    value={actionMessage}
                    onChange={(e) => setActionMessage(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    rows={3}
                    placeholder={
                      actionType === "aprobar"
                        ? "Ej: Felicidades, su solicitud ha sido aprobada..."
                        : "Ej: Su solicitud no pudo ser aprobada..."
                    }
                  />
                </div>

                {actionType === "aprobar" && actionMontoAprobado < actionTarget.montoSolicitado && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Razón del monto reducido</label>
                    <textarea
                      value={actionRazon}
                      onChange={(e) => setActionRazon(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                      rows={3}
                      placeholder="Explique por qué el monto aprobado es menor al solicitado..."
                    />
                  </div>
                )}

                {actionType === "rechazar" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Razón del rechazo</label>
                    <textarea
                      value={actionRazon}
                      onChange={(e) => setActionRazon(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                      rows={3}
                      placeholder="Explique las razones del rechazo..."
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setActionTarget(null)}>Cancelar</Button>
                  <Button
                    variant={actionType === "aprobar" ? "default" : "destructive"}
                    onClick={confirmAction}
                    className={actionType === "aprobar" ? "gradient-primary" : ""}
                  >
                    {actionType === "aprobar" ? "Aprobar y Enviar" : "Rechazar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}
