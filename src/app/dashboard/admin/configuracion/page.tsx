// src/app/dashboard/admin/configuracion/page.tsx
"use client";

import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminConfiguracionPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        <h1 className="text-3xl font-bold mb-6">⚙️ Configuración</h1>
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Aquí podrás configurar los parámetros del sistema.
            </p>
            <Button variant="outline">Guardar Configuración</Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}