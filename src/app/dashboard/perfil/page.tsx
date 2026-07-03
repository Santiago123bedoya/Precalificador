"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart } from "@/components/radar/RadarChart";
import { useAuth } from "@/lib/hooks/useAuth";
import { USE_MOCK } from "@/lib/mock";
import { calcularPerfilExito, type RadarInput } from "@/lib/mock-evaluate";
import type { Evaluacion } from "@/lib/types";
import { UserCircle, Mail, Shield, Calendar, Award } from "lucide-react";

const MOCK_EVALUACIONES_KEY = "ia-coop-mock-evaluaciones";
const MOCK_SOLICITUDES_KEY = "ia-coop-mock-solicitudes";

export default function PerfilPage() {
  const { user } = useAuth();
  const [radarData, setRadarData] = useState<{
    consistenciaIngresos: number;
    responsabilidadPagos: number;
    compromisoCooperativo: number;
    perfilEndeudamiento: number;
    capacidadAhorro: number;
  } | null>(null);
  const [successProfile, setSuccessProfile] = useState<RadarInput | null>(null);

  useEffect(() => {
    if (!user) return;

    setSuccessProfile(calcularPerfilExito());

    if (USE_MOCK) {
      const solicitudes: { asociadoId: string; $id: string }[] = JSON.parse(
        localStorage.getItem(MOCK_SOLICITUDES_KEY) || "[]"
      );
      const userSolicitud = solicitudes.find((s) => s.asociadoId === user.$id);
      if (!userSolicitud) return;

      const evals: Evaluacion[] = JSON.parse(
        localStorage.getItem(MOCK_EVALUACIONES_KEY) || "[]"
      );
      const found = evals.find((e) => e.solicitudId === userSolicitud.$id);
      if (found) {
        setRadarData({
          consistenciaIngresos: found.consistenciaIngresos,
          responsabilidadPagos: found.responsabilidadPagos,
          compromisoCooperativo: found.compromisoCooperativo,
          perfilEndeudamiento: found.perfilEndeudamiento,
          capacidadAhorro: found.capacidadAhorro,
        });
      }
      return;
    }

    // Non-mock: load radar from user profile (saved during solicitud)
    if (user.consistenciaIngresos || user.responsabilidadPagos) {
      setRadarData({
        consistenciaIngresos: user.consistenciaIngresos || 50,
        responsabilidadPagos: user.responsabilidadPagos || 50,
        compromisoCooperativo: user.compromisoCooperativo || 50,
        perfilEndeudamiento: user.perfilEndeudamiento || 50,
        capacidadAhorro: user.capacidadAhorro || 50,
      });
    }
  }, [user]);

  const rolStyles: Record<string, { label: string; color: string; bg: string }> = {
    admin: { label: "Administrador", color: "text-purple-700", bg: "bg-purple-50" },
    gestor: { label: "Gestor de Crédito", color: "text-blue-700", bg: "bg-blue-50" },
    asociado: { label: "Asociado", color: "text-green-700", bg: "bg-green-50" },
  };
  const rolInfo = rolStyles[user?.rol || "asociado"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Información personal y radar crediticio</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center shadow-soft">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <UserCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user?.nombre || "Usuario"}</h2>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${rolInfo.bg} ${rolInfo.color}`}>
              {rolInfo.label}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-soft">
            <div className="flex items-center gap-3 p-4">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Shield className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Rol</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{user?.rol || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Miembro desde</p>
                <p className="text-sm font-medium text-gray-900">
                  {user?.fechaRegistro
                    ? new Date(user.fechaRegistro).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-soft">
            <div className="p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Award className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Radar Crediticio</h2>
                  <p className="text-sm text-gray-500">Las 5 dimensiones de tu perfil financiero</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {radarData ? (
                <div className="space-y-4">
                  <RadarChart
                    data={radarData}
                    comparisonData={successProfile || undefined}
                    title="Mi Perfil Crediticio"
                    height={380}
                  />
                  {successProfile && (
                    <p className="text-xs text-gray-400 text-center">
                      El área verde muestra el perfil promedio de los asociados con créditos exitosos
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Sin evaluaciones aún</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Completa una solicitud de crédito para ver tu radar crediticio
                  </p>
                </div>
              )}
            </div>
          </div>

          {radarData && (
            <div className="bg-gradient-primary rounded-xl p-6 text-white">
              <div className="flex items-start gap-4">
                <Award className="h-8 w-8 text-yellow-300 shrink-0" />
                <div>
                  <h3 className="font-semibold">¿Sabías que...?</h3>
                  <p className="text-sm text-white/80 mt-1">
                    Tu radar crediticio se actualiza con cada solicitud. 
                    Puedes usar el simulador para ver cómo mejorarías tu perfil 
                    ajustando tus hábitos financieros.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
