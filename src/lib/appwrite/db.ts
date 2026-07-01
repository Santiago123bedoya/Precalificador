import { databases, DB } from "./client";
import { USE_MOCK } from "@/lib/mock";
import type { Solicitud, Evaluacion, Asociado } from "@/lib/types";

const MOCK_SOLICITUDES_KEY = "ia-coop-mock-solicitudes";
const MOCK_EVALUACIONES_KEY = "ia-coop-mock-evaluaciones";

function getMockList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

function saveMockList<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
}

// ============================================
// ASOCIADOS
// ============================================
export async function updateAsociado(id: string, data: Partial<Asociado>): Promise<Asociado> {
  if (USE_MOCK) throw new Error("updateAsociado no implementado en modo mock");
  return databases.updateDocument(
    DB.id,
    DB.collections.ASOCIADOS,
    id,
    data
  ) as unknown as Promise<Asociado>;
}

// ============================================
// SOLICITUDES
// ============================================
export async function getSolicitud(id: string): Promise<Solicitud> {
  if (USE_MOCK) {
    const list = getMockList<Solicitud>(MOCK_SOLICITUDES_KEY);
    const found = list.find((s) => s.$id === id);
    if (!found) throw new Error("Solicitud no encontrada");
    return found;
  }
  return databases.getDocument(DB.id, DB.collections.SOLICITUDES, id) as unknown as Promise<Solicitud>;
}

export async function createSolicitud(data: any): Promise<Solicitud> {
  if (USE_MOCK) {
    const meta = data.metadata || {};
    const list = getMockList<Solicitud>(MOCK_SOLICITUDES_KEY);
    const newDoc: Solicitud = {
      $id: `mock-sol-${Date.now()}`,
      asociadoId: data.asociadoId,
      montoSolicitado: data.montoSolicitado,
      plazoMeses: data.plazoMeses,
      destino: data.destino,
      estado: "precalificado",
      fechaSolicitud: new Date().toISOString(),
      metadata: meta,
    };
    list.push(newDoc);
    saveMockList(MOCK_SOLICITUDES_KEY, list);

    const evalList = getMockList<Evaluacion>(MOCK_EVALUACIONES_KEY);
    const newEval: Evaluacion = {
      $id: `mock-eval-${Date.now()}`,
      solicitudId: newDoc.$id,
      asociadoId: data.asociadoId,
      decision: "precalificado",
      puntajeRiesgo: 0.3,
      montoRecomendado: Math.round(data.montoSolicitado * 0.8),
      consistenciaIngresos: meta.consistenciaIngresos || 70,
      responsabilidadPagos: meta.responsabilidadPagos || 60,
      compromisoCooperativo: meta.compromisoCooperativo || 50,
      perfilEndeudamiento: meta.perfilEndeudamiento || 40,
      capacidadAhorro: meta.capacidadAhorro || 50,
      explicacionResumen: "Evaluación automática en modo demo. Perfil crediticio precalificado.",
      recomendaciones: ["Mantener ingresos estables", "Ahorrar mensualmente", "Participar en asambleas"],
      fechaEvaluacion: new Date().toISOString(),
    };
    evalList.push(newEval);
    saveMockList(MOCK_EVALUACIONES_KEY, evalList);

    return newDoc;
  }
  return databases.createDocument(
    DB.id,
    DB.collections.SOLICITUDES,
    "unique()",
    {
      asociadoId: data.asociadoId,
      montoSolicitado: data.montoSolicitado,
      plazoMeses: data.plazoMeses,
      destino: data.destino,
      estado: "pendiente",
      fechaSolicitud: new Date().toISOString(),
      metadata: data.metadata || {},
    }
  ) as unknown as Promise<Solicitud>;
}

export async function updateSolicitud(id: string, data: Partial<Solicitud>): Promise<Solicitud> {
  if (USE_MOCK) {
    const list = getMockList<Solicitud>(MOCK_SOLICITUDES_KEY);
    const idx = list.findIndex((s) => s.$id === id);
    if (idx < 0) throw new Error("Solicitud no encontrada");
    list[idx] = { ...list[idx], ...data };
    saveMockList(MOCK_SOLICITUDES_KEY, list);
    return list[idx];
  }
  return databases.updateDocument(
    DB.id,
    DB.collections.SOLICITUDES,
    id,
    data
  ) as unknown as Promise<Solicitud>;
}

// ============================================
// CONSENTIMIENTOS
// ============================================
export async function createConsentimiento(data: {
  asociadoId: string;
  fecha: string;
  vigente: boolean;
  datosPermitidos: {
    serviciosBasicos: boolean;
    economiaDigital: boolean;
    datosCooperativa: boolean;
    datosSocioConductuales: boolean;
  };
}) {
  if (USE_MOCK) return { $id: "mock-consent", ...data };
  return databases.createDocument(
    DB.id,
    DB.collections.CONSENTIMIENTOS,
    "unique()",
    data
  );
}

export async function getConsentimiento(asociadoId: string) {
  if (USE_MOCK) return null;
  const result = await databases.listDocuments(
    DB.id,
    DB.collections.CONSENTIMIENTOS,
    [`asociadoId=${asociadoId}`]
  );
  return result.documents[0] || null;
}

// ============================================
// EVALUACIONES
// ============================================
export async function getEvaluacion(id: string): Promise<Evaluacion> {
  if (USE_MOCK) {
    const list = getMockList<Evaluacion>(MOCK_EVALUACIONES_KEY);
    const found = list.find((e) => e.$id === id);
    if (!found) throw new Error("Evaluación no encontrada");
    return found;
  }
  return databases.getDocument(DB.id, DB.collections.EVALUACIONES, id) as unknown as Promise<Evaluacion>;
}

export async function createEvaluacion(data: Omit<Evaluacion, "$id">): Promise<Evaluacion> {
  if (USE_MOCK) {
    const list = getMockList<Evaluacion>(MOCK_EVALUACIONES_KEY);
    const newDoc: Evaluacion = {
      $id: `mock-eval-${Date.now()}`,
      ...data,
      fechaEvaluacion: new Date().toISOString(),
    };
    list.push(newDoc);
    saveMockList(MOCK_EVALUACIONES_KEY, list);
    return newDoc;
  }
  return databases.createDocument(
    DB.id,
    DB.collections.EVALUACIONES,
    "unique()",
    {
      ...data,
      fechaEvaluacion: new Date().toISOString(),
    }
  ) as unknown as Promise<Evaluacion>;
}