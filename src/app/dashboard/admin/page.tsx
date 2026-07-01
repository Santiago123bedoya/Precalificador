// src/app/dashboard/admin/page.tsx
"use client";

import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p>Solo visible para administradores.</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}