# DOCUMENTACIÓN TÉCNICA Y ESTRATÉGICA
## Precalificador Crediticio Ético Inteligente (IA-COOP)

---

# 1. ANÁLISIS COMPLETO DE LA ARQUITECTURA

## 1.1 Visión General

El proyecto IA-COOP implementa una arquitectura **híbrida de 3 capas** con un frontend Next.js 14, un BaaS (Appwrite) como backend, y un servicio ML independiente en Python/FastAPI. La separación es correcta conceptualmente pero tiene **severos problemas de integración y consistencia** que analizo en detalle.

---

## 1.2 Mapa de Archivos y su Estado

```
ia-coop-precalificador/
├── src/
│   ├── app/                          # ✅ 12 archivos funcionales
│   │   ├── (auth)/login/page.tsx     # ✅ Login básico funcional
│   │   ├── (auth)/registro/page.tsx  # ✅ Registro con selección de rol
│   │   ├── (dashboard)/layout.tsx    # ✅ Sidebar con enrutamiento por rol
│   │   ├── (dashboard)/page.tsx      # ✅ Dashboard simple
│   │   ├── dashboard/admin/
│   │   │   ├── page.tsx             # ✅ Admin page
│   │   │   ├── configuracion/page.tsx # ⚠️ Placeholder sin lógica
│   │   │   ├── reportes/page.tsx     # ⚠️ Placeholder con datos quemados
│   │   │   ├── solicitudes/page.tsx  # ⚠️ Importa RouteGuard inexistente
│   │   │   └── usuarios/page.tsx    # ✅ Gestión de usuarios completa
│   │   ├── dashboard/solicitud/
│   │   │   ├── [id]/page.tsx        # ✅ Vista detalle con Radar + XAI
│   │   │   └── nueva/page.tsx       # ✅ Formulario multi-paso
│   │   ├── dashboard/perfil/page.tsx # ⚠️ Mínimo, solo nombre y email
│   │   ├── api/evaluate/route.ts    # ✅ Proxy a Cloud Function
│   │   ├── api/webhooks/palenca/route.ts # ⚠️ Placeholder sin procesamiento
│   │   ├── layout.tsx               # ✅ Layout raíz
│   │   ├── page.tsx                 # ✅ Redirección auth
│   │   ├── globals.css              # ✅ Estilos Shadcn/ui
│   │   └── globals.d.ts             # ⚠️ Innecesario (Next.js ya tipa CSS)
│   │
│   ├── components/
│   │   ├── ui/ (11 archivos)        # ✅ Shadcn/ui completo y bien implementado
│   │   ├── shared/
│   │   │   └── ProtectedRoute.tsx   # ✅ HOC de protección por rol
│   │   ├── forms/
│   │   │   ├── SolicitudForm.tsx    # ✅ Formulario multi-paso (642 líneas)
│   │   │   └── ConsentimientoForm.tsx # ✅ Gestión de consentimiento granular
│   │   ├── radar/
│   │   │   ├── RadarChart.tsx       # ✅ Visualización Recharts
│   │   │   └── RadarSimulation.tsx  # ✅ Simulador con sliders
│   │   ├── xai/
│   │   │   └── Explanation.tsx      # ✅ Explicación de decisiones
│   │   ├── palenca/                 # ❌ Vacío (debería tener integración)
│   │   └── layout/                  # ❌ Vacío
│   │
│   ├── lib/
│   │   ├── appwrite/
│   │   │   ├── client.ts           # ✅ Cliente Appwrite
│   │   │   ├── db.ts               # ✅ Operaciones CRUD base
│   │   │   └── functions.ts        # ✅ Invocación de Cloud Functions
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # ⚠️ Mezcla lógica de auth con DB
│   │   │   ├── useSolicitud.ts     # ✅ Hook de solicitudes
│   │   │   └── useRadar.ts         # ✅ Hook del radar decisorio
│   │   ├── types/
│   │   │   └── index.ts            # ✅ Tipos completos
│   │   ├── utils/
│   │   │   ├── constants.ts        # ✅ Constantes del sistema
│   │   │   └── format.ts           # ✅ Formateo COP, fecha, %
│   │   └── utils.ts                # ✅ Función cn() de Shadcn
│   │
│   └── styles/                     # ❌ Vacío
│
├── ml-service/
│   ├── app.py                      # ⚠️ Modelo simulado, DeepSeek opcional
│   ├── model.pkl                   # ❌ Binario (no sabemos qué contiene)
│   ├── requirements.txt            # ✅ Dependencias Python
│   ├── data/                       # ❌ Vacío
│   └── models/                     # ❌ Vacío
│
├── funciones/evaluacion_credito/
│   ├── main.py                     # ⚠️ Usa requests HTTP directo
│   ├── requirements.txt            # ✅ Solo requests
│   └── evaluacion_credito.tar.gz   # ✅ Artefacto de deploy
│
├── scripts/
│   ├── setup-appwrite.js           # ✅ Script de inicialización de DB
│   └── .env.example                # ❌ Vacío
│
└── .env.local                      # ⚠️ Contiene claves reales (riesgo de seguridad)
```

