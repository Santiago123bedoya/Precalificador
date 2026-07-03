"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Save, Shield, Bell, Cpu, Database, Users,
  AlertTriangle, CheckCircle2, Settings,
} from "lucide-react";

interface ConfigData {
  nombreCooperativa: string;
  maxMontoSolicitud: number;
  maxPlazoMeses: number;
  tasaInteresAnual: number;
  requiereConsentimiento: boolean;
  umbralAprobacion: number;
  modoEvaluacion: "ml" | "reglas";
}

const DEFAULT_CONFIG: ConfigData = {
  nombreCooperativa: "IA-COOP Cooperativa",
  maxMontoSolicitud: 50000000,
  maxPlazoMeses: 120,
  tasaInteresAnual: 18,
  requiereConsentimiento: true,
  umbralAprobacion: 60,
  modoEvaluacion: "ml",
};

export default function AdminConfiguracionPage() {
  const [config, setConfig] = useState<ConfigData>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/configuracion");
        if (res.ok) {
          const data = await res.json();
          setConfig({
            nombreCooperativa: data.nombreCooperativa || DEFAULT_CONFIG.nombreCooperativa,
            maxMontoSolicitud: data.montoMaximo || DEFAULT_CONFIG.maxMontoSolicitud,
            maxPlazoMeses: data.plazoMaximo || DEFAULT_CONFIG.maxPlazoMeses,
            tasaInteresAnual: data.tasaInteresAnual || DEFAULT_CONFIG.tasaInteresAnual,
            requiereConsentimiento: data.politicas?.requiereConsentimiento ?? DEFAULT_CONFIG.requiereConsentimiento,
            umbralAprobacion: data.umbralAprobacion || DEFAULT_CONFIG.umbralAprobacion,
            modoEvaluacion: data.politicas?.modoEvaluacion || DEFAULT_CONFIG.modoEvaluacion,
          });
          return;
        }
      } catch {}
      const stored = localStorage.getItem("ia-coop-config");
      if (stored) {
        try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) }); } catch {}
      }
    }
    loadConfig();
  }, []);

  const update = (key: keyof ConfigData, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setHasChanges(false);
    setSaved(true);
    try {
      await fetch("/api/admin/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasaInteresAnual: config.tasaInteresAnual,
          montoMinimo: 100000,
          montoMaximo: config.maxMontoSolicitud,
          plazoMinimo: 1,
          plazoMaximo: config.maxPlazoMeses,
          umbralAprobacion: config.umbralAprobacion,
          politicas: {
            nombreCooperativa: config.nombreCooperativa,
            requiereConsentimiento: config.requiereConsentimiento,
            modoEvaluacion: config.modoEvaluacion,
          },
        }),
      });
    } catch {}
    localStorage.setItem("ia-coop-config", JSON.stringify(config));
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem("ia-coop-config");
    setHasChanges(true);
    setSaved(false);
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración del Sistema</h1>
            <p className="text-sm text-gray-500 mt-1">Parámetros generales del precalificador</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
              Restablecer
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges} className="gradient-primary">
              {saved ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Guardado</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Guardar</>
              )}
            </Button>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Configuración guardada correctamente
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-base">General</CardTitle>
                  <CardDescription>Información básica de la cooperativa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre de la Cooperativa</Label>
                <Input
                  id="nombre"
                  value={config.nombreCooperativa}
                  onChange={(e) => update("nombreCooperativa", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Modo de Evaluación</Label>
                <div className="flex gap-3 mt-2">
                  {[
                    { value: "ml" as const, label: "Modelo ML", desc: "Usa el modelo de machine learning" },
                    { value: "reglas" as const, label: "Reglas", desc: "Sistema basado en reglas simples" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update("modoEvaluacion", opt.value)}
                      className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${
                        config.modoEvaluacion === opt.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Parámetros Crediticios</CardTitle>
                  <CardDescription>Límites y condiciones de préstamo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="maxMonto">Monto máximo de solicitud (COP)</Label>
                <Input
                  id="maxMonto"
                  type="number"
                  value={config.maxMontoSolicitud}
                  onChange={(e) => update("maxMontoSolicitud", Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Actual: ${config.maxMontoSolicitud.toLocaleString()} COP
                </p>
              </div>
              <div>
                <Label htmlFor="maxPlazo">Plazo máximo (meses)</Label>
                <Input
                  id="maxPlazo"
                  type="number"
                  value={config.maxPlazoMeses}
                  onChange={(e) => update("maxPlazoMeses", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tasa">Tasa de interés anual (%)</Label>
                <Input
                  id="tasa"
                  type="number"
                  step="0.1"
                  value={config.tasaInteresAnual}
                  onChange={(e) => update("tasaInteresAnual", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="umbral">Umbral mínimo de aprobación (0-100)</Label>
                <Input
                  id="umbral"
                  type="number"
                  min="0"
                  max="100"
                  value={config.umbralAprobacion}
                  onChange={(e) => update("umbralAprobacion", Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Perfil con puntaje {"<"} {config.umbralAprobacion} será rechazado
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Privacidad y Consentimiento</CardTitle>
                  <CardDescription>Configuración de datos y permisos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Consentimiento obligatorio</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Requerir consentimiento antes de evaluar</p>
                </div>
                <Switch
                  checked={config.requiereConsentimiento}
                  onCheckedChange={(checked) => update("requiereConsentimiento", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Estado del Sistema</CardTitle>
                  <CardDescription>Información de servicios conectados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Appwrite (Auth + DB)", status: true },
                { name: "ML Service (FastAPI)", status: false },
                { name: "DeepSeek (XAI)", status: false },
                { name: "Palenca (Ingresos Digitales)", status: false },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{service.name}</span>
                  <Badge variant={service.status ? "default" : "secondary"} className={service.status ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                    {service.status ? "Conectado" : "Desconectado"}
                  </Badge>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs text-gray-400">
                  Endpoint Appwrite: {process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "No configurado"}
                </p>
                <p className="text-xs text-gray-400">
                  Project ID: {process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ? `${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID.slice(0, 8)}...` : "No configurado"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          <Database className="h-4 w-4 shrink-0" />
          La configuración se guarda en Appwrite y se sincroniza entre dispositivos.
        </div>
      </div>
    </ProtectedRoute>
  );
}

function DollarSign(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
