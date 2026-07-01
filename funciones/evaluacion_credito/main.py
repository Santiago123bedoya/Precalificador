import os
import json
import requests
from datetime import datetime

def main(context):
    try:
        body = json.loads(context.req.body)
        solicitud_id = body.get('solicitudId')
        
        context.log(f'📝 Evaluando solicitud: {solicitud_id}')
        
        endpoint = os.environ.get('APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1')
        project_id = os.environ.get('APPWRITE_PROJECT_ID')
        api_key = os.environ.get('APPWRITE_API_KEY')
        database_id = os.environ.get('DATABASE_ID')
        
        headers = {
            'X-Appwrite-Project': project_id,
            'X-Appwrite-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        solicitud_url = f"{endpoint}/databases/{database_id}/collections/solicitudes_credito/documents/{solicitud_id}"
        solicitud_resp = requests.get(solicitud_url, headers=headers)
        solicitud_resp.raise_for_status()
        solicitud = solicitud_resp.json()
        context.log(f'✅ Solicitud encontrada: {solicitud["$id"]}')
        
        asociado_id = solicitud['asociadoId']
        asociado_url = f"{endpoint}/databases/{database_id}/collections/asociados/documents/{asociado_id}"
        asociado_resp = requests.get(asociado_url, headers=headers)
        asociado_resp.raise_for_status()
        asociado = asociado_resp.json()
        context.log(f'✅ Asociado encontrado: {asociado.get("nombre", "Sin nombre")}')
        
        ml_service_url = os.environ.get('ML_SERVICE_URL', 'http://localhost:8000')
        
        ml_payload = {
            'consistencia_ingresos': asociado.get('consistenciaIngresos', 50),
            'responsabilidad_pagos': asociado.get('responsabilidadPagos', 50),
            'compromiso_cooperativo': asociado.get('compromisoCooperativo', 50),
            'perfil_endeudamiento': asociado.get('perfilEndeudamiento', 50),
            'capacidad_ahorro': asociado.get('capacidadAhorro', 50),
            'monto_solicitado': solicitud.get('montoSolicitado', 5000000),
            'plazo_meses': solicitud.get('plazoMeses', 12)
        }
        
        ml_response = requests.post(
            f"{ml_service_url}/evaluate",
            json=ml_payload,
            timeout=30
        )
        ml_response.raise_for_status()
        ml_result = ml_response.json()
        context.log(f'✅ Evaluación completada: {ml_result["decision"]}')
        
        evaluacion_data = {
            'solicitudId': solicitud_id,
            'asociadoId': asociado_id,
            'fechaEvaluacion': datetime.now().isoformat(),
            'puntajeRiesgo': ml_result['puntaje_riesgo'],
            'consistenciaIngresos': ml_result['radar']['consistenciaIngresos'],
            'responsabilidadPagos': ml_result['radar']['responsabilidadPagos'],
            'compromisoCooperativo': ml_result['radar']['compromisoCooperativo'],
            'perfilEndeudamiento': ml_result['radar']['perfilEndeudamiento'],
            'capacidadAhorro': ml_result['radar']['capacidadAhorro'],
            'decision': ml_result['decision'],
            'explicacionResumen': ml_result['explicacion'],
            'montoRecomendado': ml_result['monto_recomendado']
        }
        
        evaluacion_url = f"{endpoint}/databases/{database_id}/collections/evaluaciones/documents"
        evaluacion_resp = requests.post(
            evaluacion_url,
            headers=headers,
            json={
                'documentId': 'unique()',
                'data': evaluacion_data
            }
        )
        evaluacion_resp.raise_for_status()
        evaluacion = evaluacion_resp.json()
        context.log(f'✅ Evaluación guardada: {evaluacion["$id"]}')
        
        update_data = {
            'estado': 'precalificado' if ml_result['decision'] == 'precalificado' else 'rechazado'
        }
        
        update_url = f"{endpoint}/databases/{database_id}/collections/solicitudes_credito/documents/{solicitud_id}"
        update_resp = requests.patch(
            update_url,
            headers=headers,
            json={'data': update_data}
        )
        update_resp.raise_for_status()
        context.log(f'✅ Solicitud actualizada: {update_data["estado"]}')
        
        return context.res.json({
            'success': True,
            'evaluationId': evaluacion['$id'],
            'decision': ml_result['decision'],
            'montoRecomendado': ml_result['monto_recomendado'],
            'explicacion': ml_result['explicacion']
        })
        
    except Exception as err:
        context.error(f'❌ Error: {str(err)}')
        return context.res.json({
            'success': False,
            'error': str(err)
        }, status=500)