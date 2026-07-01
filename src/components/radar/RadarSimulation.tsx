"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadarChart } from "./RadarChart";
import { RADAR_LABELS } from "@/lib/utils/constants";

interface RadarData {
  consistenciaIngresos: number;
  responsabilidadPagos: number;
  compromisoCooperativo: number;
  perfilEndeudamiento: number;
  capacidadAhorro: number;
}

interface SimulationResult {
  puntajeRiesgo: number;
  decision: string;
  montoRecomendado: number;
  explicacionResumen: string;
  recomendaciones: string[];
}

interface RadarSimulationProps {
  currentData: RadarData;
  onSimulate: (changes: Partial<RadarData>) => Promise<RadarData & SimulationResult>;
}

const DIMENSION_KEYS = [
  { key: "consistenciaIngresos", label: RADAR_LABELS.consistenciaIngresos },
  { key: "responsabilidadPagos", label: RADAR_LABELS.responsabilidadPagos },
  { key: "compromisoCooperativo", label: RADAR_LABELS.compromisoCooperativo },
  { key: "perfilEndeudamiento", label: RADAR_LABELS.perfilEndeudamiento },
  { key: "capacidadAhorro", label: RADAR_LABELS.capacidadAhorro },
];

export function RadarSimulation({ currentData, onSimulate }: RadarSimulationProps) {
  const [simulatedData, setSimulatedData] = useState<RadarData>(currentData);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<(RadarData & SimulationResult) | null>(null);

  const handleSliderChange = (key: keyof RadarData, value: number[]) => {
    setSimulatedData((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const changes: Partial<RadarData> = {};
      for (const dim of DIMENSION_KEYS) {
        const key = dim.key as keyof RadarData;
        if (simulatedData[key] !== currentData[key]) {
          changes[key] = simulatedData[key];
        }
      }
      const resultData = await onSimulate(changes);
      setResult(resultData);
    } catch (error) {
      console.error("Error en simulación:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSimulatedData(currentData);
    setResult(null);
  };

  const isFavorable = result?.decision === "aprobado" || result?.decision === "precalificado";

  return (
    <div className="space-y-6">
      <RadarChart
        data={simulatedData}
        comparisonData={result || undefined}
        title="Simulador de Perfil"
        height={350}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">🎛️ Ajusta tu perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DIMENSION_KEYS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-gray-500">
                  {simulatedData[key as keyof RadarData]}/100
                </span>
              </div>
              <Slider
                value={[simulatedData[key as keyof RadarData]]}
                onValueChange={(value) =>
                  handleSliderChange(key as keyof RadarData, value)
                }
                max={100}
                step={1}
              />
            </div>
          ))}

          <div className="flex gap-4 pt-4">
            <Button onClick={handleSimulate} disabled={isLoading} className="flex-1">
              {isLoading ? "Simulando..." : "🔮 Simular"}
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className={`border-2 ${isFavorable ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">📈 Resultado de la simulación</h4>
              <Badge className={isFavorable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {result.decision}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded-lg p-3">
                <span className="text-gray-500">Puntaje de riesgo</span>
                <p className="text-xl font-bold">{(result.puntajeRiesgo * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <span className="text-gray-500">Monto recomendado</span>
                <p className="text-xl font-bold">${result.montoRecomendado.toLocaleString()}</p>
              </div>
            </div>

            <p className="text-sm text-gray-700">{result.explicacionResumen}</p>

            {result.recomendaciones.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Recomendaciones:</p>
                <ul className="space-y-1">
                  {result.recomendaciones.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="outline" className="mt-2" onClick={handleReset}>
              Volver al perfil actual
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