---

## 1.3 Fortalezas de la Arquitectura

### ✅ Lo que está bien:

| Aspecto | Evaluación |
|---------|-----------|
| **Separación frontend/backend/ML** | Correcta. 3 servicios independientes que pueden escalar por separado |
| **Uso de Next.js App Router** | Apropiado. SSR para SEO (reportes públicos), grupos de ruta `(auth)` y `(dashboard)` bien usados |
| **Shadcn/ui + Tailwind** | Excelente base de componentes. Código limpio, accesible y personalizable |
| **Formulario multi-paso con Zod** | Validación robusta en frontend, esquema centralizado |
| **Radar Decisorio** | Visualización efectiva de 5 dimensiones crediticias |
| **Mecanismo de consentimiento granular** | El usuario elige qué datos compartir (servicios básicos, economía digital, etc.) |
| **Tipos TypeScript completos** | `Asociado`, `Solicitud`, `Evaluacion`, `RadarData`, `Consentimiento` bien definidos |
| **Cloud Function como orquestador** | La función de Appwrite centraliza la lógica de evaluación |

### ❌ Lo que está mal:

#### Problemas CRÍTICOS:

1. **RouteGuard.tsx no existe** pero se importa en `admin/solicitudes/page.tsx:4`. El proyecto no compila.

2. **Modelo ML no entrenado**: `model.pkl` existe como binario pero no hay código de entrenamiento, datos históricos ni pipeline de ML. El sistema usa un **modelo simulado** (regla lineal con pesos fijos: 0.3, 0.3, 0.15, 0.15, 0.1). No hay IA real.

3. **DeepSeek API Key expuesta**: `sk-53dd7b237c854688aaf4c82f3956c9c0` está en `.env.local` y potencialmente en el repo.

4. **Flujo de datos incompleto**: El formulario calcula dimensiones del radar en el frontend (`SolicitudForm.tsx:177-211`) pero estas **nunca se persisten en el backend** antes de la evaluación. La Cloud Function lee los valores por defecto (50) del asociado.

5. **Palenca no implementado**: El directorio `components/palenca/` está vacío, el webhook es un placeholder, y no hay integración real con APIs de economía gig.

#### Problemas IMPORTANTES:

6. **`as any` en SolicitudForm.tsx:212-213**: El metadata se pasa como `any` para evitar TypeScript, lo que anula toda seguridad de tipos.

7. **useAuth.ts mezcla responsabilidades**: El hook hace tanto auth como consultas a DB. Debería separarse.

8. **.env.local con claves reales**: La API Key de Appwrite tiene permisos de administrador. Si se filtra, compromete toda la base de datos.

9. **Sin logging estructurado**: Solo `console.log` en frontend, `context.log` en Cloud Function. Sin monitoreo.

10. **Sin pruebas**: No hay tests unitarios, de integración ni e2e.

---

# 2. JUSTIFICACIÓN DE CADA DECISIÓN TÉCNICA

## 2.1 Next.js 14 con App Router

