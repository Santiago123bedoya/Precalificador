// src/components/radar/RadarChart.tsx
"use client";

import React from "react";
import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RADAR_LABELS } from "@/lib/utils/constants";

interface RadarData {
  consistenciaIngresos: number;
  responsabilidadPagos: number;
  compromisoCooperativo: number;
  perfilEndeudamiento: number;
  capacidadAhorro: number;
}

interface RadarChartProps {
  data: RadarData;
  comparisonData?: RadarData;
  title?: string;
  height?: number;
}

export function RadarChart({
  data,
  comparisonData,
  title = "Perfil Crediticio",
  height = 400,
}: RadarChartProps) {
  const dimensions = [
    { key: "consistenciaIngresos", label: RADAR_LABELS.consistenciaIngresos },
    { key: "responsabilidadPagos", label: RADAR_LABELS.responsabilidadPagos },
    { key: "compromisoCooperativo", label: RADAR_LABELS.compromisoCooperativo },
    { key: "perfilEndeudamiento", label: RADAR_LABELS.perfilEndeudamiento },
    { key: "capacidadAhorro", label: RADAR_LABELS.capacidadAhorro },
  ];

  // ✅ Los datos se transforman en un array de objetos con dimension + valores
  const chartData = dimensions.map(({ key, label }) => ({
    dimension: label,
    tuValor: data[key as keyof RadarData] || 0,
    perfilExito: comparisonData ? comparisonData[key as keyof RadarData] || 0 : 0,
    fullMark: 100,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsRadar data={chartData} outerRadius="80%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "#374151", fontSize: 12 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />

            {/* ✅ Tu perfil - usa dataKey="tuValor" */}
            <Radar
              name="Tu perfil"
              dataKey="tuValor"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.3}
            />

            {/* ✅ Perfil de éxito - usa dataKey="perfilExito" */}
            {comparisonData && (
              <Radar
                name="Perfil de éxito"
                dataKey="perfilExito"
                stroke="#16a34a"
                fill="#16a34a"
                fillOpacity={0.2}
              />
            )}

            <Legend />
          </RechartsRadar>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}