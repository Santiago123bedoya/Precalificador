"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Lightbulb, TrendingUp, Target } from "lucide-react";

interface ExplanationProps {
  decision: "precalificado" | "no_precalificado" | "aprobado" | "rechazado" | string;
  explicacion: string;
  recomendaciones?: string[];
  montoRecomendado?: number;
}

export function Explanation({
  decision,
  explicacion,
  recomendaciones = [],
  montoRecomendado,
}: ExplanationProps) {
  const isFavorable = decision === "precalificado" || decision === "aprobado";

  return (
    <div className="space-y-6">
      <Card className={isFavorable ? "border-green-200" : "border-red-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isFavorable ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600" />
            )}
            <span>
              {isFavorable
                ? "✅ Decisión Favorable"
                : decision === "rechazado"
                ? "❌ Solicitud Rechazada"
                : "⚠️ No Precalificado"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">{explicacion}</p>

          {!isFavorable && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Target className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">¿Por qué no?</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {decision === "rechazado"
                      ? "Tu perfil actual no cumple con los criterios mínimos para acceder a un crédito en este momento. Esto no es permanente: con un plan de acción puedes mejorar tu perfil."
                      : "Tu perfil está cerca de cumplir los requisitos. Con algunos ajustes en las áreas señaladas podrías calificar en una próxima revisión."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isFavorable && montoRecomendado && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800 text-sm">Monto precalificado</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                  ${montoRecomendado.toLocaleString()}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Este es el monto estimado para el cual calificas según tu perfil actual.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Decisión:</span>
            <Badge className={isFavorable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {decision}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {recomendaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              {isFavorable
                ? "Recomendaciones para seguir mejorando"
                : "Plan de acción para tu próxima solicitud"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recomendaciones.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 pt-0.5">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
