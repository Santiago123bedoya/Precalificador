"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { USE_MOCK, MOCK_USERS } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Sparkles, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">IA-COOP</h1>
          <p className="text-gray-500 mt-1">Precalificador Crediticio Ético</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl text-sm text-red-700 border border-red-100">
              <LogIn className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {USE_MOCK && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Acceso rápido - Demo
              </p>
              <div className="grid gap-2">
                {MOCK_USERS.map((u) => {
                  const icons: Record<string, string> = { "👑 Admin": "👑", "📋 Gestor": "📋", "👤 Asociado": "👤" };
                  const colors: Record<string, string> = {
                    "👑 Admin": "border-purple-200 hover:border-purple-400 hover:bg-purple-50",
                    "📋 Gestor": "border-blue-200 hover:border-blue-400 hover:bg-blue-50",
                    "👤 Asociado": "border-green-200 hover:border-green-400 hover:bg-green-50",
                  };
                  const badges: Record<string, string> = {
                    "👑 Admin": "text-purple-700 bg-purple-50",
                    "📋 Gestor": "text-blue-700 bg-blue-50",
                    "👤 Asociado": "text-green-700 bg-green-50",
                  };
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => { setEmail(u.email); setPassword(u.pass); }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${colors[u.role] || ""}`}
                    >
                      <span className="text-xl">{icons[u.role] || "👤"}</span>
                      <div className="flex-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badges[u.role] || ""}`}>
                          {u.role}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">o ingresa con tu cuenta</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>
          </form>
        </div>

        {USE_MOCK && (
          <p className="text-xs text-gray-400 text-center">
            Modo simulado — cualquier contraseña funciona con los usuarios demo
          </p>
        )}
      </div>
    </div>
  );
}
