// src/components/forms/SolicitudForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSolicitud } from "@/lib/hooks/useSolicitud";
import { databases, DB } from "@/lib/appwrite/client";
import { USE_MOCK } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles, Link2 } from "lucide-react";

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
    if (isValid && currentStep < 4) {
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
        : 30;

      const perfilEndeudamiento = data.tieneOtrasDeudas === "si"
        ? Math.min(100, (parseFloat(data.montoDeudas || "0") / ingresoNum) * 100)
        : 20;

      const consistenciaIngresos = fuenteIngreso === "plataforma" ? 60 : 80;
      const responsabilidadPagos = Math.min(100, (1 - (gastosNum / ingresoNum)) * 100);
      const compromisoCooperativo = Math.min(100, parseInt(data.antiguedadMeses || "0") * 2 + parseInt(data.participacionAsambleas || "0") * 5);

      // Persistir dimensiones del radar en el perfil del asociado
      if (!USE_MOCK) {
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
        },
      });

      router.push(`/dashboard/solicitud/${solicitud.$id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // PROGRESO
  // ============================================
  const progress = (currentStep / 4) * 100;
  const stepTitles = ["Datos del crédito", "Información financiera", "Relación cooperativa", "Conectar ingresos"];

  // ============================================
  // RENDER
  // ============================================
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

      <form onSubmit={handleSubmit(onSubmit)}>
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
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-indigo-50 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Link2 className="h-6 w-6 text-indigo-500" />
                    Conectar Ingresos Digitales
                  </CardTitle>
                  <CardDescription>
                    Conecta tus plataformas para que evaluemos tus ingresos de manera más precisa
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <PalencaConnect />
                  <p className="text-xs text-gray-400 mt-4 text-center">
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

          {currentStep < 4 ? (
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
              type="submit"
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
    </div>
  );
}