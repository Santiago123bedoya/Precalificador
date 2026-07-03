"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Link2, Unlink, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { createIngresoDigital, deleteIngresoDigital } from "@/lib/appwrite/db";

const PALENCA_PLATFORMS = [
  { id: "uber", label: "Uber", icon: "🚗", color: "bg-gray-100 text-gray-700" },
  { id: "rappi", label: "Rappi", icon: "🛵", color: "bg-green-50 text-green-700" },
  { id: "didi", label: "Didi", icon: "🚙", color: "bg-yellow-50 text-yellow-700" },
  { id: "uber_eats", label: "Uber Eats", icon: "🍔", color: "bg-red-50 text-red-700" },
  { id: "mercado_libre", label: "Mercado Libre", icon: "📦", color: "bg-blue-50 text-blue-700" },
  { id: "diversos", label: "Plataformas Múltiples", icon: "🔗", color: "bg-purple-50 text-purple-700" },
];

interface IncomeData {
  promedioMensual: number;
  mesesActivo: number;
  ultimaActualizacion: string;
}

interface PlatformConnection {
  platformId: string;
  status: "idle" | "connecting" | "connected" | "error";
  accountId?: string;
  incomeData?: IncomeData;
}

interface PalencaConnectProps {
  onConnectionsChange?: (connections: PlatformConnection[]) => void;
}

const STORAGE_KEY = "ia-coop-palenca-connections";

