import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const DIMENSIONES: Record<string, { label: string; peso: number }> = {
  consistenciaIngresos: { label: "Consistencia de Ingresos", peso: 0.25 },
  responsabilidadPagos: { label: "Responsabilidad en Pagos", peso: 0.30 },
  compromisoCooperativo: { label: "Compromiso Cooperativo", peso: 0.15 },
  perfilEndeudamiento: { label: "Perfil de Endeudamiento", peso: 0.20 },
  capacidadAhorro: { label: "Capacidad de Ahorro", peso: 0.10 },
};

interface RadarInput {
  consistenciaIngresos: number;
  responsabilidadPagos: number;
  compromisoCooperativo: number;
  perfilEndeudamiento: number;
  capacidadAhorro: number;
}

function calcularRiesgo(radar: RadarInput): number {
  const { consistenciaIngresos, responsabilidadPagos, compromisoCooperativo, perfilEndeudamiento, capacidadAhorro } = radar;
  const score = consistenciaIngresos * 0.25 + responsabilidadPagos * 0.30 + compromisoCooperativo * 0.15 + capacidadAhorro * 0.10;
  const perfilEndeudamientoInvertido = 100 - perfilEndeudamiento;
  const riesgo = 1 - score / 100 + (perfilEndeudamientoInvertido * 0.20) / 100;
  return Math.max(0.05, Math.min(0.95, riesgo));
}

function obtenerDecision(riesgo: number): string {
  if (riesgo < 0.35) return "aprobado";
  if (riesgo < 0.55) return "precalificado";
  if (riesgo < 0.75) return "no_precalificado";
  return "rechazado";
}

function calcularMontoRecomendado(riesgo: number, montoSolicitado: number): number {
  const multiplicador = Math.max(0.3, 1 - riesgo);
  const monto = montoSolicitado * multiplicador;
  return Math.round(monto / 100000) * 100000;
}

function calcularScorePerfil(radar: RadarInput): number {
  let score = 0;
  for (const [dim, info] of Object.entries(DIMENSIONES)) {
    score += (radar as any)[dim] * info.peso;
  }
  return Math.round(score * 10) / 10;
}

function calcularRadarIdeal(radar: RadarInput, monto: number, plazo: number): Record<string, number> {
  const ideal: Record<string, number> = {};
  for (const [dim, info] of Object.entries(DIMENSIONES)) {
    const val = (radar as any)[dim];
    let v: number;
    if (val < 50) v = Math.min(100, val + 30);
    else if (val < 70) v = Math.min(100, val + 20);
    else if (val < 85) v = Math.min(100, val + 10);
    else v = val;

    if (monto > 10000000) {
      if (dim === "capacidadAhorro") v = Math.max(v, 75);
      if (dim === "consistenciaIngresos") v = Math.max(v, 80);
    }
    if (plazo > 36 && dim === "responsabilidadPagos") {
      v = Math.max(v, 80);
    }
    ideal[dim] = Math.round(v);
  }
  return ideal;
}

function analizarDimensiones(radar: RadarInput): { criticas: string[]; fortalezas: string[] } {
  const criticas: string[] = [];
  const fortalezas: string[] = [];
  for (const [dim, info] of Object.entries(DIMENSIONES)) {
    const val = (radar as any)[dim];
    if (val < 40) criticas.push(info.label);
    else if (val >= 70) fortalezas.push(info.label);
  }
  return { criticas, fortalezas };
}