| Aspecto | Decisión | Análisis |
|---------|----------|----------|
| **Framework** | Next.js 14 (App Router) | **Acertado.** El App Router permite layouts anidados, Server Components para datos públicos, y la carpeta `api/` para API Routes proxy. Sin embargo, el proyecto actualmente usa `"use client"` en casi todas las páginas, perdiendo los beneficios de SSR. |
| **Ruteo por grupos** | `(auth)` y `(dashboard)` | **Correcto.** Permite layouts separados sin afectar URLs. El grupo `(dashboard)/admin/` para roles es un buen patrón. |
| **Razón técnica vs necesidad real** | La app podría ser SPA pura (solo un asociado llena formularios), pero Next.js da flexibilidad futura para reportes públicos con SEO. **Decisión correcta a futuro, sobreingeniería para MVP.** |

### Recomendación:
Migrar páginas informativas a Server Components. Solo formularios e interactivos deben ser client-side.

## 2.2 Appwrite como BaaS

| Aspecto | Decisión | Análisis |
|---------|----------|----------|
| **Backend** | Appwrite (self-hosted en `appwrite.muxiistudio.com`) | **Justificado.** Autenticación, DB NoSQL, Functions y Storage en un solo producto. Ideal para startups con equipo pequeño. |
| **Database NoSQL** | Colecciones separadas con relaciones por ID | **Adecuado.** Las colecciones `asociados`, `solicitudes_credito`, `evaluaciones`, `ingresos_digitales`, `consentimientos` están bien diseñadas. |
| **Cloud Functions** | Orquestación de evaluación crediticia | **Bien.** La función `evaluacion_credito` centraliza: leer solicitud → obtener asociado → llamar ML → guardar resultado → actualizar estado. |
| **Problema** | La función hace HTTP directo con `requests` en lugar de usar el SDK de Appwrite Server | **Riesgo.** Más verbose, menos seguro, sin tipado. Debería usar `appwrite` SDK Python. |

### Alternativas consideradas:
- **Supabase**: Mejor para SQL, pero Appwrite gana en Cloud Functions integradas.
- **Firebase**: Vendor lock-in, no hay self-hosted.
- **Backend propio**: Más control pero exponencialmente más trabajo.

**Decisión acertada para el contexto.**

## 2.3 Servicio ML Separado (FastAPI + Python)

| Aspecto | Decisión | Análisis |
|---------|----------|----------|
| **Separación** | Servicio independiente en Python/FastAPI | **Correcta.** El ML necesita Python (scikit-learn, XGBoost, TensorFlow, SHAP). Separarlo permite escalar independientemente del frontend. |
| **API** | Endpoint POST `/evaluate` con 5 dimensiones | **Bien diseñado.** Entrada clara, salida completa (decisión, riesgo, radar, explicación, recomendaciones). |
| **Modelo** | Carga de `model.pkl` con fallback simulado | **Crítico.** Sin datos históricos ni pipeline de entrenamiento, el sistema no es realmente IA. Es una calculadora de riesgo lineal. |
| **DeepSeek** | Explicabilidad vía API de DeepSeek | **Bien intencionado.** La explicación en lenguaje natural es clave para XAI. Pero depende de API externa (latencia, costo, disponibilidad). |

### Lo que falta:
- Pipeline de entrenamiento con datos históricos
- Validación/cross-validation del modelo
- Monitoreo de deriva del modelo
- A/B testing de decisiones
- SHAP integration (está en `requirements.txt` pero no se usa en `app.py`)

## 2.4 Shadcn/ui + Tailwind CSS

| Aspecto | Decisión | Análisis |
|---------|----------|----------|
| **Sistema de diseño** | Shadcn/ui (Radix primitives + Tailwind) | **Excelente.** Componentes accesibles, personalizables, sin dependencia runtime. |
| **Componentes** | 11 componentes UI implementados | **Completos.** Button, Card, Input, Label, Select, Slider, Switch, Badge, Skeleton, Progress, Dialog. |
| **Radar Chart** | Recharts + componentes personalizados | **Correcto.** Recharts es la librería de gráficos más madura para React. |

## 2.5 Zod + React Hook Form

| Aspecto | Decisión | Análisis |
|---------|----------|----------|
| **Validación** | Zod schema en frontend | **Acertado.** Validación tipada, mensajes de error en español, campos condicionales. |
| **Formulario** | react-hook-form con resolver Zod | **Mejor práctica.** Rendimiento, menos renders, validación asíncrona. |
| **Campos dinámicos** | Deudas y ahorro condicionales con Framer Motion | **Bien implementado.** Animaciones suaves, estados consistentes. |

