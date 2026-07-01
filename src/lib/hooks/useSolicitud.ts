// src/lib/hooks/useSolicitud.ts
import { useState } from "react";
import { createSolicitud, getSolicitud, updateSolicitud } from "@/lib/appwrite/db";
import type { Solicitud } from "@/lib/types";

export function useSolicitud() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async (data: {
    asociadoId: string;
    montoSolicitado: number;
    plazoMeses: number;
    destino: string;
    metadata?: Record<string, unknown>;
  }): Promise<Solicitud> => {
    setLoading(true);
    setError(null);
    try {
      const solicitud = await createSolicitud(data);
      return solicitud;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la solicitud");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const obtener = async (id: string): Promise<Solicitud> => {
    setLoading(true);
    setError(null);
    try {
      return await getSolicitud(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener la solicitud");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const actualizar = async (id: string, data: Partial<Solicitud>) => {
    setLoading(true);
    setError(null);
    try {
      return await updateSolicitud(id, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la solicitud");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    crear,
    obtener,
    actualizar,
  };
}