function generarRecomendaciones(radar: RadarInput, montoRecomendado: number, plazo: number): string[] {
  const recs: string[] = [];
  const { consistenciaIngresos, responsabilidadPagos, compromisoCooperativo, perfilEndeudamiento, capacidadAhorro } = radar;

  if (consistenciaIngresos < 40) recs.push("Tus ingresos son inconsistentes. Considera documentar todas tus fuentes de ingreso o buscar empleo formal.");
  else if (consistenciaIngresos < 60) recs.push("Tus ingresos pueden mejorar. Intenta formalizar tus fuentes actuales de ingreso.");

  if (responsabilidadPagos < 40) recs.push("Tu historial de pagos es preocupante. Establece recordatorios automáticos y prioriza el pago de deudas.");
  else if (responsabilidadPagos < 60) recs.push("Puedes mejorar tu historial de pagos. Intenta pagar antes de la fecha de corte.");

  if (compromisoCooperativo < 40) recs.push("Tu participación en la cooperativa es baja. Asiste a las próximas asambleas y participa en actividades.");
  else if (compromisoCooperativo < 60) recs.push("Aumenta tu participación cooperativa. Esto fortalece tu perfil crediticio.");

  if (perfilEndeudamiento > 60) recs.push("Tu nivel de endeudamiento es alto. Reduce deudas actuales antes de solicitar nuevo crédito.");
  else if (perfilEndeudamiento > 45) recs.push("Controla tu nivel de endeudamiento. Evita adquirir nuevas deudas mientras procesas esta solicitud.");

  if (capacidadAhorro < 40) recs.push("Tu capacidad de ahorro es baja. Inicia un plan de ahorro programado aunque sea pequeño.");
  else if (capacidadAhorro < 60) recs.push("Establece un porcentaje fijo de ahorro mensual. Esto mejora tu perfil significativamente.");

  if (montoRecomendado > 10000000) recs.push(`Para un monto de $${montoRecomendado.toLocaleString()}, necesitas un perfil financiero sólido. Considera reducir el monto solicitado.`);

  if (recs.length === 0) recs.push("Mantén tu excelente perfil financiero. Sigue participando activamente en la cooperativa.");

  return recs.slice(0, 5);
}

function generarExplicacionPlantilla(riesgo: number, radar: RadarInput, decision: string, montoSolicitado: number, montoRecomendado: number, nombre?: string): string {
  const nombreTexto = nombre ? `${nombre}, tu` : "Tu";
  const { criticas, fortalezas } = analizarDimensiones(radar);

  if (decision === "aprobado" || decision === "precalificado") {
    let texto = `${nombreTexto} perfil crediticio es ${decision === "aprobado" ? "excelente" : "favorable"}. `;
    if (fortalezas.length > 0) {
      texto += `Destaca tu ${fortalezas.slice(0, 2).join(", ")}. `;
    }
    if (montoRecomendado < montoSolicitado) {
      texto += `El monto recomendado es $${montoRecomendado.toLocaleString()} COP, menor al solicitado ($${montoSolicitado.toLocaleString()} COP). `;
    }
    texto += "Tu solicitud será revisada por el equipo de la cooperativa.";
    return texto;
  }

  let texto = `${nombreTexto} perfil presenta áreas de mejora. `;
  if (criticas.length > 0) {
    texto += `Los factores a considerar son: ${criticas.join(", ")}. `;
  }
  texto += "Te recomendamos trabajar en estas áreas y volver a solicitar en 3 meses.";
  return texto;
}

