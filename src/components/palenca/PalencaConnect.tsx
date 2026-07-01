"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Link2, Unlink } from "lucide-react";

const PALENCA_PLATFORMS = [
  { id: "uber", label: "Uber", icon: "🚗", color: "bg-gray-100 text-gray-700" },
  { id: "rappi", label: "Rappi", icon: "🛵", color: "bg-green-50 text-green-700" },
  { id: "didi", label: "Didi", icon: "🚙", color: "bg-yellow-50 text-yellow-700" },
  { id: "uber_eats", label: "Uber Eats", icon: "🍔", color: "bg-red-50 text-red-700" },
  { id: "mercado_libre", label: "Mercado Libre", icon: "📦", color: "bg-blue-50 text-blue-700" },
  { id: "diversos", label: "Plataformas Múltiples", icon: "🔗", color: "bg-purple-50 text-purple-700" },
];

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface PlatformConnection {
  platformId: string;
  status: ConnectionStatus;
  accountId?: string;
  incomeData?: {
    promedioMensual: number;
    mesesActivo: number;
    ultimaActualizacion: string;
  };
}

const MOCK_PALENCA_KEY = "ia-coop-mock-palenca";

function loadConnections(): PlatformConnection[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(MOCK_PALENCA_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveConnections(connections: PlatformConnection[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOCK_PALENCA_KEY, JSON.stringify(connections));
}

function generateMockIncome(platformId: string) {
  const data: Record<string, { promedio: number; minMeses: number; maxMeses: number }> = {
    uber: { promedio: 1800000, minMeses: 6, maxMeses: 36 },
    rappi: { promedio: 1500000, minMeses: 3, maxMeses: 24 },
    didi: { promedio: 1200000, minMeses: 4, maxMeses: 30 },
    uber_eats: { promedio: 1600000, minMeses: 5, maxMeses: 28 },
    mercado_libre: { promedio: 2500000, minMeses: 8, maxMeses: 48 },
    diversos: { promedio: 3000000, minMeses: 12, maxMeses: 60 },
  };
  const info = data[platformId] || { promedio: 1000000, minMeses: 3, maxMeses: 12 };
  const meses = Math.floor(Math.random() * (info.maxMeses - info.minMeses) + info.minMeses);
  return {
    promedioMensual: info.promedio + Math.floor(Math.random() * 500000 - 250000),
    mesesActivo: meses,
    ultimaActualizacion: new Date().toISOString(),
  };
}

interface PalencaConnectProps {
  onConnectionsChange?: (connections: PlatformConnection[]) => void;
}

export function PalencaConnect({ onConnectionsChange }: PalencaConnectProps) {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConnections(loadConnections());
  }, []);

  const updateConnections = (updated: PlatformConnection[]) => {
    setConnections(updated);
    saveConnections(updated);
    onConnectionsChange?.(updated);
  };

  const handleConnect = async (platformId: string) => {
    setConnectingId(platformId);

    const exists = connections.find((c) => c.platformId === platformId);
    const updated = connections.filter((c) => c.platformId !== platformId);

    updated.push({
      platformId,
      status: "connecting",
    });
    updateConnections(updated);

    try {
      const publicKey = process.env.NEXT_PUBLIC_PALENCA_PUBLIC_KEY;
      if (!publicKey || publicKey.startsWith("public_tu")) {
        await new Promise((r) => setTimeout(r, 1500));
        const incomeData = generateMockIncome(platformId);
        const finalUpdated = connections.filter((c) => c.platformId !== platformId);
        finalUpdated.push({
          platformId,
          status: "connected",
          accountId: `mock-${platformId}-${Date.now()}`,
          incomeData,
        });
        updateConnections(finalUpdated);
      } else {
        const PalencaLink = (await import("@palenca/palenca-link")).default;
        const containerId = `palenca-container-${platformId}`;

        if (containerRef.current) {
          const container = document.createElement("div");
          container.id = containerId;
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(container);

          new PalencaLink({
            apiKey: publicKey,
            clientId: process.env.NEXT_PUBLIC_PALENCA_WIDGET_ID || "",
            userId: `user-${Date.now()}`,
            platform: platformId,
            sandbox: true,
            sandboxWebhookUrl: `${window.location.origin}/api/webhooks/palenca`,
            containerName: containerId,
            appearance: {
              primaryColor: "#4F46E5",
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif",
            },
          });
        }
      }
    } catch (err) {
      console.error("Error conectando Palenca:", err);
      const errorUpdated = connections.filter((c) => c.platformId !== platformId);
      errorUpdated.push({ platformId, status: "error" });
      updateConnections(errorUpdated);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = (platformId: string) => {
    const updated = connections.filter((c) => c.platformId !== platformId);
    updateConnections(updated);
  };

  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const totalIncome = connections
    .filter((c) => c.status === "connected" && c.incomeData)
    .reduce((sum, c) => sum + (c.incomeData?.promedioMensual || 0), 0);

  return (
    <div className="space-y-4">
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
          const isLoading = conn?.status === "connecting" || connectingId === platform.id;
          const hasError = conn?.status === "error";

          return (
            <div
              key={platform.id}
              className={`rounded-xl border-2 p-4 transition-all ${
                isConnected
                  ? "border-green-200 bg-green-50/50"
                  : hasError
                  ? "border-red-200 bg-red-50/50"
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
                    {hasError && <p className="text-xs text-red-500">Error de conexión</p>}
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
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {isConnected && (
                <div className="mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">Verificado</span>
                  <span className="text-xs text-gray-300 mx-1">·</span>
                  <span className="text-xs text-gray-400">
                    {new Date(conn.incomeData?.ultimaActualizacion || "").toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div ref={containerRef} className="hidden" />
    </div>
  );
}