---

# 3. DIAGRAMA DETALLADO DEL FLUJO DE DATOS

## 3.1 Flujo Actual (con bugs)

```
ASOCIADO                     FRONTEND (Next.js)              APPWRITE                    ML SERVICE
    │                              │                            │                            │
    │  1. Login                     │                            │                            │
    │─────────────────────────────>│                            │                            │
    │                              │  2. Verificar sesión       │                            │
    │                              │───────────────────────────>│                            │
    │                              │<───────────────────────────│                            │
    │                              │                            │                            │
    │  3. Llena formulario         │                            │                            │
    │─────────────────────────────>│                            │                            │
    │                              │  4. ¡BUG! Calcula radar    │                            │
    │                              │     en frontend pero NO    │                            │
    │                              │     persiste dimensiones   │                            │
    │                              │                            │                            │
    │                              │  5. Crea solicitud         │                            │
    │                              │───────────────────────────>│                            │
    │                              │  (sin dimensiones radar)   │                            │
    │                              │                            │                            │
    │                              │  6. Llama API Route        │                            │
    │                              │  POST /api/evaluate        │                            │
    │                              │                            │                            │
    │                              │  7. Invoca Cloud Function  │                            │
    │                              │───────────────────────────>│                            │
    │                              │                            │                            │
    │                              │                            │  8. Obtiene solicitud       │
    │                              │                            │───────────────────────────>│
    │                              │                            │<───────────────────────────│
    │                              │                            │                            │
    │                              │                            │  9. Obtiene asociado       │
    │                              │                            │  ¡Lee consistencia: 50!    │
    │                              │                            │  (default, no los          │
    │                              │                            │   calculados en paso 4)    │
    │                              │                            │                            │
    │                              │                            │  10. POST /evaluate        │
    │                              │                            │─────────────────────────────>
    │                              │                            │                            │
    │                              │                            │                            │  11. Modelo simulado
    │                              │                            │                            │  (sin IA real)
    │                              │                            │                            │
    │                              │                            │<─────────────────────────────
    │                              │                            │                            │
    │                              │                            │  12. Guarda evaluación     │
    │                              │                            │  13. Actualiza solicitud   │
    │                              │                            │                            │
    │                              │<───────────────────────────│                            │
    │                              │                            │                            │
    │  14. Ve resultado            │                            │                            │
    │     (Radar + XAI)            │                            │                            │
    │<─────────────────────────────│                            │                            │
```

## 3.2 Flujo CORREGIDO Propuesto

```
ASOCIADO                    FRONTEND                    APPWRITE                    ML SERVICE
    │                           │                           │                           │
    │  1. Login                 │                           │                           │
    │──────────────────────────>│                           │                           │
    │                           │  2. Auth + sync user      │                           │
    │                           │─────────────────────────>│                           │
    │                           │                           │                           │
    │  3. Consentimiento        │                           │                           │
    │──────────────────────────>│                           │                           │
    │                           │  4. Guardar consentimiento│                           │
    │                           │─────────────────────────>│                           │
    │                           │                           │                           │
    │  5. Conectar Palenca      │                           │                           │
    │──────────────────────────>│                           │                           │
    │                           │  6. Iniciar flujo Palenca │                           │
    │                           │─────────────────────────>│                           │
    │                           │<─────────────────────────│                           │
    │                           │  7. Webhook con datos    │                           │
    │                           │<─────────────────────────│                           │
    │                           │                           │                           │
    │  8. Llena formulario      │                           │                           │
    │──────────────────────────>│                           │                           │
    │                           │  9. Validar con Zod       │                           │
    │                           │  10. Calcular dimensiones │                           │
    │                           │  11. Guardar solicitud    │                           │
    │                           │      CON dimensiones      │                           │
    │                           │─────────────────────────>│                           │
    │                           │                           │                           │
    │                           │  12. POST /api/evaluate   │                           │
    │                           │─────────────────────────>│                           │
    │                           │                           │                           │
    │                           │  13. Llamar Cloud Func    │                           │
    │                           │─────────────────────────>│                           │
    │                           │                           │ 14. Leer solicitud       │
    │                           │                           │     (con dimensiones)    │
    │                           │                           │                           │
    │                           │                           │ 15. POST /evaluate       │
    │                           │                           │──────────────────────────>
    │                           │                           │                           │
    │                           │                           │                           │ 16. Modelo real
    │                           │                           │                           │  (XGBoost con
    │                           │                           │                           │   SHAP explicación)
    │                           │                           │                           │
    │                           │                           │<──────────────────────────│
    │                           │                           │                           │
    │                           │                           │ 17. Guardar en           │
    │                           │                           │     evaluaciones         │
    │                           │                           │ 18. Actualizar solicitud │
    │                           │                           │                           │
    │                           │<─────────────────────────│                           │
    │                           │                           │                           │
    │  19. Render:              │                           │                           │
    │  • RadarChart             │                           │                           │
    │  • Explanation (XAI)      │                           │                           │
    │  • Recomendaciones        │                           │                           │
    │<──────────────────────────│                           │                           │
```

