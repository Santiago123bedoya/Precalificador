import { databases, DB } from "./client";
import { Query } from "appwrite";
import { USE_MOCK } from "@/lib/mock";
import type { Solicitud, Evaluacion, Asociado, ServicioPublico, IngresoDigital, CuestionarioSocioConductual } from "@/lib/types";

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
  const doc = await databases.getDocument(DB.id, DB.collections.SOLICITUDES, id) as any;
  if (typeof doc.metadata === "string") {
    try { doc.metadata = JSON.parse(doc.metadata); } catch { doc.metadata = {}; }
  }
  if (doc.formData) {
    try { doc.metadata = { ...(doc.metadata || {}), ...JSON.parse(doc.formData) }; } catch {}
  }
  if (doc.fechasolicitud && !doc.fechaSolicitud) {
    doc.fechaSolicitud = doc.fechasolicitud;
  }
  return doc as Solicitud;
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
      fechasolicitud: new Date().toISOString(),
      metadata: [],
      formData: data.metadata ? JSON.stringify(data.metadata) : "",
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
    {
      ...data,
      datosPermitidos: JSON.stringify(data.datosPermitidos),
    }
  );
}

export async function getConsentimiento(asociadoId: string) {
  if (USE_MOCK) return null;
  const result = await databases.listDocuments(
    DB.id,
    DB.collections.CONSENTIMIENTOS,
    [Query.equal("asociadoId", asociadoId)]
  );
  return result.documents[0] || null;
}

// ============================================
// EVALUACIONES
// ============================================
export async function getEvaluacionBySolicitud(solicitudId: string): Promise<Evaluacion | null> {
  if (USE_MOCK) {
    const list = getMockList<Evaluacion>(MOCK_EVALUACIONES_KEY);
    return list.find((e) => e.solicitudId === solicitudId) || null;
  }
  let result: any;
  for (let i = 0; i < 5; i++) {
    result = await databases.listDocuments(
      DB.id,
      DB.collections.EVALUACIONES,
      [Query.equal("solicitudId", solicitudId)]
    );
    if (result.documents.length > 0) break;
    if (i < 4) await new Promise((r) => setTimeout(r, 400));
  }
  if (!result || result.documents.length === 0) return null;
  const doc = result.documents[result.documents.length - 1] as any;
  if (typeof doc.recomendaciones === "string") {
    try { doc.recomendaciones = JSON.parse(doc.recomendaciones); } catch { doc.recomendaciones = []; }
  }
  return doc as Evaluacion;
}

export async function getEvaluacion(id: string): Promise<Evaluacion> {
  if (USE_MOCK) {
    const list = getMockList<Evaluacion>(MOCK_EVALUACIONES_KEY);
    const found = list.find((e) => e.$id === id);
    if (!found) throw new Error("Evaluación no encontrada");
    return found;
  }
  const doc = await databases.getDocument(DB.id, DB.collections.EVALUACIONES, id) as any;
  if (typeof doc.recomendaciones === "string") {
    try { doc.recomendaciones = JSON.parse(doc.recomendaciones); } catch { doc.recomendaciones = []; }
  }
  return doc as Evaluacion;
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
      recomendaciones: JSON.stringify(data.recomendaciones || []),
      fechaEvaluacion: new Date().toISOString(),
    }
  ) as unknown as Promise<Evaluacion>;
}

// ============================================
// SERVICIOS PÚBLICOS
// ============================================
export async function createServicio(data: Omit<ServicioPublico, "$id">): Promise<ServicioPublico> {
  if (USE_MOCK) {
    const key = "ia-coop-mock-servicios";
    const list = getMockList<any>(key);
    const newDoc = { $id: `mock-serv-${Date.now()}`, ...data };
    list.push(newDoc);
    saveMockList(key, list);
    return newDoc;
  }
  return databases.createDocument(
    DB.id,
    DB.collections.SERVICIOS_PUBLICOS,
    "unique()",
    data
  ) as unknown as Promise<ServicioPublico>;
}

export async function getServiciosByUser(asociadoId: string): Promise<ServicioPublico[]> {
  if (USE_MOCK) {
    const key = "ia-coop-mock-servicios";
    const list = getMockList<any>(key);
    return list.filter((s: any) => s.asociadoId === asociadoId);
  }
  const result = await databases.listDocuments(
    DB.id,
    DB.collections.SERVICIOS_PUBLICOS,
    [Query.equal("asociadoId", asociadoId)]
  );
  return result.documents as unknown as ServicioPublico[];
}

