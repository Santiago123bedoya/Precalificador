"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RouteGuard } from "@/components/shared/RouteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { databases, DB } from "@/lib/appwrite/client";
import { USE_MOCK } from "@/lib/mock";
import type { Solicitud } from "@/lib/types";
import {
  CheckCircle, XCircle, Eye, Search, Filter,
  ArrowUpDown, FileText, Clock, TrendingUp, CheckCheck,
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<Solicitud | null>(null);
  const [actionType, setActionType] = useState<"aprobar" | "rechazar" | null>(null);

  const cargarSolicitudes = async () => {
    try {
      if (USE_MOCK) {
        const stored = localStorage.getItem(MOCK_SOLICITUDES_KEY);
        setSolicitudes(stored ? JSON.parse(stored) : []);
      } else {
        const result = await databases.listDocuments(DB.id, DB.collections.SOLICITUDES);
        setSolicitudes(result.documents as unknown as Solicitud[]);
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
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    const nuevoEstado = actionType === "aprobar" ? "aprobado" : "rechazado";
    if (USE_MOCK) {
      actualizarSolicitud(actionTarget.$id, { estado: nuevoEstado });
    } else {
      await databases.updateDocument(DB.id, DB.collections.SOLICITUDES, actionTarget.$id, { estado: nuevoEstado });
    }
    setActionTarget(null);
    setActionType(null);
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
                    return (
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
                            {s.estado === "precalificado" && (
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={!!actionTarget} onOpenChange={() => setActionTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "aprobar" ? "✅ Aprobar solicitud" : "❌ Rechazar solicitud"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "aprobar"
                  ? "¿Estás seguro de aprobar esta solicitud? El asociado recibirá una notificación con los detalles."
                  : "¿Estás seguro de rechazar esta solicitud? Se notificará al asociado con las razones."}
              </DialogDescription>
            </DialogHeader>
            {actionTarget && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                <p><strong>ID:</strong> #{actionTarget.$id.slice(0, 8)}</p>
                <p><strong>Monto:</strong> ${actionTarget.montoSolicitado.toLocaleString()}</p>
                <p><strong>Plazo:</strong> {actionTarget.plazoMeses} meses</p>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setActionTarget(null)}>Cancelar</Button>
              <Button
                variant={actionType === "aprobar" ? "default" : "destructive"}
                onClick={confirmAction}
                className={actionType === "aprobar" ? "gradient-primary" : ""}
              >
                {actionType === "aprobar" ? "✅ Aprobar" : "❌ Rechazar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}