---

# 4. PLAN DE MEJORA Y OPTIMIZACIÓN

## 4.1 Prioridades por Urgencia (MoSCoW)

### 🔴 MUST HAVE (Semana 1-2)

| # | Tarea | Archivos afectados | Impacto |
|---|-------|-------------------|---------|
| 1 | **Crear RouteGuard.tsx** o cambiar import a `ProtectedRoute` | `admin/solicitudes/page.tsx` | Bug blocker |
| 2 | **Persistir dimensiones del radar** en la solicitud | `SolicitudForm.tsx`, `db.ts`, `types/index.ts` | Bug crítico |
| 3 | **Pipeline de entrenamiento ML** con datos sintéticos | Nuevo archivo `ml-service/train.py` | Sistema sin IA real |
| 4 | **Remover claves del .env.local** y usar variables de entorno seguras | `.env.local`, CI/CD | Seguridad |

### 🟡 SHOULD HAVE (Semana 3-4)

| # | Tarea | Archivos afectados | Impacto |
|---|-------|-------------------|---------|
| 5 | **Implementar integración Palenca** | `components/palenca/`, webhook route | Funcionalidad clave |
| 6 | **Agregar SHAP real** al ML service | `ml-service/app.py` | XAI real |
| 7 | **Refactorizar useAuth** separando auth de DB | `lib/hooks/useAuth.ts` | Mantenibilidad |
| 8 | **Agregar logging estructurado** | Cloud Function, ml-service, frontend | Observabilidad |

### 🟢 COULD HAVE (Semana 5-6)

| # | Tarea | Impacto |
|---|-------|---------|
| 9 | Tests unitarios (Vitest + React Testing Library) | Calidad |
| 10 | Migrar a Server Components páginas estáticas | Performance |
| 11 | Dashboard de reportes con datos reales | Transparencia |
| 12 | Simulador de escenarios crediticios | UX |

### ⚪ WON'T HAVE (ahora)

| # | Tarea | Razón |
|---|-------|-------|
| 13 | App mobile nativa | Web es suficiente para MVP |
| 14 | Multi-cooperativa | Escalabilidad futura |
| 15 | On-chain credit scoring | Blockchain no agrega valor aquí |

---

## 4.2 Plan de Implementación Detallado

### 🔧 1. Corrección Ruta Crítica

**Problema:** `RouteGuard` no existe.
**Solución:** Crear `RouteGuard.tsx` como alias de `ProtectedRoute`:

```typescript
export { ProtectedRoute as RouteGuard } from "./ProtectedRoute";
```

O mejor: cambiar el import en `admin/solicitudes/page.tsx` a `ProtectedRoute`.

### 🔧 2. Pipeline de Entrenamiento ML

**Estado actual:** Modelo simulado con pesos fijos.
**Solución:** Crear `ml-service/train.py` que:

