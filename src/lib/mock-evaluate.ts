export interface RadarInput {
  consistenciaIngresos: number;
  responsabilidadPagos: number;
  compromisoCooperativo: number;
  perfilEndeudamiento: number;
  capacidadAhorro: number;
}

export interface EvaluationResult {
  puntajeRiesgo: number;
  decision: "aprobado" | "precalificado" | "no_precalificado" | "rechazado";
  montoRecomendado: number;
  explicacionResumen: string;
  recomendaciones: string[];
}

const DIMENSION_LABELS: Record<string, { label: string; favorable: string; desfavorable: string }> = {
  consistenciaIngresos: {
    label: "Consistencia de Ingresos",
    favorable: "tus ingresos son estables y predecibles",
    desfavorable: "tus ingresos tienen alta variabilidad",
  },
  responsabilidadPagos: {
    label: "Responsabilidad en Pagos",
    favorable: "cumples con tus obligaciones a tiempo",
    desfavorable: "tienes un historial de pagos irregular",
  },
  compromisoCooperativo: {
    label: "Compromiso Cooperativo",
    favorable: "tu participación y antigüedad en la cooperativa son sobresalientes",
    desfavorable: "tu vínculo con la cooperativa aún es reciente",
  },
  perfilEndeudamiento: {
    label: "Perfil de Endeudamiento",
    favorable: "tu nivel de deuda es bajo y manejable",
    desfavorable: "tus gastos representan una proporción alta de tus ingresos",
  },
  capacidadAhorro: {
    label: "Capacidad de Ahorro",
    favorable: "tienes una excelente capacidad de ahorro",
    desfavorable: "tu margen de ahorro es limitado",
  },
};

