"use client";

import SolicitudForm from "@/components/forms/SolicitudForm";

export default function NuevaSolicitudPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud de Crédito</h1>
        <p className="text-sm text-gray-500 mt-1">Completa los pasos para solicitar tu crédito</p>
      </div>
      <SolicitudForm />
    </div>
  );
}