```python
# Pseudocódigo del pipeline necesario
1. Generar datos sintéticos realistas (n_samples=10000)
   - 5 dimensiones [0-100] con correlaciones realistas
   - Variable objetivo basada en reglas de negocio cooperativas
2. Split train/test (80/20)
3. Entrenar XGBoost con early stopping
4. Calcular SHAP values para explicabilidad
5. Guardar modelo + preprocesador
6. Métricas: AUC-ROC, precisión, recall, fairness metrics
```

**Requerimientos de datos sintéticos:**
- 40% de solicitantes con ingresos de economía gig (simular Palenca)
- 30% con historial cooperativo > 12 meses
- Distribución realista de montos solicitados ($500K - $20M COP)
- Tasa de aprobación esperada: ~60% (cooperativa ética)

### 🔧 3. Corrección del Flujo de Datos

En `SolicitudForm.tsx`, las dimensiones del radar calculadas deben guardarse en la colección `asociados` (no solo en metadata):

```typescript
// En onSubmit, después de crear solicitud:
await databases.updateDocument(
  DB.id,
  DB.collections.ASOCIADOS,
  user.$id,
  {
    consistenciaIngresos,
    responsabilidadPagos,
    compromisoCooperativo,
    perfilEndeudamiento,
    capacidadAhorro,
  }
);
```

### 🔧 4. Integración Palenca Real

```typescript
// components/palenca/PalencaButton.tsx
1. Inicializar Palenca Link con public key
2. On success: recibir accountId + platform
3. POST a API Route /api/palenca/connect
4. API Route llama a Palenca API server-side (con secret key)
5. Guardar en colección `ingresos_digitales`
6. Actualizar dimensiones del radar (consistenciaIngresos se recalcula)
```

---

## 4.3 Mejoras de Seguridad

| # | Acción | Prioridad |
|---|--------|-----------|
| 1 | **Rotar todas las claves** (Appwrite API key, DeepSeek, Palenca) | 🔴 Inmediata |
| 2 | Agregar `.env.local` a `.gitignore` (verificar que no esté en repo) | 🔴 Inmediata |
| 3 | Implementar rate limiting en API Routes | 🟡 Semana 2 |
| 4 | Validación server-side con Zod en API Routes | 🟡 Semana 2 |
| 5 | Encriptar datos sensibles en DB (Appwrite solo cifra en tránsito) | 🟢 Semana 4 |
| 6 | Auditoría de accesos (quién vio qué solicitud) | 🟢 Semana 5 |

---

# 5. RECOMENDACIONES PARA IMPLEMENTACIÓN ÉTICA Y SOSTENIBLE

## 5.1 Principios Cooperativos vs. Implementación Actual

| Principio Cooperativo | Implementación Actual | Brecha |
|----------------------|---------------------|--------|
| **Adhesión voluntaria** | Registro abierto con roles | ✅ |
| **Gestión democrática** | Roles admin/gestor/asociado | ⚠️ No hay votación ni asambleas digitales |
| **Participación económica** | No implementado | ❌ Los asociados no aportan capital |
| **Autonomía e independencia** | Appwrite self-hosted | ✅ |
| **Educación, formación e información** | XAI con DeepSeek | ⚠️ Explicación sí, educación financiera no |
| **Cooperación entre cooperativas** | No implementado | ❌ |
| **Interés por la comunidad** | Crédito a no bancarizados | ✅ Misión alineada |

## 5.2 Riesgos Éticos Detectados

### 🔴 Riesgo Alto: Sesgo Algorítmico
- **Problema:** El modelo simulado da el mismo peso a todos. Con datos reales, podría sesgar contra:
  - Trabajadores de economía gig (menor "consistencia de ingresos")
  - Mujeres (menor participación en asambleas)
  - Zonas rurales (menor acceso a servicios digitales)
- **Mitigación:** 
  - Implementar `fairness_metrics` en el pipeline (demographic parity, equal opportunity)
  - Auditoría trimestral de sesgos con reporte público
  - Umbral de aprobación diferenciado por contexto (no por demografía)

### 🟡 Riesgo Medio: Opacidad en la Explicación
- **Problema:** DeepSeek puede generar explicaciones inconsistentes o incorrectas (alucinaciones)
- **Mitigación:**
  - La explicación de DeepSeek debe ser **post-hoc** de los SHAP values, no al revés
  - Validar que la explicación coincida con las features reales
  - Mostrar siempre "factores que más pesaron" (top 3 SHAP) junto al texto generado

