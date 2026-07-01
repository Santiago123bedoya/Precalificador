// src/app/dashboard/admin/usuarios/page.tsx
"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { databases, DB, account } from "@/lib/appwrite/client";
import type { Asociado, UserRole } from "@/lib/types";

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Asociado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "asociado" as UserRole,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const result = await databases.listDocuments(DB.id, DB.collections.ASOCIADOS);
        setUsuarios(result.documents as unknown as Asociado[]);
      } catch (err) {
        console.error("Error al cargar usuarios:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsuarios();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // 1. Crear en Auth
      const session = await account.create('unique()', formData.email, formData.password);
      console.log("✅ Usuario creado en Auth con ID:", session.$id);

      // 2. Crear en DB con ID automático y guardar authId
      await databases.createDocument(
        DB.id,
        DB.collections.ASOCIADOS,
        "unique()",
        {
          authId: session.$id,
          nombre: formData.nombre,
          email: formData.email,
          telefono: "",
          fechaRegistro: new Date().toISOString(),
          rol: formData.rol,
          ingresosVerificados: false,
          consistenciaIngresos: 50,
          responsabilidadPagos: 50,
          compromisoCooperativo: 50,
          perfilEndeudamiento: 50,
          capacidadAhorro: 50,
        }
      );

      setSuccess(`✅ Usuario ${formData.nombre} creado como ${formData.rol}`);
      setDialogOpen(false);
      setFormData({ nombre: "", email: "", password: "", rol: "asociado" });
      
      const result = await databases.listDocuments(DB.id, DB.collections.ASOCIADOS);
      setUsuarios(result.documents as unknown as Asociado[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    }
  };

  const getRolBadge = (rol: string) => {
    const styles: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      gestor: "bg-blue-100 text-blue-800",
      asociado: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      admin: "👑 Admin",
      gestor: "📋 Gestor",
      asociado: "👤 Asociado",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[rol] || ""}`}>
        {labels[rol] || rol}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">👥 Gestión de Usuarios</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                + Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                    ❌ {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm">
                    {success}
                  </div>
                )}
                <div>
                  <Label>Nombre completo</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Contraseña</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select
                    value={formData.rol}
                    onValueChange={(v) => setFormData({ ...formData, rol: v as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">👑 Admin</SelectItem>
                      <SelectItem value="gestor">📋 Gestor</SelectItem>
                      <SelectItem value="asociado">👤 Asociado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Crear Usuario
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios ({usuarios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Nombre</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Rol</th>
                    <th className="text-left py-2">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.$id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{u.nombre}</td>
                      <td className="py-2">{u.email}</td>
                      <td className="py-2">{getRolBadge(u.rol)}</td>
                      <td className="py-2">
                        {new Date(u.fechaRegistro).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}