// src/components/forms/SolicitudForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSolicitud } from "@/lib/hooks/useSolicitud";
import { databases, DB } from "@/lib/appwrite/client";
import { USE_MOCK } from "@/lib/mock";
import { createConsentimiento, getConsentimiento, getServiciosByUser } from "@/lib/appwrite/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PalencaConnect } from "@/components/palenca/PalencaConnect";
import { RadarChart } from "@/components/radar/RadarChart";
import { calcularPerfilExito } from "@/lib/mock-evaluate";
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles, Link2, Shield, Receipt, X } from "lucide-react";

// ============================================
// ESQUEMA DE VALIDACIÓN CON ZOD
// ============================================
const solicitudSchema = z.object({
  // Paso 1: Datos del crédito
  monto: z.string().min(1, "El monto es requerido"),
  plazo: z.string().min(1, "El plazo es requerido"),
  destino: z.string().min(1, "El destino es requerido"),

  // Paso 2: Datos financieros (dinámicos)
  fuenteIngreso: z.string().min(1, "La fuente de ingreso es requerida"),
  ingresoMensual: z.string().min(1, "El ingreso mensual es requerido"),
  gastosFijos: z.string().min(1, "Los gastos fijos son requeridos"),
  personasACargo: z.string().optional(),
  tieneOtrasDeudas: z.enum(["si", "no"]).default("no"),
  montoDeudas: z.string().optional(),
  ahorraMensualmente: z.enum(["si", "no"]).default("no"),
  montoAhorro: z.string().optional(),

  // Paso 3: Datos cooperativa
  antiguedadMeses: z.string().optional(),
  participacionAsambleas: z.string().optional(),
});

type SolicitudFormData = z.infer<typeof solicitudSchema>;

// ============================================
// OPCIONES PARA SELECTS
// ============================================
const FUENTES_INGRESO = [
  { value: "empleado", label: "💼 Empleado formal" },
  { value: "independiente", label: "💻 Independiente / Freelance" },
  { value: "plataforma", label: "📱 Plataforma digital (Rappi, Uber)" },
  { value: "emprendedor", label: "🏪 Emprendedor / Comerciante" },
  { value: "pensionado", label: "👴 Pensionado" },
  { value: "otro", label: "📌 Otro" },
];

