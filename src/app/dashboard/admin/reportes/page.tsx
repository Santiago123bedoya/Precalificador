// src/app/dashboard/admin/reportes/page.tsx
"use client";

import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminReportesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        <h1 className="text-3xl font-bold mb-6">📊 Reportes de Auditoría</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Solicitudes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Aprobadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rechazadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">0</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-gray-500 text-sm mt-4">
          Los reportes detallados estarán disponibles próximamente.
        </p>
      </div>
    </ProtectedRoute>
  );
}