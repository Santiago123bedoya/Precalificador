"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, UserPlus } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const { register, user } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<UserRole>("asociado");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(email, password, nombre, rol);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
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
          <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-gray-500 mt-1">Regístrate en el Precalificador</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" placeholder="Juan Pérez" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <Label htmlFor="rol">Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asociado">👤 Asociado</SelectItem>
                  <SelectItem value="gestor">📋 Gestor</SelectItem>
                  <SelectItem value="admin">👑 Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? "Registrando..." : "Registrarse"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
