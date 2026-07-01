# ml-service/app.py
import os
import json
import pickle
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv('.env.local')

app = FastAPI(title="IA-COOP ML Service", version="1.0.0")

# ============================================
# CONFIGURACIÓN
# ============================================
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_API_URL = os.getenv('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1/chat/completions')
DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')

# ============================================
# MODELOS DE DATOS
# ============================================
class EvaluationRequest(BaseModel):
    consistencia_ingresos: float
    responsabilidad_pagos: float
    compromiso_cooperativo: float
    perfil_endeudamiento: float
    capacidad_ahorro: float
    monto_solicitado: Optional[float] = None
    plazo_meses: Optional[int] = None

class EvaluationResponse(BaseModel):
    decision: str
    puntaje_riesgo: float
    monto_recomendado: float
    radar: Dict[str, float]
    explicacion: str
    recomendaciones: List[str]

# ============================================
# CARGA DE MODELO
# ============================================
def load_model():
    try:
        with open('model.pkl', 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        print("⚠️ Modelo no encontrado. Usando modelo simulado.")
        return None

model = load_model()

# ============================================
# FUNCIONES AUXILIARES
# ============================================
def calcular_monto_recomendado(riesgo: float, monto_solicitado: float = 5000000) -> float:
    multiplicador = max(0.3, 1 - riesgo)
    monto = monto_solicitado * multiplicador
    return round(monto / 100000) * 100000

def generar_recomendaciones(radar: Dict[str, float]) -> List[str]:
    recomendaciones = []
    if radar.get('consistenciaIngresos', 0) < 40:
        recomendaciones.append("📊 Diversifica tus fuentes de ingreso")
    if radar.get('responsabilidadPagos', 0) < 40:
        recomendaciones.append("✅ Mejora tu historial de pagos")
    if radar.get('compromisoCooperativo', 0) < 40:
        recomendaciones.append("🤝 Participa más en la cooperativa")
    if radar.get('perfilEndeudamiento', 0) < 40:
        recomendaciones.append("⚖️ Reduce tu nivel de endeudamiento")
    if radar.get('capacidadAhorro', 0) < 40:
        recomendaciones.append("💰 Abre un plan de ahorro programado")
    if not recomendaciones:
        recomendaciones.append("🌟 Excelente perfil, sigue así")
    return recomendaciones

async def generar_explicacion_con_deepseek(riesgo: float, radar: Dict[str, float], recomendaciones: List[str]) -> str:
    if not DEEPSEEK_API_KEY:
        return f"Perfil con riesgo de {riesgo*100:.0f}%. {'Aprobado' if riesgo < 0.4 else 'No aprobado'}."

    prompt = f"""
Eres asesor financiero. Evalúa este perfil:
- Riesgo: {riesgo*100:.0f}%
- Ingresos: {radar['consistenciaIngresos']:.0f}/100
- Pagos: {radar['responsabilidadPagos']:.0f}/100
- Cooperativa: {radar['compromisoCooperativo']:.0f}/100
- Endeudamiento: {radar['perfilEndeudamiento']:.0f}/100
- Ahorro: {radar['capacidadAhorro']:.0f}/100

Decisión: {'Aprobado' if riesgo < 0.4 else 'No aprobado'}

Genera una explicación clara y empática en español (máx 100 palabras).
"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers={'Authorization': f'Bearer {DEEPSEEK_API_KEY}', 'Content-Type': 'application/json'},
                json={'model': DEEPSEEK_MODEL, 'messages': [{'role': 'user', 'content': prompt}], 'temperature': 0.3},
                timeout=30.0
            )
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
    except Exception as e:
        print(f"❌ Error DeepSeek: {e}")
    return f"Perfil con riesgo de {riesgo*100:.0f}%. {'✅ Aprobado' if riesgo < 0.4 else '❌ No aprobado'}."

# ============================================
# ENDPOINTS
# ============================================
@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

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
            riesgo = float(model.predict_proba(features)[0][1])
        else:
            riesgo = 1 - (request.consistencia_ingresos * 0.3 + 
                          request.responsabilidad_pagos * 0.3 +
                          request.compromiso_cooperativo * 0.15 +
                          request.capacidad_ahorro * 0.15 +
                          request.perfil_endeudamiento * 0.1) / 100
            riesgo = max(0.1, min(0.9, riesgo))

        decision = 'precalificado' if riesgo < 0.4 else 'no_precalificado'
        monto_recomendado = calcular_monto_recomendado(riesgo, request.monto_solicitado or 5000000)

        radar_data = {
            'consistenciaIngresos': request.consistencia_ingresos,
            'responsabilidadPagos': request.responsabilidad_pagos,
            'compromisoCooperativo': request.compromiso_cooperativo,
            'perfilEndeudamiento': request.perfil_endeudamiento,
            'capacidadAhorro': request.capacidad_ahorro,
        }

        recomendaciones = generar_recomendaciones(radar_data)
        explicacion = await generar_explicacion_con_deepseek(riesgo, radar_data, recomendaciones)

        return EvaluationResponse(
            decision=decision,
            puntaje_riesgo=riesgo,
            monto_recomendado=monto_recomendado,
            radar=radar_data,
            explicacion=explicacion,
            recomendaciones=recomendaciones
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)