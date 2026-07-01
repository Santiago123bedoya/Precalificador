// src/components/forms/ConsentimientoForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { createConsentimiento, getConsentimiento } from "@/lib/appwrite/db";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ConsentimientoData {
  serviciosBasicos: boolean;
  economiaDigital: boolean;
  datosCooperativa: boolean;
  datosSocioConductuales: boolean;
}

export default function ConsentimientoForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [consentimiento, setConsentimiento] = useState<ConsentimientoData>({
    serviciosBasicos: false,
    economiaDigital: false,
    datosCooperativa: false,
    datosSocioConductuales: false,
  });
  const [hasConsentimiento, setHasConsentimiento] = useState(false);

  useEffect(() => {
    const fetchConsentimiento = async () => {
      if (!user) return;
      try {
        const existing = await getConsentimiento(user.$id);
        if (existing) {
          setConsentimiento(existing.datosPermitidos);
          setHasConsentimiento(true);
        }
      } catch (error) {
        console.error("Error al obtener consentimiento:", error);
      }
    };
    fetchConsentimiento();
  }, [user]);

  const handleSwitchChange = (key: keyof ConsentimientoData, value: boolean) => {
    setConsentimiento((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await createConsentimiento({
        asociadoId: user.$id,
        fecha: new Date().toISOString(),
        vigente: true,
        datosPermitidos: consentimiento,
      });
      setHasConsentimiento(true);
      alert("✅ Consentimiento guardado exitosamente");
    } catch (error) {
      alert("❌ Error al guardar el consentimiento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (hasConsentimiento) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">✅ Consentimiento activo</CardTitle>
          <CardDescription>
            Has autorizado el uso de tus datos para la evaluación crediticia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Servicios básicos:</strong> {consentimiento.serviciosBasicos ? "✅ Permitido" : "❌ No permitido"}</p>
            <p><strong>Economía digital:</strong> {consentimiento.economiaDigital ? "✅ Permitido" : "❌ No permitido"}</p>
            <p><strong>Datos cooperativa:</strong> {consentimiento.datosCooperativa ? "✅ Permitido" : "❌ No permitido"}</p>
            <p><strong>Datos socio-conductuales:</strong> {consentimiento.datosSocioConductuales ? "✅ Permitido" : "❌ No permitido"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Para poder evaluar tu solicitud de crédito, necesitamos tu autorización
        para acceder a los siguientes datos:
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="serviciosBasicos" className="cursor-pointer">
            📊 Historial de servicios básicos (agua, luz, teléfono)
          </Label>
          <Switch
            id="serviciosBasicos"
            checked={consentimiento.serviciosBasicos}
            onCheckedChange={(value) =>
              handleSwitchChange("serviciosBasicos", value)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="economiaDigital" className="cursor-pointer">
            📱 Ingresos en plataformas digitales (Rappi, Uber, etc.)
          </Label>
          <Switch
            id="economiaDigital"
            checked={consentimiento.economiaDigital}
            onCheckedChange={(value) =>
              handleSwitchChange("economiaDigital", value)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="datosCooperativa" className="cursor-pointer">
            🏦 Datos de tu cuenta en la cooperativa
          </Label>
          <Switch
            id="datosCooperativa"
            checked={consentimiento.datosCooperativa}
            onCheckedChange={(value) =>
              handleSwitchChange("datosCooperativa", value)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="datosSocioConductuales" className="cursor-pointer">
            🧠 Perfil socio-conductual (cuestionario opcional)
          </Label>
          <Switch
            id="datosSocioConductuales"
            checked={consentimiento.datosSocioConductuales}
            onCheckedChange={(value) =>
              handleSwitchChange("datosSocioConductuales", value)
            }
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Guardando..." : "Guardar Consentimiento"}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Puedes revocar este consentimiento en cualquier momento
      </p>
    </div>
  );
}