export function evaluateRadar(input: RadarInput, montoSolicitado: number): EvaluationResult {
  const weights = {
    consistenciaIngresos: 0.25,
    responsabilidadPagos: 0.30,
    compromisoCooperativo: 0.15,
    perfilEndeudamiento: 0.20,
    capacidadAhorro: 0.10,
  };

  const riskScore =
    (100 - input.consistenciaIngresos) * weights.consistenciaIngresos +
    (100 - input.responsabilidadPagos) * weights.responsabilidadPagos +
    (100 - input.compromisoCooperativo) * weights.compromisoCooperativo +
    input.perfilEndeudamiento * weights.perfilEndeudamiento +
    (100 - input.capacidadAhorro) * weights.capacidadAhorro;

  const puntajeRiesgo = Math.round(Math.min(100, Math.max(0, riskScore))) / 100;

  let decision: EvaluationResult["decision"];
  let factor: number;

  if (puntajeRiesgo < 0.25) {
    decision = "aprobado";
    factor = 1.0;
  } else if (puntajeRiesgo < 0.45) {
    decision = "precalificado";
    factor = 0.8;
  } else if (puntajeRiesgo < 0.65) {
    decision = "no_precalificado";
    factor = 0.4;
  } else {
    decision = "rechazado";
    factor = 0;
  }

  const montoRecomendado = Math.round(montoSolicitado * factor);

  const entries = Object.entries(input) as [keyof RadarInput, number][];
  const sorted = [...entries].sort((a, b) => {
    const aVal = a[0] === "perfilEndeudamiento" ? 100 - a[1] : a[1];
    const bVal = b[0] === "perfilEndeudamiento" ? 100 - b[1] : b[1];
    return bVal - aVal;
  });

  const strongest = sorted.slice(0, 2);
  const weakest = sorted.slice(-2).reverse();

  const strongTexts = strongest
    .filter(([k]) => DIMENSION_LABELS[k])
    .map(([k]) => DIMENSION_LABELS[k].favorable);

  const weakTexts = weakest
    .filter(([k]) => DIMENSION_LABELS[k])
    .map(([k]) => DIMENSION_LABELS[k].desfavorable);

  let explicacionResumen: string;

  if (decision === "aprobado" || decision === "precalificado") {
    explicacionResumen = `Tu perfil crediticio es ${
      decision === "aprobado" ? "excelente" : "favorable"
    }. `;
    if (strongTexts.length > 0) {
      explicacionResumen += `Destaca que ${strongTexts.join(" y ")}. `;
    }
    if (weakTexts.length > 0) {
      explicacionResumen += `Para mejorar aún más, considera que ${weakTexts.join(" y ")}. `;
    }
    if (decision === "precalificado") {
      explicacionResumen += `Por ello, te precalificamos por un monto de $${montoRecomendado.toLocaleString()}.`;
    } else {
      explicacionResumen += `Tu solicitud ha sido aprobada por el monto solicitado.`;
    }
  } else {
    explicacionResumen = `En este momento no podemos aprobar tu solicitud. `;
    if (weakTexts.length > 0) {
      explicacionResumen += `Los principales factores son: ${weakTexts.join(" y ")}. `;
    }
    if (decision === "no_precalificado") {
      explicacionResumen += `Te recomendamos trabajar en estas áreas y volver a solicitarlo en 3 meses.`;
    } else {
      explicacionResumen += `Te sugerimos un plan de acompañamiento con tu asesor para mejorar tu perfil financiero.`;
    }
  }

  const recomendaciones: string[] = [];
  for (const [key, val] of weakest) {
    if (val < 40) {
      switch (key) {
        case "consistenciaIngresos":
          recomendaciones.push("Busca diversificar tus fuentes de ingreso para hacerlos más estables");
          break;
        case "responsabilidadPagos":
          recomendaciones.push("Configura recordatorios de pago para no olvidar ninguna cuota");
          break;
        case "compromisoCooperativo":
          recomendaciones.push("Asiste a las asambleas y participa en actividades de la cooperativa");
          break;
        case "perfilEndeudamiento":
          recomendaciones.push("Reduce tus deudas actuales antes de solicitar un nuevo crédito");
          break;
        case "capacidadAhorro":
          recomendaciones.push("Inicia un ahorro programado, aunque sea por un monto pequeño");
          break;
      }
    }
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push("Mantén tu buen comportamiento financiero");
    recomendaciones.push("Sigue participando activamente en la cooperativa");
  }

  return {
    puntajeRiesgo,
    decision,
    montoRecomendado,
    explicacionResumen,
    recomendaciones,
  };
}

export function calcularPerfilExito(): RadarInput | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("ia-coop-mock-evaluaciones");
  if (!stored) return null;
  const evaluaciones: any[] = JSON.parse(stored);
  const exitosas = evaluaciones.filter(
    (e) => e.decision === "aprobado" || e.decision === "precalificado"
  );
  if (exitosas.length === 0) return null;

  const sum = exitosas.reduce(
    (acc, e) => ({
      consistenciaIngresos: acc.consistenciaIngresos + (e.consistenciaIngresos || 0),
      responsabilidadPagos: acc.responsabilidadPagos + (e.responsabilidadPagos || 0),
      compromisoCooperativo: acc.compromisoCooperativo + (e.compromisoCooperativo || 0),
      perfilEndeudamiento: acc.perfilEndeudamiento + (e.perfilEndeudamiento || 0),
      capacidadAhorro: acc.capacidadAhorro + (e.capacidadAhorro || 0),
    }),
    { consistenciaIngresos: 0, responsabilidadPagos: 0, compromisoCooperativo: 0, perfilEndeudamiento: 0, capacidadAhorro: 0 }
  );

  const n = exitosas.length;
  return {
    consistenciaIngresos: Math.round(sum.consistenciaIngresos / n),
    responsabilidadPagos: Math.round(sum.responsabilidadPagos / n),
    compromisoCooperativo: Math.round(sum.compromisoCooperativo / n),
    perfilEndeudamiento: Math.round(sum.perfilEndeudamiento / n),
    capacidadAhorro: Math.round(sum.capacidadAhorro / n),
  };
}