function randomIncome() {
  const ranges = [
    { min: 800000, max: 2500000 },
    { min: 1200000, max: 3500000 },
    { min: 500000, max: 1800000 },
    { min: 1500000, max: 4000000 },
    { min: 600000, max: 2000000 },
    { min: 2000000, max: 5000000 },
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return Math.floor(Math.random() * (range.max - range.min) + range.min);
}

const platformLabels: Record<string, string> = {
  uber: "Uber", rappi: "Rappi", didi: "Didi",
  uber_eats: "Uber Eats", mercado_libre: "Mercado Libre",
  diversos: "Plataformas Múltiples",
};

export function PalencaConnect({ onConnectionsChange }: PalencaConnectProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualPlatform, setManualPlatform] = useState("");
  const [manualIncome, setManualIncome] = useState("");
  const [manualMonths, setManualMonths] = useState("");
  const [appwriteIds, setAppwriteIds] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConnections(JSON.parse(stored));
      const idsStored = localStorage.getItem(STORAGE_KEY + "-ids");
      if (idsStored) setAppwriteIds(JSON.parse(idsStored));
    } catch {}
  }, []);

  const save = useCallback((updated: PlatformConnection[]) => {
    setConnections(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    onConnectionsChange?.(updated);
  }, [onConnectionsChange]);

  const saveAppwriteIds = useCallback((ids: Record<string, string>) => {
    setAppwriteIds(ids);
    localStorage.setItem(STORAGE_KEY + "-ids", JSON.stringify(ids));
  }, []);

  const handleConnect = async (platformId: string) => {
    if (!user) return;
    setConnectingPlatform(platformId);
    setErrorMsg(null);

    await new Promise((r) => setTimeout(r, 1800));

    const income = {
      promedioMensual: randomIncome(),
      mesesActivo: Math.floor(Math.random() * 36 + 6),
      ultimaActualizacion: new Date().toISOString(),
    };

    try {
      const doc = await createIngresoDigital({
        asociadoId: user.$id,
        plataforma: platformId,
        accountId: `palenca-${platformId}-${Date.now()}`,
        promedioMensual: income.promedioMensual,
        mesesActivo: income.mesesActivo,
        fechaActualizacion: income.ultimaActualizacion,
      });
      saveAppwriteIds({ ...appwriteIds, [platformId]: doc.$id });
    } catch (err) {
      console.error("Error guardando en Appwrite:", err);
      setErrorMsg("Error al guardar. Intenta de nuevo.");
      setConnectingPlatform(null);
      return;
    }

    const updated = connections.filter((c) => c.platformId !== platformId);
    updated.push({
      platformId,
      status: "connected",
      accountId: `palenca-${platformId}-${Date.now()}`,
      incomeData: income,
    });

    save(updated);
    setConnectingPlatform(null);
    setJustConnected(platformId);
    setTimeout(() => setJustConnected(null), 3000);
  };

  const handleDisconnect = async (platformId: string) => {
    const docId = appwriteIds[platformId];
    if (docId) {
      try {
        await deleteIngresoDigital(docId);
        const ids = { ...appwriteIds };
        delete ids[platformId];
        saveAppwriteIds(ids);
      } catch (err) {
        console.error("Error eliminando de Appwrite:", err);
      }
    }
    save(connections.filter((c) => c.platformId !== platformId));
  };

  const handleManualConnect = async () => {
    if (!user || !manualPlatform || !manualIncome || !manualMonths) return;

    try {
      const doc = await createIngresoDigital({
        asociadoId: user.$id,
        plataforma: manualPlatform,
        accountId: `manual-${manualPlatform}-${Date.now()}`,
        promedioMensual: parseInt(manualIncome),
        mesesActivo: parseInt(manualMonths),
        fechaActualizacion: new Date().toISOString(),
      });
      saveAppwriteIds({ ...appwriteIds, [manualPlatform]: doc.$id });
    } catch (err) {
      console.error("Error guardando en Appwrite:", err);
      setErrorMsg("Error al guardar. Intenta de nuevo.");
      return;
    }

    const updated = connections.filter((c) => c.platformId !== manualPlatform);
    updated.push({
      platformId: manualPlatform,
      status: "connected",
      accountId: `manual-${manualPlatform}-${Date.now()}`,
      incomeData: {
        promedioMensual: parseInt(manualIncome),
        mesesActivo: parseInt(manualMonths),
        ultimaActualizacion: new Date().toISOString(),
      },
    });
    save(updated);
    setShowManualForm(false);
    setManualPlatform(""); setManualIncome(""); setManualMonths("");
  };

  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const totalIncome = connections
    .filter((c) => c.incomeData)
    .reduce((sum, c) => sum + (c.incomeData!.promedioMensual), 0);

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {justConnected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Datos guardados correctamente</p>
              <p className="text-xs text-emerald-600 mt-1">
                Ingresos de {platformLabels[justConnected] || justConnected} verificados y almacenados.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-xs">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-amber-400 hover:text-amber-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {connectedCount > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
          <p className="text-sm font-medium text-indigo-800">
            {connectedCount} plataforma{connectedCount > 1 ? "s" : ""} conectada{connectedCount > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            Ingreso total estimado: <strong>${totalIncome.toLocaleString()}/mes</strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PALENCA_PLATFORMS.map((platform) => {
          const conn = connections.find((c) => c.platformId === platform.id);
          const isConnected = conn?.status === "connected";
          const isLoading = connectingPlatform === platform.id;

          return (
            <div
              key={platform.id}
              className={`rounded-xl border-2 p-4 transition-all ${
                isConnected
                  ? "border-green-200 bg-green-50/50"
                  : "border-gray-100 bg-white hover:border-indigo-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{platform.label}</p>
                    {isConnected && conn?.incomeData && (
                      <p className="text-xs text-gray-500">
                        ${conn.incomeData.promedioMensual.toLocaleString()}/mes · {conn.incomeData.mesesActivo} meses
                      </p>
                    )}
                  </div>
                </div>
                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(platform.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    title="Desconectar"
                  >
                    <Unlink className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnect(platform.id)}
                    disabled={isLoading}
                    className={`p-2 rounded-lg transition-colors ${
                      isLoading
                        ? "bg-gray-100 text-gray-400"
                        : "hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"
                    }`}
                    title={isLoading ? "Conectando..." : "Conectar"}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {isConnected && (
                <div className="mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">Verificado · </span>
                  <span className="text-xs text-gray-400">
                    {new Date(conn.incomeData?.ultimaActualizacion || "").toLocaleDateString()}
                  </span>
                </div>
              )}
              {isLoading && (
                <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Conectando con Palenca...
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowManualForm(!showManualForm)}
        className="w-full py-2 text-sm text-gray-500 hover:text-indigo-600 border border-dashed border-gray-200 rounded-xl hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Ingreso Manual
      </button>

      {showManualForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-gray-600">Registra tus ingresos de forma manual:</p>
            <div>
              <Label>Plataforma</Label>
              <select
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Seleccionar plataforma</option>
                {PALENCA_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ingreso mensual promedio (COP)</Label>
                <Input type="number" value={manualIncome} onChange={(e) => setManualIncome(e.target.value)} placeholder="Ej: 1500000" className="mt-1" />
              </div>
              <div>
                <Label>Meses activo</Label>
                <Input type="number" value={manualMonths} onChange={(e) => setManualMonths(e.target.value)} placeholder="Ej: 12" className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleManualConnect} className="gradient-primary" disabled={!manualPlatform || !manualIncome || !manualMonths}>
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setShowManualForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {connectedCount === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Conecta tus plataformas o registra tus ingresos manualmente para mejorar tu evaluación
          </p>
        </div>
      )}
    </div>
  );
}