const DESTINOS = [
  { value: "emprendimiento", label: "🚀 Emprendimiento", icon: "💡" },
  { value: "vivienda", label: "🏠 Mejora de vivienda", icon: "🔨" },
  { value: "educacion", label: "📚 Educación", icon: "🎓" },
  { value: "vehiculo", label: "🚗 Compra de vehículo", icon: "🚙" },
  { value: "deudas", label: "🔄 Consolidación de deudas", icon: "📉" },
  { value: "otro", label: "📌 Otro", icon: "✨" },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function SolicitudForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { crear, loading } = useSolicitud();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRadar, setSubmittedRadar] = useState<{
    consistenciaIngresos: number;
    responsabilidadPagos: number;
    compromisoCooperativo: number;
    perfilEndeudamiento: number;
    capacidadAhorro: number;
  } | null>(null);
  const [submittedRadarIdeal, setSubmittedRadarIdeal] = useState<Record<string, number> | null>(null);
  const [palencaConnections, setPalencaConnections] = useState<any[]>([]);
  const [selectedServicios, setSelectedServicios] = useState<any[]>([]);
  const [serviciosModalOpen, setServiciosModalOpen] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<any[]>([]);
  const [serviciosLoading, setServiciosLoading] = useState(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentData, setConsentData] = useState({
    serviciosBasicos: false,
    economiaDigital: false,
    datosCooperativa: false,
    datosSocioConductuales: false,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<SolicitudFormData>({
    resolver: zodResolver(solicitudSchema),
    mode: "onChange",
    defaultValues: {
      tieneOtrasDeudas: "no",
      ahorraMensualmente: "no",
      personasACargo: "0",
      antiguedadMeses: "0",
      participacionAsambleas: "0",
    },
  });

  // Watch para campos dinámicos
  const tieneOtrasDeudas = watch("tieneOtrasDeudas");
  const ahorraMensualmente = watch("ahorraMensualmente");
  const fuenteIngreso = watch("fuenteIngreso");

  // Verificar consentimiento
  useEffect(() => {
    async function checkConsent() {
      if (!user) return;
      if (USE_MOCK) {
        setConsentRequired(false);
        setConsentGiven(true);
        setConsentLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admin/configuracion");
        const config = await res.json();
        const requiere = config.politicas?.requiereConsentimiento ?? true;
        setConsentRequired(requiere);
        if (!requiere) {
          setConsentGiven(true);
          setConsentLoading(false);
          return;
        }
        const existing = await getConsentimiento(user.$id);
        if (existing) {
          setConsentGiven(true);
        }
      } catch {}
      setConsentLoading(false);
    }
    checkConsent();
  }, [user]);

  const handleConsentSubmit = async () => {
    if (!user) return;
    try {
      await createConsentimiento({
        asociadoId: user.$id,
        fecha: new Date().toISOString(),
        vigente: true,
        datosPermitidos: consentData,
      });
      setConsentGiven(true);
    } catch (err) {
      setError("Error al guardar el consentimiento");
    }
  };

  // ============================================
  // VALIDACIÓN DE PASOS
  // ============================================
  const validateStep = async (step: number) => {
    let fields: (keyof SolicitudFormData)[] = [];
    if (step === 1) fields = ["monto", "plazo", "destino"];
    else if (step === 2) {
      fields = ["fuenteIngreso", "ingresoMensual", "gastosFijos"];
      if (tieneOtrasDeudas === "si") fields.push("montoDeudas");
      if (ahorraMensualmente === "si") fields.push("montoAhorro");
    } else if (step === 3) {
      fields = ["antiguedadMeses", "participacionAsambleas"];
    }
    const result = await trigger(fields);
    return result;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ============================================
  // SERVICIOS PÚBLICOS - SELECTOR
  // ============================================
  const openServiciosModal = async () => {
    if (!user) return;
    setServiciosLoading(true);
    try {
      const data = await getServiciosByUser(user.$id);
      setServiciosDisponibles(data);
    } catch (err) {
      console.warn("Error cargando servicios:", err);
    } finally {
      setServiciosLoading(false);
    }
    setServiciosModalOpen(true);
  };

  const toggleServicio = (servicio: any) => {
    setSelectedServicios((prev) => {
      const exists = prev.find((s) => s.$id === servicio.$id);
      if (exists) return prev.filter((s) => s.$id !== servicio.$id);
      if (prev.length >= 3) return prev;
      return [...prev, servicio];
    });
  };

  // ============================================
  // ENVÍO DEL FORMULARIO
  // ============================================
  const onSubmit = async (data: SolicitudFormData) => {
    setIsSubmitting(true);
    setError("");

    if (!user) {
      setError("Debes iniciar sesión primero");
      setIsSubmitting(false);
      return;
    }

    try {
      const montoNum = parseFloat(data.monto);
      const ingresoNum = parseFloat(data.ingresoMensual);
      const gastosNum = parseFloat(data.gastosFijos);

      if (montoNum < 100000) {
        setError("El monto mínimo es $100,000");
        setIsSubmitting(false);
        return;
      }

      if (ingresoNum < 100000) {
        setError("El ingreso mensual mínimo es $100,000");
        setIsSubmitting(false);
        return;
      }

      // Calcular dimensiones del radar
      const capacidadAhorro = data.ahorraMensualmente === "si" 
        ? Math.min(100, (parseFloat(data.montoAhorro || "0") / ingresoNum) * 100)
        : 40;

      const perfilEndeudamiento = data.tieneOtrasDeudas === "si"
        ? Math.min(100, (parseFloat(data.montoDeudas || "0") / ingresoNum) * 100)
        : 20;

      const consistenciaIngresos = fuenteIngreso === "plataforma" ? 70 : 80;
      const expenseRatio = gastosNum / ingresoNum;
      const responsabilidadPagos = Math.min(100, Math.max(35, Math.round(100 - expenseRatio * 50)));
      const compromisoCooperativo = Math.min(100, Math.max(10, parseInt(data.antiguedadMeses || "0") * 2 + parseInt(data.participacionAsambleas || "0") * 5));

      // Persistir dimensiones del radar en el perfil del asociado
      if (!USE_MOCK) {
        await databases.updateDocument(
          DB.id,
          DB.collections.ASOCIADOS,
          user.$id,
          {
            consistenciaIngresos: Math.round(consistenciaIngresos),
            responsabilidadPagos: Math.round(responsabilidadPagos),
            compromisoCooperativo: Math.round(compromisoCooperativo),
            perfilEndeudamiento: Math.round(perfilEndeudamiento),
            capacidadAhorro: Math.round(capacidadAhorro),
          }
        );
      }

      const solicitud = await crear({
        asociadoId: user.$id,
        montoSolicitado: montoNum,
        plazoMeses: parseInt(data.plazo),
        destino: data.destino,
        metadata: {
          ingresoMensual: ingresoNum,
          fuenteIngreso: data.fuenteIngreso,
          gastosFijos: gastosNum,
          personasACargo: parseInt(data.personasACargo || "0"),
          tieneOtrasDeudas: data.tieneOtrasDeudas === "si",
          montoDeudas: data.tieneOtrasDeudas === "si" ? parseFloat(data.montoDeudas || "0") : 0,
          ahorraMensualmente: data.ahorraMensualmente === "si",
          montoAhorro: data.ahorraMensualmente === "si" ? parseFloat(data.montoAhorro || "0") : 0,
          antiguedadMeses: parseInt(data.antiguedadMeses || "0"),
          participacionAsambleas: parseInt(data.participacionAsambleas || "0"),
          consistenciaIngresos,
          responsabilidadPagos,
          compromisoCooperativo,
          perfilEndeudamiento,
          capacidadAhorro,
          ingresosPalenca: palencaConnections.length > 0
            ? palencaConnections.filter((c: any) => c.status === "connected").map((c: any) => ({
                plataforma: c.platformId,
                promedioMensual: c.incomeData?.promedioMensual || 0,
                mesesActivo: c.incomeData?.mesesActivo || 0,
              }))
            : undefined,
          serviciosPublicos: selectedServicios.length > 0
            ? selectedServicios.map((s: any) => ({
                id: s.$id,
                tipo: s.tipo,
                contrato: s.contrato,
                mesFactura: s.mesFactura,
                montoPagado: s.montoPagado,
                pagoCompleto: s.pagoCompleto,
                fechaPago: s.fechaPago,
              }))
            : undefined,
        },
      });

      let evaluacionData: any = null;

      try {
        const evalResponse = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            radar: {
              consistenciaIngresos,
              responsabilidadPagos,
              compromisoCooperativo,
              perfilEndeudamiento,
              capacidadAhorro,
            },
            monto_solicitado: montoNum,
            plazo_meses: parseInt(data.plazo),
            nombre: user.nombre,
          }),
        });

        if (evalResponse.ok) {
          const evalResult = await evalResponse.json();
          if (evalResult.success && evalResult.data) {
            const mlData = evalResult.data;
            evaluacionData = {
              solicitudId: solicitud.$id,
              asociadoId: user.$id,
              fechaEvaluacion: new Date().toISOString(),
              puntajeRiesgo: Math.round(mlData.puntaje_riesgo * 100),
              consistenciaIngresos: Math.round(consistenciaIngresos),
              responsabilidadPagos: Math.round(responsabilidadPagos),
              compromisoCooperativo: Math.round(compromisoCooperativo),
              perfilEndeudamiento: Math.round(perfilEndeudamiento),
              capacidadAhorro: Math.round(capacidadAhorro),
              decision: mlData.decision,
              explicacionResumen: mlData.explicacion,
              montoRecomendado: Math.round(mlData.monto_recomendado),
              recomendaciones: mlData.recomendaciones,
              radarIdeal: mlData.radar_ideal,
              fortalezas: mlData.fortalezas,
              scorePerfil: mlData.score_perfil,
            };
          }
        }

        if (!evaluacionData) {
          const puntaje = Math.round(
            (consistenciaIngresos * 0.25 +
            responsabilidadPagos * 0.30 +
            compromisoCooperativo * 0.15 +
            (100 - perfilEndeudamiento) * 0.20 +
            capacidadAhorro * 0.10)
          );
          const decision = puntaje >= 60 ? "aprobado" : puntaje >= 40 ? "precalificado" : "no_precalificado";
          const radarVals = { consistenciaIngresos: Math.round(consistenciaIngresos), responsabilidadPagos: Math.round(responsabilidadPagos), compromisoCooperativo: Math.round(compromisoCooperativo), perfilEndeudamiento: Math.round(perfilEndeudamiento), capacidadAhorro: Math.round(capacidadAhorro) };
          const radarIdeal: any = {};
          for (const [k, v] of Object.entries(radarVals)) {
            radarIdeal[k] = (v as number) < 50 ? Math.min(100, (v as number) + 30) : (v as number) < 70 ? Math.min(100, (v as number) + 20) : Math.min(100, (v as number) + 10);
          }
          evaluacionData = {
            solicitudId: solicitud.$id,
            asociadoId: user.$id,
            fechaEvaluacion: new Date().toISOString(),
            puntajeRiesgo: 100 - puntaje,
            consistenciaIngresos: Math.round(consistenciaIngresos),
            responsabilidadPagos: Math.round(responsabilidadPagos),
            compromisoCooperativo: Math.round(compromisoCooperativo),
            perfilEndeudamiento: Math.round(perfilEndeudamiento),
            capacidadAhorro: Math.round(capacidadAhorro),
            decision,
            explicacionResumen: `Evaluacion basada en perfil cooperativo. Puntaje: ${puntaje}/100.`,
            montoRecomendado: Math.round(montoNum * (puntaje / 100)),
            recomendaciones: ["Mantener ingresos estables", "Continuar ahorrando"],
            radarIdeal,
            fortalezas: [],
            scorePerfil: puntaje,
          };
        }

        if (USE_MOCK) {
          const stored = localStorage.getItem("ia-coop-mock-evaluaciones");
          const evals: any[] = stored ? JSON.parse(stored) : [];
          evals.push({ $id: `mock-eval-${Date.now()}`, ...evaluacionData });
          localStorage.setItem("ia-coop-mock-evaluaciones", JSON.stringify(evals));
        } else {
          const { createEvaluacion, updateSolicitud } = await import("@/lib/appwrite/db");
          await createEvaluacion(evaluacionData as any);
        }
      } catch (evalErr) {
        console.warn("Evaluacion no disponible:", evalErr);
      }

      setSubmittedRadar({
        consistenciaIngresos: Math.round(consistenciaIngresos),
        responsabilidadPagos: Math.round(responsabilidadPagos),
        compromisoCooperativo: Math.round(compromisoCooperativo),
        perfilEndeudamiento: Math.round(perfilEndeudamiento),
        capacidadAhorro: Math.round(capacidadAhorro),
      });
      if (evaluacionData?.radarIdeal) {
        setSubmittedRadarIdeal(evaluacionData.radarIdeal as Record<string, number>);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // PROGRESO
  // ============================================
  const progress = (currentStep / 3) * 100;
  const stepTitles = ["Datos del crédito", "Información financiera", "Relación cooperativa"];

  // ============================================
  // RENDER
  // ============================================
  if (consentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (consentRequired && !consentGiven) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Consentimiento de Datos
            </CardTitle>
            <CardDescription>
              Para evaluar tu solicitud de crédito, necesitamos tu autorización para acceder a los siguientes datos:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Servicios básicos</p>
                <p className="text-xs text-gray-500">Historial de agua, luz, teléfono</p>
              </div>
              <Switch checked={consentData.serviciosBasicos} onCheckedChange={(v) => setConsentData(p => ({ ...p, serviciosBasicos: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Economía digital</p>
                <p className="text-xs text-gray-500">Ingresos en plataformas digitales</p>
              </div>
              <Switch checked={consentData.economiaDigital} onCheckedChange={(v) => setConsentData(p => ({ ...p, economiaDigital: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Datos cooperativa</p>
                <p className="text-xs text-gray-500">Tu cuenta en la cooperativa</p>
              </div>
              <Switch checked={consentData.datosCooperativa} onCheckedChange={(v) => setConsentData(p => ({ ...p, datosCooperativa: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Perfil socio-conductual</p>
                <p className="text-xs text-gray-500">Cuestionario opcional</p>
              </div>
              <Switch checked={consentData.datosSocioConductuales} onCheckedChange={(v) => setConsentData(p => ({ ...p, datosSocioConductuales: v }))} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleConsentSubmit} className="w-full gradient-primary" disabled={loading}>
              Autorizar y Continuar
            </Button>
            <p className="text-xs text-gray-400 text-center">Puedes revocar este consentimiento en cualquier momento</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && submittedRadar) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800">Solicitud Enviada</h2>
            <p className="text-green-700 max-w-md mx-auto">
              Tu solicitud ha sido recibida correctamente. Nuestro equipo la revisará y recibirás una notificación con la decisión.
            </p>
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <p className="text-sm text-gray-500 mb-3">Tu perfil crediticio actual:</p>
              <RadarChart
                data={submittedRadar as any}
                comparisonData={(submittedRadarIdeal as any) || calcularPerfilExito() || undefined}
                title="Radar Decisorio"
                height={300}
              />
              {submittedRadarIdeal ? (
                <p className="text-xs text-gray-400 mt-2">
                  <span className="text-blue-600">Azul:</span> Tu perfil · <span className="text-green-600">Verde:</span> Perfil ideal recomendado
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-2">
                  El área verde muestra el perfil promedio de solicitudes exitosas
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Ir al Dashboard
              </Button>
              <Button
                className="gradient-primary"
                onClick={() => router.push("/dashboard/mis-solicitudes")}
              >
                Ver Mis Solicitudes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2 text-sm text-gray-500">
          <span>Paso {currentStep} de 3</span>
          <span>{stepTitles[currentStep - 1]}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <AnimatePresence mode="wait">
          {/* ========================================== */}
          {/* PASO 1: DATOS DEL CRÉDITO */}
          {/* ========================================== */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-blue-50 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-blue-500" />
                    Datos del Crédito
                  </CardTitle>
                  <CardDescription>Cuéntanos qué necesitas</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Monto */}
                  <div>
                    <Label htmlFor="monto" className="text-sm font-semibold">
                      Monto solicitado (COP)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">$</span>
                      <Input
                        id="monto"
                        type="number"
                        placeholder="5,000,000"
                        className="pl-7"
                        {...register("monto")}
                      />
                    </div>
                    {errors.monto && (
                      <p className="text-sm text-red-500 mt-1">{errors.monto.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Monto mínimo: $100,000</p>
                  </div>

                  {/* Plazo */}
                  <div>
                    <Label htmlFor="plazo" className="text-sm font-semibold">
                      Plazo (meses)
                    </Label>
                    <Select onValueChange={(v) => setValue("plazo", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el plazo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses</SelectItem>
                        <SelectItem value="24">24 meses</SelectItem>
                        <SelectItem value="36">36 meses</SelectItem>
                        <SelectItem value="48">48 meses</SelectItem>
                        <SelectItem value="60">60 meses</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.plazo && (
                      <p className="text-sm text-red-500 mt-1">{errors.plazo.message}</p>
                    )}
                  </div>

                  {/* Destino */}
                  <div>
                    <Label htmlFor="destino" className="text-sm font-semibold">
                      Destino del crédito
                    </Label>
                    <Select onValueChange={(v) => setValue("destino", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="¿Para qué necesitas el crédito?" />
                      </SelectTrigger>
                      <SelectContent>
                        {DESTINOS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            <span className="flex items-center gap-2">
                              <span>{d.icon}</span>
                              {d.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.destino && (
                      <p className="text-sm text-red-500 mt-1">{errors.destino.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========================================== */}
          {/* PASO 2: INFORMACIÓN FINANCIERA */}
          {/* ========================================== */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-green-50 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-green-500" />
                    Información Financiera
                  </CardTitle>
                  <CardDescription>Esto nos ayuda a evaluar tu capacidad de pago</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Fuente de ingreso */}
                  <div>
                    <Label htmlFor="fuenteIngreso" className="text-sm font-semibold">
                      Fuente de ingreso principal
                    </Label>
                    <Select onValueChange={(v) => setValue("fuenteIngreso", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="¿De dónde provienen tus ingresos?" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUENTES_INGRESO.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fuenteIngreso && (
                      <p className="text-sm text-red-500 mt-1">{errors.fuenteIngreso.message}</p>
                    )}
                  </div>

                  {/* Ingreso mensual */}
                  <div>
                    <Label htmlFor="ingresoMensual" className="text-sm font-semibold">
                      Ingreso mensual aproximado (COP)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">$</span>
                      <Input
                        id="ingresoMensual"
                        type="number"
                        placeholder="2,000,000"
                        className="pl-7"
                        {...register("ingresoMensual")}
                      />
                    </div>
                    {errors.ingresoMensual && (
                      <p className="text-sm text-red-500 mt-1">{errors.ingresoMensual.message}</p>
                    )}
                  </div>

                  {/* Gastos fijos */}
                  <div>
                    <Label htmlFor="gastosFijos" className="text-sm font-semibold">
                      Gastos fijos mensuales (COP)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">$</span>
                      <Input
                        id="gastosFijos"
                        type="number"
                        placeholder="1,200,000"
                        className="pl-7"
                        {...register("gastosFijos")}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Arriendo, servicios, alimentación, transporte</p>
                    {errors.gastosFijos && (
                      <p className="text-sm text-red-500 mt-1">{errors.gastosFijos.message}</p>
                    )}
                  </div>

                  {/* Personas a cargo */}
                  <div>
                    <Label htmlFor="personasACargo" className="text-sm font-semibold">
                      Número de personas a cargo
                    </Label>
                    <Input
                      id="personasACargo"
                      type="number"
                      placeholder="0"
                      {...register("personasACargo")}
                    />
                  </div>

                  {/* Otras deudas - DINÁMICO */}
                  <div className="border-t pt-4">
                    <Label className="text-sm font-semibold">¿Tienes otras deudas?</Label>
                    <div className="flex gap-4 mt-2">
                      <Button
                        type="button"
                        variant={tieneOtrasDeudas === "no" ? "default" : "outline"}
                        onClick={() => setValue("tieneOtrasDeudas", "no")}
                        className="flex-1"
                      >
                        ❌ No
                      </Button>
                      <Button
                        type="button"
                        variant={tieneOtrasDeudas === "si" ? "default" : "outline"}
                        onClick={() => setValue("tieneOtrasDeudas", "si")}
                        className="flex-1"
                      >
                        ✅ Sí
                      </Button>
                    </div>

                    <AnimatePresence>
                      {tieneOtrasDeudas === "si" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4">
                            <Label htmlFor="montoDeudas" className="text-sm font-semibold">
                              Monto total de deudas (COP)
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400">$</span>
                              <Input
                                id="montoDeudas"
                                type="number"
                                placeholder="500,000"
                                className="pl-7"
                                {...register("montoDeudas")}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Ahorro - DINÁMICO */}
                  <div className="border-t pt-4">
                    <Label className="text-sm font-semibold">¿Ahorras mensualmente?</Label>
                    <div className="flex gap-4 mt-2">
                      <Button
                        type="button"
                        variant={ahorraMensualmente === "no" ? "default" : "outline"}
                        onClick={() => setValue("ahorraMensualmente", "no")}
                        className="flex-1"
                      >
                        ❌ No
                      </Button>
                      <Button
                        type="button"
                        variant={ahorraMensualmente === "si" ? "default" : "outline"}
                        onClick={() => setValue("ahorraMensualmente", "si")}
                        className="flex-1"
                      >
                        ✅ Sí
                      </Button>
                    </div>

                    <AnimatePresence>
                      {ahorraMensualmente === "si" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4">
                            <Label htmlFor="montoAhorro" className="text-sm font-semibold">
                              Monto de ahorro mensual (COP)
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400">$</span>
                              <Input
                                id="montoAhorro"
                                type="number"
                                placeholder="200,000"
                                className="pl-7"
                                {...register("montoAhorro")}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========================================== */}
          {/* PASO 3: RELACIÓN COOPERATIVA */}
          {/* ========================================== */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-purple-50 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-500" />
                    Relación con la Cooperativa
                  </CardTitle>
                  <CardDescription>Tu compromiso es importante para nosotros</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="antiguedadMeses" className="text-sm font-semibold">
                      Antigüedad como asociado (meses)
                    </Label>
                    <Input
                      id="antiguedadMeses"
                      type="number"
                      placeholder="12"
                      {...register("antiguedadMeses")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="participacionAsambleas" className="text-sm font-semibold">
                      Asambleas a las que has asistido
                    </Label>
                    <Input
                      id="participacionAsambleas"
                      type="number"
                      placeholder="2"
                      {...register("participacionAsambleas")}
                    />
                  </div>

                  {/* Servicios Públicos */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Servicios Públicos</Label>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Adjunta hasta 3 recibos para fortalecer tu perfil
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={openServiciosModal} className="gap-1.5">
                        <Receipt className="h-3.5 w-3.5" />
                        {selectedServicios.length > 0 ? `Seleccionados (${selectedServicios.length}/3)` : "Seleccionar"}
                      </Button>
                    </div>
                    {selectedServicios.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedServicios.map((s) => (
                          <div key={s.$id} className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-lg">
                                {(() => { const t = s.tipo; if (t === "agua") return "💧"; if (t === "luz") return "💡"; if (t === "gas") return "🔥"; if (t === "internet") return "🌐"; if (t === "telefono") return "📞"; return "📋"; })()}
                              </span>
                              <div>
                                <p className="font-medium text-indigo-700 text-xs">{s.contrato} · ${s.montoPagado?.toLocaleString()}</p>
                                <p className="text-[11px] text-indigo-400">{s.mesFactura}</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => toggleServicio(s)} className="p-1 hover:bg-indigo-200/50 rounded-full text-indigo-400 hover:text-red-500 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 2 && fuenteIngreso === "plataforma" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <Card className="border-2 border-indigo-50 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-indigo-500" />
                    Conectar Ingresos Digitales
                  </CardTitle>
                  <CardDescription>
                    Conecta tus plataformas para evaluar tus ingresos de manera más precisa
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <PalencaConnect onConnectionsChange={setPalencaConnections} />
                  {palencaConnections.filter((c) => c.status === "connected").length > 0 && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-xs font-medium text-indigo-700 mb-1">
                        Ingresos verificados por Palenca:
                      </p>
                      {palencaConnections
                        .filter((c) => c.status === "connected" && c.incomeData)
                        .map((c) => (
                          <p key={c.platformId} className="text-xs text-indigo-600">
                            {c.platformId}: ${c.incomeData.promedioMensual.toLocaleString()}/mes
                          </p>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Tus datos se usan solo para esta evaluación. Puedes desconectar en cualquier momento.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================== */}
        {/* BOTONES DE NAVEGACIÓN */}
        {/* ========================================== */}
        <div className="flex justify-between mt-8 gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || loading}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isSubmitting || loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            ❌ {error}
          </div>
        )}
      </form>

      {/* Modal selector de servicios */}
      {serviciosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setServiciosModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Selecciona tus servicios</h3>
                <p className="text-sm text-gray-500">Elige hasta 3 recibos de servicios públicos</p>
              </div>
              <button type="button" onClick={() => setServiciosModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {serviciosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-indigo-600 border-t-transparent"></div>
                </div>
              ) : serviciosDisponibles.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-1">No tienes servicios registrados</p>
                  <p className="text-xs text-gray-400">
                    Agrega servicios desde "Servicios Públicos" en el menú
                  </p>
                </div>
              ) : (
                serviciosDisponibles.map((s) => {
                  const selected = selectedServicios.some((sel) => sel.$id === s.$id);
                  const disabled = !selected && selectedServicios.length >= 3;
                  const icon = s.tipo === "agua" ? "💧" : s.tipo === "luz" ? "💡" : s.tipo === "gas" ? "🔥" : s.tipo === "internet" ? "🌐" : s.tipo === "telefono" ? "📞" : "📋";
                  return (
                    <button
                      key={s.$id}
                      type="button"
                      onClick={() => toggleServicio(s)}
                      disabled={disabled}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                        selected
                          ? "border-indigo-400 bg-indigo-50"
                          : disabled
                            ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                            : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            Contrato: {s.contrato}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {s.direccion} · {s.mesFactura}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm text-gray-900">${s.montoPagado?.toLocaleString()}</p>
                          <p className={`text-[11px] ${s.pagoCompleto ? "text-green-600" : "text-amber-600"}`}>
                            {s.pagoCompleto ? "Pagado" : "Pendiente"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-gray-100 p-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">{selectedServicios.length}/3 seleccionados</p>
              <Button type="button" onClick={() => setServiciosModalOpen(false)} className="gradient-primary">
                {selectedServicios.length > 0 ? "Listo" : "Cerrar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}