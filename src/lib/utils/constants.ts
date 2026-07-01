// src/lib/utils/constants.ts

export const DESTINOS_CREDITO = [
  { value: "emprendimiento", label: "🚀 Emprendimiento" },
  { value: "vivienda", label: "🏠 Mejora de vivienda" },
  { value: "educacion", label: "📚 Educación" },
  { value: "vehiculo", label: "🚗 Compra de vehículo" },
  { value: "deudas", label: "🔄 Consolidación de deudas" },
  { value: "otro", label: "📌 Otro" },
] as const;

export const RADAR_DIMENSIONES = {
  CONSISTENCIA_INGRESOS: "consistenciaIngresos",
  RESPONSABILIDAD_PAGOS: "responsabilidadPagos",
  COMPROMISO_COOPERATIVO: "compromisoCooperativo",
  PERFIL_ENDEUDAMIENTO: "perfilEndeudamiento",
  CAPACIDAD_AHORRO: "capacidadAhorro",
} as const;

export const RADAR_LABELS = {
  consistenciaIngresos: "📊 Consistencia de Ingresos",
  responsabilidadPagos: "✅ Responsabilidad en Pagos",
  compromisoCooperativo: "🤝 Compromiso Cooperativo",
  perfilEndeudamiento: "⚖️ Perfil de Endeudamiento",
  capacidadAhorro: "💰 Capacidad de Ahorro",
};