// ============================================
// INGRESOS DIGITALES (Palenca / Plataformas)
// ============================================
export async function createIngresoDigital(data: Omit<IngresoDigital, "$id">): Promise<IngresoDigital> {
  if (USE_MOCK) {
    const key = "ia-coop-mock-ingresos-digitales";
    const list = getMockList<any>(key);
    const newDoc = { $id: `mock-ing-${Date.now()}`, ...data };
    list.push(newDoc);
    saveMockList(key, list);
    return newDoc;
  }
  return databases.createDocument(
    DB.id,
    DB.collections.INGRESOS_DIGITALES,
    "unique()",
    data
  ) as unknown as Promise<IngresoDigital>;
}

export async function getIngresosByUser(asociadoId: string): Promise<IngresoDigital[]> {
  if (USE_MOCK) {
    const key = "ia-coop-mock-ingresos-digitales";
    const list = getMockList<any>(key);
    return list.filter((s: any) => s.asociadoId === asociadoId);
  }
  const result = await databases.listDocuments(
    DB.id,
    DB.collections.INGRESOS_DIGITALES,
    [Query.equal("asociadoId", asociadoId)]
  );
  return result.documents as unknown as IngresoDigital[];
}

export async function deleteIngresoDigital(id: string): Promise<void> {
  if (USE_MOCK) {
    const key = "ia-coop-mock-ingresos-digitales";
    const list = getMockList<any>(key);
    saveMockList(key, list.filter((s: any) => s.$id !== id));
    return;
  }
  await databases.deleteDocument(DB.id, DB.collections.INGRESOS_DIGITALES, id);
}

// ============================================
// CUESTIONARIO SOCIO-CONDUCTUAL
// ============================================
const MOCK_CUESTIONARIOS_KEY = "ia-coop-mock-cuestionarios";

export async function getCuestionarioByUser(asociadoId: string): Promise<CuestionarioSocioConductual | null> {
  if (USE_MOCK) {
    const list = getMockList<CuestionarioSocioConductual>(MOCK_CUESTIONARIOS_KEY);
    return list.find((c) => c.asociadoId === asociadoId) || null;
  }
  const result = await databases.listDocuments(
    DB.id,
    DB.collections.CUESTIONARIOS,
    [Query.equal("asociadoId", asociadoId)]
  );
  if (result.documents.length === 0) return null;
  const doc = result.documents[0] as any;
  if (typeof doc.respuestas === "string") {
    try { doc.respuestas = JSON.parse(doc.respuestas); } catch { doc.respuestas = []; }
  }
  if (typeof doc.dimensiones === "string") {
    try { doc.dimensiones = JSON.parse(doc.dimensiones); } catch { doc.dimensiones = {}; }
  }
  return doc as CuestionarioSocioConductual;
}

export async function saveCuestionario(data: Omit<CuestionarioSocioConductual, "$id">): Promise<CuestionarioSocioConductual> {
  if (USE_MOCK) {
    const list = getMockList<CuestionarioSocioConductual>(MOCK_CUESTIONARIOS_KEY);
    const existing = list.findIndex((c) => c.asociadoId === data.asociadoId);
    const newDoc: CuestionarioSocioConductual = {
      $id: `mock-cuest-${Date.now()}`,
      ...data,
    };
    if (existing >= 0) {
      list[existing] = newDoc;
    } else {
      list.push(newDoc);
    }
    saveMockList(MOCK_CUESTIONARIOS_KEY, list);
    return newDoc;
  }
  const existing = await databases.listDocuments(
    DB.id,
    DB.collections.CUESTIONARIOS,
    [Query.equal("asociadoId", data.asociadoId)]
  );
  const doc = {
    ...data,
    respuestas: JSON.stringify(data.respuestas),
    dimensiones: JSON.stringify(data.dimensiones),
    fecha: new Date().toISOString(),
  };
  if (existing.documents.length > 0) {
    return databases.updateDocument(
      DB.id,
      DB.collections.CUESTIONARIOS,
      existing.documents[0].$id,
      doc
    ) as unknown as Promise<CuestionarioSocioConductual>;
  }
  return databases.createDocument(
    DB.id,
    DB.collections.CUESTIONARIOS,
    "unique()",
    doc
  ) as unknown as Promise<CuestionarioSocioConductual>;
}

export async function deleteCuestionario(id: string): Promise<void> {
  if (USE_MOCK) {
    const list = getMockList<CuestionarioSocioConductual>(MOCK_CUESTIONARIOS_KEY);
    saveMockList(MOCK_CUESTIONARIOS_KEY, list.filter((c) => c.$id !== id));
    return;
  }
  await databases.deleteDocument(DB.id, DB.collections.CUESTIONARIOS, id);
}

export async function deleteServicio(id: string): Promise<void> {
  if (USE_MOCK) {
    const key = "ia-coop-mock-servicios";
    const list = getMockList<any>(key);
    saveMockList(key, list.filter((s: any) => s.$id !== id));
    return;
  }
  await databases.deleteDocument(DB.id, DB.collections.SERVICIOS_PUBLICOS, id);
}