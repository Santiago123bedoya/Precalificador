// src/lib/types/index.ts

export type UserRole = "admin" | "gestor" | "asociado";

export interface Asociado {
  $id: string;
  nombre: string;
  email: string;
  telefono?: string;
  fechaRegistro: string;
  rol: UserRole;
  ingresosVerificados: boolean;
  consistenciaIngresos: number;
  responsabilidadPagos: number;
  compromisoCooperativo: number;
  perfilEndeudamiento: number;
  capacidadAhorro: number;
}

export interface Solicitud {
  $id: string;
  asociadoId: string;
  montoSolicitado: number;
  plazoMeses: number;
  destino: string;
  estado: "pendiente" | "precalificado" | "aprobado" | "rechazado";
  fechaSolicitud: string;
  metadata?: any;
}

export interface Evaluacion {
  $id: string;
  solicitudId: string;
  asociadoId: string;
  fechaEvaluacion: string;
  puntajeRiesgo: number;
  consistenciaIngresos: number;
  responsabilidadPagos: number;
  compromisoCooperativo: number;
  perfilEndeudamiento: number;
  capacidadAhorro: number;
  decision: "precalificado" | "no_precalificado" | "aprobado" | "rechazado";
  explicacionResumen: string;
  montoRecomendado?: number;
  recomendaciones?: string[];
}

export interface RadarData {
  consistenciaIngresos: number;
  responsabilidadPagos: number;
  compromisoCooperativo: number;
  perfilEndeudamiento: number;
  capacidadAhorro: number;
}

export interface IngresoDigital {
  $id: string;
  asociadoId: string;
  plataforma: string;
  accountId: string;
  promedioMensual: number;
  mesesActivo: number;
  fechaActualizacion: string;
}

export interface Consentimiento {
  $id: string;
  asociadoId: string;
  fecha: string;
  vigente: boolean;
  datosPermitidos: {
    serviciosBasicos: boolean;
    economiaDigital: boolean;
    datosCooperativa: boolean;
    datosSocioConductuales: boolean;
  };
}