async function explicacionDeepSeek(riesgo: number, radar: RadarInput, decision: string, montoSolicitado: number, montoRecomendado: number, nombre?: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return generarExplicacionPlantilla(riesgo, radar, decision, montoSolicitado, montoRecomendado, nombre);
  }

  const fortalezas: string[] = [];
  const debilidades: string[] = [];
  for (const [dim, info] of Object.entries(DIMENSIONES)) {
    const val = (radar as any)[dim];
    if (val >= 70) fortalezas.push(`${info.label}: ${val}/100`);
    else if (val < 40) debilidades.push(`${info.label}: ${val}/100`);
  }

  const prompt = `Eres un asesor financiero experto en créditos cooperativos en Colombia.

Evalúa el siguiente perfil crediticio y genera una explicación clara, profesional y empática.

DATOS DEL PERFIL:
- Nombre: ${nombre || "El asociado"}
- Decisión: ${decision.toUpperCase().replace(/_/g, " ")}
- Riesgo calculado: ${(riesgo * 100).toFixed(0)}%
- Monto solicitado: $${montoSolicitado.toLocaleString()} COP
- Monto recomendado: $${montoRecomendado.toLocaleString()} COP

DIMENSIONES DEL RADAR (0-100, mayor es mejor):
${Object.entries(DIMENSIONES).map(([dim, info]) => `- ${info.label}: ${(radar as any)[dim]}/100 (peso: ${(info.peso * 100).toFixed(0)}%)`).join("\n")}

${fortalezas.length > 0 ? `FORTALEZAS: ${fortalezas.join(", ")}` : "SIN FORTALEZAS DESTACADAS"}
${debilidades.length > 0 ? `ÁREAS CRÍTICAS: ${debilidades.join(", ")}` : "SIN ÁREAS CRÍTICAS"}

INSTRUCCIONES:
1. Explica la decisión de forma clara y empática (máximo 100 palabras)
2. Menciona las fortalezas principales del perfil
3. Si es rechazado o no precalificado, explica qué áreas mejorar sin sonar negativo
4. Si es aprobado o precalificado, celebra el logro del asociado
5. Usa un tono profesional pero cercano, como un asesor financiero de confianza
6. Incluye el monto recomendado si difiere del solicitado

RESPUESTA (solo el texto de explicación, sin encabezados):`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || generarExplicacionPlantilla(riesgo, radar, decision, montoSolicitado, montoRecomendado, nombre);
    }

    const errorText = await response.text();
    console.error(`DeepSeek error ${response.status}: ${errorText}`);
    return generarExplicacionPlantilla(riesgo, radar, decision, montoSolicitado, montoRecomendado, nombre);
  } catch (error) {
    console.error("Error DeepSeek:", error);
    return generarExplicacionPlantilla(riesgo, radar, decision, montoSolicitado, montoRecomendado, nombre);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { radar, monto_solicitado, plazo_meses, nombre } = body;

    if (!radar) {
      return NextResponse.json({ success: false, error: "Datos del radar requeridos" }, { status: 400 });
    }

    const radarData: RadarInput = {
      consistenciaIngresos: radar.consistenciaIngresos ?? 50,
      responsabilidadPagos: radar.responsabilidadPagos ?? 50,
      compromisoCooperativo: radar.compromisoCooperativo ?? 50,
      perfilEndeudamiento: radar.perfilEndeudamiento ?? 50,
      capacidadAhorro: radar.capacidadAhorro ?? 50,
    };

    const montoSolicitado = monto_solicitado || 5000000;
    const plazo = plazo_meses || 24;

    const riesgo = calcularRiesgo(radarData);
    const decision = obtenerDecision(riesgo);
    const montoRecomendado = calcularMontoRecomendado(riesgo, montoSolicitado);
    const scorePerfil = calcularScorePerfil(radarData);
    const radarIdeal = calcularRadarIdeal(radarData, montoSolicitado, plazo);
    const { criticas, fortalezas } = analizarDimensiones(radarData);
    const recomendaciones = generarRecomendaciones(radarData, montoRecomendado, plazo);
    const explicacion = await explicacionDeepSeek(riesgo, radarData, decision, montoSolicitado, montoRecomendado, nombre);

    let factorTexto: string;
    if (riesgo < 0.35) factorTexto = "Riesgo muy bajo";
    else if (riesgo < 0.55) factorTexto = "Riesgo moderado-bajo";
    else if (riesgo < 0.75) factorTexto = "Riesgo moderado-alto";
    else factorTexto = "Riesgo alto";

    return NextResponse.json({
      success: true,
      data: {
        decision,
        puntaje_riesgo: Math.round(riesgo * 10000) / 10000,
        monto_recomendado: montoRecomendado,
        radar: {
          consistenciaIngresos: Math.round(radarData.consistenciaIngresos),
          responsabilidadPagos: Math.round(radarData.responsabilidadPagos),
          compromisoCooperativo: Math.round(radarData.compromisoCooperativo),
          perfilEndeudamiento: Math.round(radarData.perfilEndeudamiento),
          capacidadAhorro: Math.round(radarData.capacidadAhorro),
        },
        radar_ideal: radarIdeal,
        explicacion,
        recomendaciones,
        factor_riesgo: factorTexto,
        dimensiones_criticas: criticas,
        fortalezas,
        score_perfil: scorePerfil,
      },
    });
  } catch (error: any) {
    console.error("Error en evaluación:", error?.message);
    return NextResponse.json({ success: false, error: error?.message || "Error desconocido" }, { status: 500 });
  }
}
