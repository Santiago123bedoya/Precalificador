# IA-COOP — Precalificador Crediticio Ético Inteligente

Sistema de precalificación crediticia para cooperativas, impulsado por inteligencia artificial explicable (XAI). Evalúa solicitudes de crédito usando un modelo ML basado en 5 dimensiones del perfil del asociado, con conectividad opcional a plataformas de ingresos digitales vía Palenca.

---

## Arquitectura

```
┌─────────────────────┐     ┌──────────────────────┐
│   Next.js 14 App    │────▶│  Python ML Service   │
│  (Frontend + API)   │◀────│  (FastAPI + sklearn) │
└─────────────────────┘     └──────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌──────────────────────┐
│   Appwrite (opcional)│    │   Palenca API         │
│  (Auth + DB cloud)  │    │  (Ingresos digitales) │
└─────────────────────┘     └──────────────────────┘
```

### Componentes

| Módulo | Tecnología | Propósito |
|---|---|---|
| **Frontend** | Next.js 14, Tailwind CSS, shadcn/ui | Interfaz de usuario responsive |
| **API** | Next.js API Routes | Endpoints REST para evaluación y webhooks |
| **ML Service** | FastAPI + scikit-learn (RandomForest) | Scoring crediticio y explicaciones |
| **Auth** | Appwrite + Mock Mode | Autenticación de usuarios por roles |
| **Ingresos** | Palenca API | Conexión a plataformas digitales (Uber, Rappi, etc.) |

---

## Roles

| Rol | Acceso |
|---|---|
| **Admin** | Dashboard completo, usuarios, config, reportes, todas las solicitudes |
| **Gestor** | Dashboard, solicitudes, aprobar/rechazar, detalle con evaluación |
| **Asociado** | Dashboard, nueva solicitud, perfil con radar |

---

## Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Framer Motion** (animaciones)
- **Recharts** (gráficos)
- **Lucide React** (iconos)

### Machine Learning
- **FastAPI** (servicio REST)
- **scikit-learn** (RandomForestClassifier)
- **NumPy / Pandas**

### Integraciones
- **Palenca** — conexión a plataformas de ingresos
- **Appwrite** — autenticación y base de datos (opcional, con mock mode)

---

## Inicio rápido

### Requisitos
- Node.js 18+
- Python 3.11+
- npm

### 1. Frontend

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### 2. Servicio ML (opcional, para scoring real)

```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

El servicio corre en `http://localhost:8000`. Si no está disponible, el sistema usa evaluación simulada.

### 3. Usuarios demo

| Email | Rol |
|---|---|
| admin@demo.com | Admin |
| gestor@demo.com | Gestor |
| carlos@demo.com | Asociado |

Cualquier contraseña funciona en modo demo.

---

## Variables de entorno

Crear `.env.local` en la raíz (ver `.env.example`):

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Endpoint de Appwrite |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | ID del proyecto Appwrite |
| `NEXT_PUBLIC_PALENCA_PUBLIC_KEY` | API key pública de Palenca |
| `NEXT_PUBLIC_PALENCA_WIDGET_ID` | ID del widget Palenca |
| `DEEPSEEK_API_KEY` | API key DeepSeek para explicaciones |

---

## Modo desarrollo sin conexión

El proyecto funciona completamente en modo offline activando `USE_MOCK = true` en `src/lib/mock.ts`:

- Autenticación simulada con usuarios demo
- Datos persistidos en localStorage
- Evaluación simulada con el algoritmo incorporado
- Conexiones Palenca simuladas con datos de prueba

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

- **Aprobado** — riesgo bajo, crédito recomendado
- **Precalificado** — riesgo moderado, requiere revisión
- **No precalificado** — riesgo elevado
- **Rechazado** — riesgo crítico

---

## Estructura del proyecto

```
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # Login / Registro
│   │   ├── api/              # API Routes
│   │   └── dashboard/        # Dashboard protegido
│   ├── components/
│   │   ├── forms/            # Formularios de solicitud
│   │   ├── palenca/          # Widget de conexión Palenca
│   │   ├── radar/            # Radar chart y simulación
│   │   ├── shared/           # Route guards
│   │   ├── ui/               # shadcn/ui primitives
│   │   └── xai/              # Explicabilidad
│   └── lib/
│       ├── appwrite/         # Client y helpers de DB
│       ├── hooks/            # Custom hooks (auth, radar, solicitud)
│       └── types/            # TypeScript types
├── ml-service/               # Servicio ML en Python
│   ├── app.py                # API FastAPI
│   ├── model.pkl             # Modelo entrenado
│   ├── Dockerfile            # Para despliegue
│   └── requirements.txt
├── funciones/                # Appwrite Functions (Python)
│   └── evaluacion_credito/
│       ├── main.py
│       └── requirements.txt
└── requirements.txt          # Python raíz
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