### 🟡 Riesgo Medio: Consentimiento no Revocable
- **Problema:** El formulario de consentimiento permite otorgar pero no hay UI para revocar
- **Solución:** Agregar botón "Revocar consentimiento" que elimine datos o los anonimice

### 🟢 Riesgo Bajo: Dependencia Tecnológica
- **Problema:** Proveedores externos (Appwrite, DeepSeek, Palenca) pueden cambiar términos
- **Mitigación:** Arquitectura con adaptadores/interfaces para cada servicio externo

## 5.3 Framework de Auditoría de Sesgos Automatizada

```python
# ml-service/audit.py (recomendado)
def audit_fairness(model, test_data, sensitive_features):
    """
    Auditoría automática post-entrenamiento.
    """
    results = {
        'demographic_parity': check_demographic_parity(model, test_data),
        'equal_opportunity': check_equal_opportunity(model, test_data),
        'disparate_impact': check_disparate_impact(model, test_data, sensitive_features),
        'shap_fairness': analyze_shap_by_group(model, test_data, sensitive_features),
    }
    return generate_report(results)
```

**Frecuencia:** Cada vez que se re-entrena el modelo + trimestralmente.

## 5.4 Sostenibilidad del Sistema

### Técnica
- **CI/CD**: GitHub Actions para test + deploy de Cloud Function y ML service
- **Monitoreo**: Prometheus + Grafana para ML service (latencia, throughput, drift)
- **Costos**: Appwrite self-hosted (servidor propio), DeepSeek API (pago por uso), Palenca (plan cooperativo)

### Organizacional
- **Capacitación**: El XAI debe educar al asociado, no solo informar. Agregar tips financieros en cada explicación.
- **Gobernanza**: Comité de ética con representantes de asociados que revise decisiones masivas.
- **Transparencia radical**: Publicar métricas de aprobación por grupo demográfico en el dashboard de reportes.

### Financiera
- **Modelo de ingresos**: Comisión por crédito originado (1-2%), no por evaluación.
- **Gratuidad**: La precalificación debe ser gratuita para el asociado. Cobrar solo si se origina el crédito.
- **Fondo de resiliencia**: 5% de cada crédito aprobado a un fondo para cubrir impagos por sesgos no detectados.

---

# 6. CONCLUSIONES FINALES

## Resumen Ejecutivo

| Dimensión | Estado | Acción Requerida |
|-----------|--------|-----------------|
| **Arquitectura** | ✅ Sólida en concepto, ❌ con bugs en implementación | Corregir flujo de datos (prioridad máxima) |
| **Frontend** | ✅ Bien estructurado, formulario robusto | Agregar RouteGuard faltante |
| **Backend (Appwrite)** | ✅ Colecciones bien diseñadas | Mejorar Cloud Function con SDK |
| **IA/ML** | ❌ No es IA real, es simulación | Pipeline de entrenamiento completo |
| **XAI** | ⚠️ Depende de DeepSeek externo | SHAP + DeepSeek como complemento |
| **Seguridad** | ❌ Claves expuestas | Rotación inmediata |
| **Ética** | ✅ Marco conceptual presente | Implementar auditoría de sesgos |
| **Palenca** | ❌ No implementado | Desarrollo pendiente |
| **Testing** | ❌ Cero pruebas | Vitest + pytest |

## Decisión Estratégica Clave

**¿MVP funcional o sistema ético desde el día 1?**

Recomiendo: **MVP funcional con guardarraíles éticos.** No lanzar sin:
1. Pipeline de ML real (no simulado)
2. Auditoría de sesgos automatizada
3. Consentimiento revocable
4. Explicación validada (SHAP + DeepSeek con template)

El costo de lanzar un sistema de scoring "fake" o sesgado es reputacionalmente devastador para una cooperativa. Mejor lanzar en 3 meses con 100 usuarios reales en beta cerrada que lanzar hoy con un modelo simulado.

---

*Documento generado el 30 de junio de 2026*
*Arquitecto: IA-COOP Technical Analysis*
*Versión: 1.0*
