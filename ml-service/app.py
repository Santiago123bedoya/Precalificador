import os
import json
import pickle
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv('.env.local')

app = FastAPI(title="IA-COOP ML Service", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_API_URL = os.getenv('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1/chat/completions')
DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')

class EvaluationRequest(BaseModel):
    consistencia_ingresos: float
    responsabilidad_pagos: float
    compromiso_cooperativo: float
    perfil_endeudamiento: float
    capacidad_ahorro: float
    monto_solicitado: Optional[float] = None
    plazo_meses: Optional[int] = None
    nombre: Optional[str] = None

class EvaluationResponse(BaseModel):
    decision: str
    puntaje_riesgo: float
    monto_recomendado: float
    radar: Dict[str, float]
    radar_ideal: Dict[str, float]
    explicacion: str
    recomendaciones: List[str]
    factor_riesgo: str
    dimensiones_criticas: List[str]
    fortalezas: List[str]
    score_perfil: float

def load_model():
    try:
        with open('model.pkl', 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        print("Modelo no encontrado. Entrena con train.py")
        return None

model = load_model()

DIMENSIONES = {
    'consistenciaIngresos': {'label': 'Consistencia de Ingresos', 'key': 'consistencia_ingresos', 'peso': 0.25},
    'responsabilidadPagos': {'label': 'Responsabilidad en Pagos', 'key': 'responsabilidad_pagos', 'peso': 0.30},
    'compromisoCooperativo': {'label': 'Compromiso Cooperativo', 'key': 'compromiso_cooperativo', 'peso': 0.15},
    'perfilEndeudamiento': {'label': 'Perfil de Endeudamiento', 'key': 'perfil_endeudamiento', 'peso': 0.20},
    'capacidadAhorro': {'label': 'Capacidad de Ahorro', 'key': 'capacidad_ahorro', 'peso': 0.10},
}

def calcular_radar_ideal(radar: Dict[str, float], monto: float, plazo: int) -> Dict[str, float]:
    ideal = {}
    for dim, info in DIMENSIONES.items():
        val = radar.get(dim, 50)
        if val < 50:
            ideal[dim] = min(100, val + 30)
        elif val < 70:
            ideal[dim] = min(100, val + 20)
        elif val < 85:
            ideal[dim] = min(100, val + 10)
        else:
            ideal[dim] = val

    if monto > 10000000:
        ideal['capacidadAhorro'] = max(ideal.get('capacidadAhorro', 70), 75)
        ideal['consistenciaIngresos'] = max(ideal.get('consistenciaIngresos', 70), 80)
    if plazo and plazo > 36:
        ideal['responsabilidadPagos'] = max(ideal.get('responsabilidadPagos', 70), 80)

    return {k: round(v) for k, v in ideal.items()}

def calcular_monto_recomendado(riesgo: float, monto_solicitado: float = 5000000) -> float:
    multiplicador = max(0.3, 1 - riesgo)
    monto = monto_solicitado * multiplicador
    return round(monto / 100000) * 100000

def calcular_score_perfil(radar: Dict[str, float]) -> float:
    score = 0
    for dim, info in DIMENSIONES.items():
        val = radar.get(dim, 50)
        score += val * info['peso']
    return round(score, 1)

def analizar_dimensiones(radar: Dict[str, float]) -> tuple:
    criticas = []
    fortalezas = []
    for dim, info in DIMENSIONES.items():
        val = radar.get(dim, 50)
        if val < 40:
            criticas.append(info['label'])
        elif val >= 70:
            fortalezas.append(info['label'])
    return criticas, fortalezas

def generar_recomendaciones(radar: Dict[str, float], monto: float, plazo: int) -> List[str]:
    recs = []

    ci = radar.get('consistenciaIngresos', 50)
    rp = radar.get('responsabilidadPagos', 50)
    cc = radar.get('compromisoCooperativo', 50)
    pe = radar.get('perfilEndeudamiento', 50)
    ca = radar.get('capacidadAhorro', 50)

    if ci < 40:
        recs.append("Tus ingresos son inconsistentes. Considera documentar todas tus fuentes de ingreso o buscar empleo formal.")
    elif ci < 60:
        recs.append("Tus ingresos pueden mejorar. Intenta formalizar tus fuentes actuales de ingreso.")

    if rp < 40:
        recs.append("Tu historial de pagos es preocupante. Establece recordatorios automáticos y prioriza el pago de deudas.")
    elif rp < 60:
        recs.append("Puedes mejorar tu historial de pagos. Intenta pagar antes de la fecha de corte.")

    if cc < 40:
        recs.append("Tu participación en la cooperativa es baja. Asiste a las próximas asambleas y participa en actividades.")
    elif cc < 60:
        recs.append("Aumenta tu participación cooperativa. Esto fortalece tu perfil crediticio.")

    if pe > 60:
        recs.append("Tu nivel de endeudamiento es alto. Reduce deudas actuales antes de solicitar nuevo crédito.")
    elif pe > 45:
        recs.append("Controla tu nivel de endeudamiento. Evita adquirir nuevas deudas mientras procesas esta solicitud.")

    if ca < 40:
        recs.append("Tu capacidad de ahorro es baja. Inicia un plan de ahorro programado aunque sea pequeño.")
    elif ca < 60:
        recs.append("Establece un porcentaje fijo de ahorro mensual. Esto mejora tu perfil significativamente.")

    if monto > 10000000:
        recs.append(f"Para un monto de ${monto:,.0f}, necesitas un perfil financiero sólido. Considera reducir el monto solicitado.")

    if not recs:
        recs.append("Mantén tu excelente perfil financiero. Sigue participando activamente en la cooperativa.")

    return recs[:5]

async def explicacion_deepseek(riesgo: float, radar: Dict[str, float], recomendaciones: List[str], decision: str, monto_solicitado: float, monto_recomendado: float, nombre: Optional[str] = None) -> str:
    if not DEEPSEEK_API_KEY:
        return generar_explicacion_plantilla(riesgo, radar, decision, monto_solicitado, monto_recomendado, nombre)

    fortalezas = []
    debilidades = []
    for dim, info in DIMENSIONES.items():
        val = radar.get(dim, 50)
        if val >= 70:
            fortalezas.append(f"{info['label']}: {val:.0f}/100")
        elif val < 40:
            debilidades.append(f"{info['label']}: {val:.0f}/100")

    prompt = f"""Eres un asesor financiero experto en créditos cooperativos en Colombia.

Evalúa el siguiente perfil crediticio y genera una explicación clara, profesional y empática.

DATOS DEL PERFIL:
- Nombre: {nombre or 'El asociado'}
- Decisión: {decision.upper().replace('_', ' ')}
- Riesgo calculado: {riesgo*100:.0f}%
- Monto solicitado: ${monto_solicitado:,.0f} COP
- Monto recomendado: ${monto_recomendado:,.0f} COP

DIMENSIONES DEL RADAR (0-100, mayor es mejor):
{chr(10).join(f"- {info['label']}: {radar.get(dim, 0):.0f}/100 (peso: {info['peso']*100:.0f}%)" for dim, info in DIMENSIONES.items())}

{f"FORTALEZAS: {', '.join(fortalezas)}" if fortalezas else "SIN FORTALEZAS DESTACADAS"}
{f"ÁREAS CRÍTICAS: {', '.join(debilidades)}" if debilidades else "SIN ÁREAS CRÍTICAS"}

INSTRUCCIONES:
1. Explica la decisión de forma clara y empática (máximo 100 palabras)
2. Menciona las fortalezas principales del perfil
3. Si es rechazado o no precalificado, explica qué áreas mejorar sin sonar negativo
4. Si es aprobado o precalificado, celebra el logro del asociado
5. Usa un tono profesional pero cercano, como un asesor financiero de confianza
6. Incluye el monto recomendado si difiere del solicitado

RESPUESTA (solo el texto de explicación, sin encabezados):"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers={
                    'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': DEEPSEEK_MODEL,
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.4,
                    'max_tokens': 300
                },
                timeout=30.0
            )
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content'].strip()
            else:
                print(f"DeepSeek error {response.status_code}: {response.text}")
                return generar_explicacion_plantilla(riesgo, radar, decision, monto_solicitado, monto_recomendado, nombre)
    except Exception as e:
        print(f"Error DeepSeek: {e}")
        return generar_explicacion_plantilla(riesgo, radar, decision, monto_solicitado, monto_recomendado, nombre)

def generar_explicacion_plantilla(riesgo: float, radar: Dict[str, float], decision: str, monto_solicitado: float, monto_recomendado: float, nombre: Optional[str] = None) -> str:
    nombre_texto = f"{nombre}, tu" if nombre else "Tu"
    criticas, fortalezas = analizar_dimensiones(radar)

    if decision in ("aprobado", "precalificado"):
        texto = f"{nombre_texto} perfil crediticio es {'excelente' if decision == 'aprobado' else 'favorable'}. "
        if fortalezas:
            texto += f"Destaca tu {', '.join(fortalezas[:2])}. "
        if monto_recomendado < monto_solicitado:
            texto += f"El monto recomendado es ${monto_recomendado:,.0f} COP, menor al solicitado (${monto_solicitado:,.0f} COP). "
        texto += "Tu solicitud será revisada por el equipo de la cooperativa."
    else:
        texto = f"{nombre_texto} perfil presenta áreas de mejora. "
        if criticas:
            texto += f"Los factores a considerar son: {', '.join(criticas)}. "
        texto += "Te recomendamos trabajar en estas áreas y volver a solicitar en 3 meses."

    return texto

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "deepseek_configured": bool(DEEPSEEK_API_KEY),
        "version": "3.0.0"
    }

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest):
    try:
        features = np.array([
            request.consistencia_ingresos,
            request.responsabilidad_pagos,
            request.compromiso_cooperativo,
            request.perfil_endeudamiento,
            request.capacidad_ahorro
        ]).reshape(1, -1)

        if model is not None:
            riesgo = 1 - float(model.predict_proba(features)[0][1])
        else:
            score = (
                request.consistencia_ingresos * 0.25 +
                request.responsabilidad_pagos * 0.30 +
                request.compromiso_cooperativo * 0.15 +
                request.capacidad_ahorro * 0.10
            )
            endeudamiento_riesgo = request.perfil_endeudamiento * 0.20 / 100
            riesgo = 1 - (score / 100) + endeudamiento_riesgo
            riesgo = max(0.05, min(0.95, riesgo))

        if riesgo < 0.35:
            decision = 'aprobado'
            factor_texto = 'Riesgo muy bajo'
        elif riesgo < 0.55:
            decision = 'precalificado'
            factor_texto = 'Riesgo moderado-bajo'
        elif riesgo < 0.75:
            decision = 'no_precalificado'
            factor_texto = 'Riesgo moderado-alto'
        else:
            decision = 'rechazado'
            factor_texto = 'Riesgo alto'

        monto_solicitado = request.monto_solicitado or 5000000
        plazo = request.plazo_meses or 24
        monto_recomendado = calcular_monto_recomendado(riesgo, monto_solicitado)

        radar_data = {
            'consistenciaIngresos': request.consistencia_ingresos,
            'responsabilidadPagos': request.responsabilidad_pagos,
            'compromisoCooperativo': request.compromiso_cooperativo,
            'perfilEndeudamiento': request.perfil_endeudamiento,
            'capacidadAhorro': request.capacidad_ahorro,
        }

        radar_ideal = calcular_radar_ideal(radar_data, monto_solicitado, plazo)
        score_perfil = calcular_score_perfil(radar_data)
        criticas, fortalezas = analizar_dimensiones(radar_data)
        recomendaciones = generar_recomendaciones(radar_data, monto_recomendado, plazo)
        explicacion = await explicacion_deepseek(riesgo, radar_data, recomendaciones, decision, monto_solicitado, monto_recomendado, request.nombre)

        return EvaluationResponse(
            decision=decision,
            puntaje_riesgo=round(riesgo, 4),
            monto_recomendado=monto_recomendado,
            radar=radar_data,
            radar_ideal=radar_ideal,
            explicacion=explicacion,
            recomendaciones=recomendaciones,
            factor_riesgo=factor_texto,
            dimensiones_criticas=criticas,
            fortalezas=fortalezas,
            score_perfil=score_perfil
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
