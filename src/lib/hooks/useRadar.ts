// src/lib/hooks/useRadar.ts
import { useEffect, useState } from "react";
import { getEvaluacion } from "@/lib/appwrite/db";
import type { Evaluacion, RadarData } from "@/lib/types";

export function useRadar(evaluacionId: string) {
  const [data, setData] = useState<Evaluacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evaluacionId) {
      setLoading(false);
      return;
    }

    const fetchRadar = async () => {
      try {
        const evaluacion = await getEvaluacion(evaluacionId);
        setData(evaluacion);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el radar");
      } finally {
        setLoading(false);
      }
    };

    fetchRadar();
  }, [evaluacionId]);

  const getRadarData = (): RadarData | null => {
    if (!data) return null;
    return {
      consistenciaIngresos: data.consistenciaIngresos,
      responsabilidadPagos: data.responsabilidadPagos,
      compromisoCooperativo: data.compromisoCooperativo,
      perfilEndeudamiento: data.perfilEndeudamiento,
      capacidadAhorro: data.capacidadAhorro,
    };
  };

  return {
    data,
    loading,
    error,
    radarData: getRadarData(),
    isFavorable: data?.decision === "precalificado" || data?.decision === "aprobado",
  };
}