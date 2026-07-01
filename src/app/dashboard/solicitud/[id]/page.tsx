"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { RadarChart } from "@/components/radar/RadarChart";
import { RadarSimulation } from "@/components/radar/RadarSimulation";
import { Explanation } from "@/components/xai/Explanation";
import { useRadar } from "@/lib/hooks/useRadar";
import { USE_MOCK } from "@/lib/mock";
import { evaluateRadar, calcularPerfilExito, type RadarInput } from "@/lib/mock-evaluate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Evaluacion } from "@/lib/types";

const MOCK_EVALUACIONES_KEY = "ia-coop-mock-evaluaciones";

export default function SolicitudDetailPage() {
  const params = useParams();
  const solicitudId = params.id as string;
  const realHook = useRadar(solicitudId);
  const [mockData, setMockData] = useState<Evaluacion | null>(null);
  const [mockLoading, setMockLoading] = useState(true);
  const [tab, setTab] = useState<"evaluacion" | "simulacion">("evaluacion");
  const [successProfile, setSuccessProfile] = useState<RadarInput | null>(null);

  const loadMock = useCallback(() => {
    if (!USE_MOCK) return;
    const stored = localStorage.getItem(MOCK_EVALUACIONES_KEY);
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
    ? data
      ? {
          consistenciaIngresos: data.consistenciaIngresos,
          responsabilidadPagos: data.responsabilidadPagos,
          compromisoCooperativo: data.compromisoCooperativo,
          perfilEndeudamiento: data.perfilEndeudamiento,
          capacidadAhorro: data.capacidadAhorro,
        }
      : null
    : realHook.radarData;
  const isFavorable = USE_MOCK
    ? data?.decision === "precalificado" || data?.decision === "aprobado"
    : realHook.isFavorable;

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

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Detalle de Solicitud</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Cargando...</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Radar</CardTitle></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">No se encontró la solicitud</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Detalle de Solicitud</h1>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab("evaluacion")}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "evaluacion"
              ? "border-blue-600 text-blue-600 font-medium"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >Evaluación</button>
        <button
          onClick={() => setTab("simulacion")}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
            tab === "simulacion"
              ? "border-blue-600 text-blue-600 font-medium"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >Simulador Radar</button>
      </div>

      {tab === "evaluacion" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Información</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Estado:</strong>{" "}
                  <span className={`font-semibold ${isFavorable ? "text-green-600" : "text-red-600"}`}>
                    {data.decision || "Pendiente"}
                  </span>
                </p>
                <p><strong>Monto recomendado:</strong>{" "}
                  <span className="font-semibold">${data.montoRecomendado?.toLocaleString() || "N/A"}</span>
                </p>
                <p><strong>Puntaje de riesgo:</strong>{" "}
                  <span className="font-semibold">{(data.puntajeRiesgo * 100).toFixed(0)}%</span>
                </p>
              </CardContent>
            </Card>
            <Explanation
              decision={data.decision}
              explicacion={data.explicacionResumen || "Sin explicación disponible"}
              recomendaciones={data.recomendaciones}
              montoRecomendado={data.montoRecomendado}
            />
          </div>
          <div className="space-y-6">
            {radarData && (
              <RadarChart
                data={radarData}
                comparisonData={successProfile || undefined}
                title="Radar Decisorio"
                height={400}
              />
            )}
            {successProfile && (
              <p className="text-xs text-gray-400 text-center -mt-4">
                El área verde muestra el perfil promedio de solicitudes exitosas
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "simulacion" && radarData && (
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-gray-500 mb-4">
            Ajusta los sliders para simular cómo cambios en tu perfil afectarían la evaluación crediticia.
            Al hacer clic en "Simular" verás cómo cambia tu puntaje de riesgo y la decisión.
          </p>
          <RadarSimulation currentData={radarData} onSimulate={handleSimulate} />
        </div>
      )}
    </div>
  );
}
