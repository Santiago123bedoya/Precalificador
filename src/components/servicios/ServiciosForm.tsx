"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Plus, Receipt, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { createServicio, getServiciosByUser, deleteServicio } from "@/lib/appwrite/db";
import type { ServicioPublico } from "@/lib/types";
import { USE_MOCK } from "@/lib/mock";

const TIPOS_SERVICIO = [
  { id: "agua", label: "Agua", icon: "💧" },
  { id: "luz", label: "Electricidad", icon: "💡" },
  { id: "gas", label: "Gas", icon: "🔥" },
  { id: "internet", label: "Internet", icon: "🌐" },
  { id: "telefono", label: "Teléfono", icon: "📞" },
  { id: "tv", label: "TV por cable", icon: "📺" },
  { id: "otro", label: "Otro", icon: "📋" },
];

export function ServiciosForm() {
  const { user } = useAuth();
  const [servicios, setServicios] = useState<ServicioPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [tipo, setTipo] = useState("");
  const [contrato, setContrato] = useState("");
  const [cedula, setCedula] = useState("");
  const [direccion, setDireccion] = useState("");
  const [mesFactura, setMesFactura] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [pagoCompleto, setPagoCompleto] = useState(true);
  const [fechaPago, setFechaPago] = useState("");

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const data = await getServiciosByUser(user.$id);
        setServicios(data);
      } catch (err) {
        console.warn("Error cargando servicios:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleAgregar = async () => {
    if (!user || !tipo || !contrato || !cedula || !direccion || !mesFactura || !montoPagado) return;
    setSaving(true);
    try {
      const nuevo = await createServicio({
        asociadoId: user.$id,
        tipo,
        contrato,
        cedula,
        direccion,
        mesFactura,
        montoPagado: parseInt(montoPagado.replace(/[^0-9]/g, "")),
        pagoCompleto,
        fechaPago,
        fechaRegistro: new Date().toISOString(),
      });
      setServicios((prev) => [...prev, nuevo]);
      setSavedId(nuevo.$id);
      setTimeout(() => setSavedId(null), 3000);
      setShowForm(false);
      setTipo(""); setContrato(""); setCedula(""); setDireccion("");
      setMesFactura(""); setMontoPagado(""); setPagoCompleto(true); setFechaPago("");
    } catch (err) {
      console.error("Error guardando servicio:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      await deleteServicio(id);
      setServicios((prev) => prev.filter((s) => s.$id !== id));
    } catch (err) {
      console.error("Error eliminando servicio:", err);
    }
  };

  const getTipoLabel = (id: string) => TIPOS_SERVICIO.find((t) => t.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Servicios Públicos</h2>
          <p className="text-sm text-gray-500">
            {USE_MOCK ? "Modo simulación — " : ""}Registra tus servicios públicos para fortalecer tu perfil crediticio
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary gap-2">
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      {savedId && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">Servicio guardado correctamente</p>
        </div>
      )}

      {servicios.length === 0 && !showForm && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 mb-2">No hay servicios registrados</p>
            <p className="text-xs text-gray-400 mb-4">
              Agrega tus recibos de servicios públicos para mejorar tu evaluación crediticia
            </p>
            <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Registrar Servicio
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {servicios.map((s) => {
          const tipoInfo = getTipoLabel(s.tipo);
          return (
            <Card key={s.$id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-1">{tipoInfo?.icon || "📋"}</span>
                    <div>
                      <h3 className="font-medium text-sm">{tipoInfo?.label || s.tipo}</h3>
                      <p className="text-xs text-gray-500 mt-1">Contrato: {s.contrato}</p>
                      <p className="text-xs text-gray-500">Cédula: {s.cedula}</p>
                      <p className="text-xs text-gray-500">Dirección: {s.direccion}</p>
                      <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400">Mes factura</span>
                          <p className="font-medium text-gray-700">{s.mesFactura}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Monto pagado</span>
                          <p className="font-medium text-gray-700">${s.montoPagado.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Pagó completo</span>
                          <p className={`font-medium ${s.pagoCompleto ? "text-green-600" : "text-amber-600"}`}>
                            {s.pagoCompleto ? "Sí" : "No"}
                          </p>
                        </div>
                      </div>
                      {s.fechaPago && (
                        <p className="text-xs text-gray-400 mt-1">Pagado el: {s.fechaPago}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEliminar(s.$id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Card className="border-2 border-indigo-100">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Nuevo Servicio
            </CardTitle>
            <CardDescription>
              Ingresa los datos de tu última factura de servicio público
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label className="text-sm font-semibold">Tipo de servicio</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {TIPOS_SERVICIO.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs transition-all ${
                      tipo === t.id
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contrato">Número de contrato</Label>
                <Input id="contrato" value={contrato} onChange={(e) => setContrato(e.target.value)} placeholder="Ej: 123456789" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="cedula">Cédula del titular</Label>
                <Input id="cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Ej: 1234567890" className="mt-1" />
              </div>
            </div>

            <div>
              <Label htmlFor="direccion">Dirección del servicio</Label>
              <Input id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Cra 123 # 45-67, Bogotá" className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mesFactura">Mes de la última factura</Label>
                <Input id="mesFactura" type="month" value={mesFactura} onChange={(e) => setMesFactura(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="montoPagado">Monto pagado (COP)</Label>
                <Input
                  id="montoPagado"
                  value={montoPagado ? Number(montoPagado.replace(/[^0-9]/g, "")).toLocaleString("es-CO") : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setMontoPagado(raw);
                  }}
                  placeholder="Ej: 150,000"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">¿Pagó completo?</Label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPagoCompleto(true)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      pagoCompleto
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagoCompleto(false)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      !pagoCompleto
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="fechaPago">Fecha de pago</Label>
                <Input id="fechaPago" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleAgregar} className="gradient-primary" disabled={saving || !tipo || !contrato || !cedula || !direccion || !mesFactura || !montoPagado}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : "Guardar Servicio"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
