# IA-COOP — Precalificador Crediticio Ético Inteligente

Sistema de precalificación crediticia para cooperativas, impulsado por inteligencia artificial explicable (XAI) vía DeepSeek. Evalúa solicitudes de crédito usando un modelo ML basado en 5 dimensiones del perfil del asociado, con validación de ingresos digitales, servicios públicos y perfil socio-conductual.

---

## Arquitectura

```
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────────┐
│   Next.js 14 App    │────▶│  Python ML Service   │────▶│  DeepSeek API  │
│  (Frontend + API)   │◀────│  (FastAPI + sklearn) │     │   (XAI real)   │
└─────────────────────┘     └──────────────────────┘     └────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│              Appwrite (self-hosted)              │
│  Auth ─ DB ─ Collections:                       │
│  asociados, solicitudes_credito, evaluaciones,  │
│  ingresos_digitales, servicios_publicos,         │
│  cuestionarios_socio_conductuales, configuracion │
└─────────────────────────────────────────────────┘
```

### Componentes

| Módulo | Tecnología | Propósito |
|---|---|---|
| **Frontend** | Next.js 14, Tailwind CSS, shadcn/ui | Interfaz de usuario responsive |
| **API** | Next.js API Routes | Endpoints REST para evaluación y webhooks |
| **ML Service** | FastAPI + scikit-learn (GradientBoosting) | Scoring crediticio con explicaciones DeepSeek |
| **Auth** | Appwrite + Mock Mode | Autenticación de usuarios por roles |
| **XAI** | DeepSeek Chat API | Explicaciones personalizadas en español |

---

## Roles

| Rol | Acceso |
|---|---|
| **Admin** | Dashboard completo, usuarios, config, reportes, todas las solicitudes, ver reportes éticos |
| **Gestor** | Dashboard, solicitudes, aprobar/rechazar, detalle con evaluación y perfil ético |
| **Asociado** | Dashboard, nueva solicitud, perfil con radar, servicios públicos, cuestionario ético |

---

## Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Recharts** (radar chart)
- **Lucide React** (iconos)

### Machine Learning
- **FastAPI** (servicio REST)
- **scikit-learn** (GradientBoosting)
- **NumPy**
- **DeepSeek API** (explicaciones XAI)

### Backend
- **Appwrite 1.x** (self-hosted) — Auth + NoSQL Database

---

## Inicio rápido

### Requisitos
- Node.js 18+
- Python 3.11+
- npm

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd Precalificador\ Crediticio
npm install
```

### 2. Configurar variables de entorno

Crear `.env.local` en la raíz del proyecto con las variables de la sección correspondiente.

Si usas el servicio ML, crear también `ml-service/.env.local`:

```env
DEEPSEEK_API_KEY=sk-tu-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

### 3. Iniciar el frontend

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### 4. Servicio ML (opcional, para scoring real + DeepSeek)

```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

El servicio corre en `http://localhost:8000`. Si no está disponible, el sistema usa evaluación simulada.

### 5. Desarrollo con localtunnel (opcional)

Para probar webhooks de Palenca desde internet:

```bash
npm run dev:tunnel
```

o directamente:

```powershell
.\start-dev.ps1
```

### 6. Usuarios demo

| Email | Rol |
|---|---|
| admin@demo.com | Admin |
| gestor@demo.com | Gestor |
| carlos@demo.com | Asociado |

Cualquier contraseña funciona en modo demo.

---

## Variables de entorno

Crear `.env.local` en la raíz:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Endpoint de Appwrite |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | ID del proyecto Appwrite |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | ID de la base de datos Appwrite |
| `APPWRITE_API_KEY` | API key server-side de Appwrite |
| `DEEPSEEK_API_KEY` | API key DeepSeek para explicaciones XAI |
| `ML_SERVICE_URL` | URL del servicio ML (`http://localhost:8000`) |

---

## Modo desarrollo sin conexión

El proyecto funciona completamente en modo offline activando `USE_MOCK = true` en `src/lib/mock.ts`:

- Autenticación simulada con usuarios demo
- Datos persistidos en localStorage
- Evaluación simulada con algoritmo incorporado
- Todas las colecciones simuladas (servicios, ingresos, cuestionarios)

---

## Evaluación crediticia

### 5 dimensiones del radar

| Dimensión | Peso | Descripción |
|---|---|---|
| Responsabilidad de pagos | 30% | Historial de pagos puntuales |
| Consistencia de ingresos | 25% | Estabilidad y diversidad de ingresos |
| Perfil de endeudamiento | 20% | Relación deudas/ingresos |
| Compromiso cooperativo | 15% | Antigüedad y participación |
| Capacidad de ahorro | 10% | Hábitos de ahorro |

### Resultados

- **Aprobado** — riesgo bajo (< 0.35), crédito recomendado
- **Precalificado** — riesgo moderado (0.35-0.55), requiere revisión
- **No precalificado** — riesgo elevado (0.55-0.75)
- **Rechazado** — riesgo crítico (>= 0.75)

---

## Módulos del asociado

### 📋 Solicitud de crédito
Formulario multi-paso con captura de datos financieros, selección de servicios públicos (hasta 3), conexión a plataformas digitales, y consentimiento informado.

### 💡 Servicios Públicos
Registro de facturas de servicios (agua, luz, gas, internet, teléfono, TV) para fortalecer el perfil crediticio con historial de pagos.

### 🧠 Cuestionario Ético
Evaluación gamificada del perfil socio-conductual del asociado en 5 dimensiones cooperativas: participación democrática, compromiso comunitario, solidaridad, responsabilidad social y transparencia. Genera un perfil (Líder → Observador) visible para el admin en cada solicitud.

### 📊 Radar Decisorio
Visualización radar de las 5 dimensiones con simulación interactiva y perfil ideal recomendado por la IA.

---

## Estructura del proyecto

```
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login / Registro
│   │   ├── api/              # API Routes (evaluate, palenca, solicitudes, admin)
│   │   └── dashboard/
│   │       ├── solicitud/    # Nueva solicitud y detalle con evaluación
│   │       ├── mis-solicitudes/  # Listado del asociado
│   │       ├── mis-servicios/    # Servicios públicos
│   │       ├── cuestionario/     # Cuestionario socio-conductual
│   │       ├── perfil/           # Perfil con radar
│   │       └── admin/            # Admin: solicitudes, usuarios, config, reportes
│   ├── components/
│   │   ├── forms/            # SolicitudForm, ConsentimientoForm
│   │   ├── cuestionario/     # Cuestionario socio-conductual
│   │   ├── servicios/        # Servicios públicos
│   │   ├── palenca/          # Conexión Palenca
│   │   ├── radar/            # Radar chart y simulación
│   │   ├── xai/              # Explicación DeepSeek
│   │   └── ui/               # shadcn/ui primitives
│   └── lib/
│       ├── appwrite/         # Client, DB helpers, collections
│       ├── hooks/            # useAuth, useRadar
│       └── types/            # TypeScript interfaces
├── ml-service/
│   ├── app.py                # API FastAPI + DeepSeek
│   ├── train.py              # Entrenamiento del modelo
│   ├── model.pkl             # Modelo entrenado
│   └── requirements.txt
└── start-dev.ps1             # Script desarrollo con localtunnel
```

---

## Despliegue

### Frontend (Vercel)

```bash
npx vercel --prod
```

### ML Service (Docker)

```bash
cd ml-service
docker build -t ia-coop-ml .
docker run -p 8000:8000 ia-coop-ml
```

---

## Licencia

Uso interno — Cooperativa
