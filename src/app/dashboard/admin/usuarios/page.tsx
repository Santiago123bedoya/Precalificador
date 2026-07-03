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
} from "@/components/ui/dialog";
import { databases, DB } from "@/lib/appwrite/client";
import type { Asociado, UserRole } from "@/lib/types";
import { Pencil, UserPlus, Trash2 } from "lucide-react";

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Asociado[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<Asociado | null>(null);
  const [createData, setCreateData] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "asociado" as UserRole,
  });
  const [editData, setEditData] = useState({
    nombre: "",
    rol: "asociado" as UserRole,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  useEffect(() => { fetchUsuarios(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const { account } = await import("@/lib/appwrite/client");
      const session = await account.create('unique()', createData.email, createData.password);
      await databases.createDocument(
        DB.id,
        DB.collections.ASOCIADOS,
        "unique()",
        {
          authId: session.$id,
          nombre: createData.nombre,
          email: createData.email,
          telefono: "",
          fechaRegistro: new Date().toISOString(),
          rol: createData.rol,
          ingresosVerificados: false,
          consistenciaIngresos: 50,
          responsabilidadPagos: 50,
          compromisoCooperativo: 50,
          perfilEndeudamiento: 50,
          capacidadAhorro: 50,
        }
      );
      setSuccess(`Usuario ${createData.nombre} creado como ${createData.rol}`);
      setCreateOpen(false);
      setCreateData({ nombre: "", email: "", password: "", rol: "asociado" });
      await fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setError("");
    try {
      await databases.updateDocument(
        DB.id,
        DB.collections.ASOCIADOS,
        editUser.$id,
        {
          nombre: editData.nombre,
          rol: editData.rol,
        }
      );
      setSuccess(`Usuario ${editData.nombre} actualizado`);
      setEditUser(null);
      await fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const handleDeleteUser = async (user: Asociado) => {
    if (!confirm(`¿Eliminar a ${user.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await databases.deleteDocument(DB.id, DB.collections.ASOCIADOS, user.$id);
      setSuccess(`Usuario ${user.nombre} eliminado`);
      await fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const openEdit = (user: Asociado) => {
    setEditUser(user);
    setEditData({ nombre: user.nombre, rol: user.rol });
  };

  const getRolBadge = (rol: string) => {
    const styles: Record<string, string> = {
      admin: "bg-purple-100 text-purple-700",
      gestor: "bg-blue-100 text-blue-700",
      asociado: "bg-green-100 text-green-700",
    };
    const labels: Record<string, string> = {
      admin: "Admin",
      gestor: "Gestor",
      asociado: "Asociado",
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
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-500 mt-1">{usuarios.length} usuarios registrados</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gradient-primary">
            <UserPlus className="h-4 w-4 mr-2" /> Crear Usuario
          </Button>
        </div>

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Registro</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.$id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">{getRolBadge(u.rol)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.fechaRegistro).toLocaleDateString("es-CO")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog Crear */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label>Nombre completo</Label>
                <Input
                  value={createData.nombre}
                  onChange={(e) => setCreateData({ ...createData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
              </div>
              <div>
                <Label>Rol</Label>
                <Select
                  value={createData.rol}
                  onValueChange={(v) => setCreateData({ ...createData, rol: v as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="asociado">Asociado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full gradient-primary">Crear Usuario</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar */}
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={editData.nombre}
                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select
                  value={editData.rol}
                  onValueChange={(v) => setEditData({ ...editData, rol: v as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="asociado">Asociado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gradient-primary">Guardar Cambios</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
