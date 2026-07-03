import { NextRequest, NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { radar, monto_solicitado, plazo_meses, nombre } = body;

    if (!radar) {
      return NextResponse.json(
        { success: false, error: "Datos del radar requeridos" },
        { status: 400 }
      );
    }

    const response = await fetch(`${ML_SERVICE_URL}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consistencia_ingresos: radar.consistenciaIngresos || 50,
        responsabilidad_pagos: radar.responsabilidadPagos || 50,
        compromiso_cooperativo: radar.compromisoCooperativo || 50,
        perfil_endeudamiento: 100 - (radar.perfilEndeudamiento || 50),
        capacidad_ahorro: radar.capacidadAhorro || 50,
        monto_solicitado: monto_solicitado || 5000000,
        plazo_meses: plazo_meses || 24,
        nombre,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ML Service error:", response.status, errorText);
      return NextResponse.json(
        { success: false, error: `ML Service error: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();

    result.radar = {
      consistenciaIngresos: radar.consistenciaIngresos || 50,
      responsabilidadPagos: radar.responsabilidadPagos || 50,
      compromisoCooperativo: radar.compromisoCooperativo || 50,
      perfilEndeudamiento: radar.perfilEndeudamiento || 50,
      capacidadAhorro: radar.capacidadAhorro || 50,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error calling ML service:", error?.message);

    if (error?.cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          error: "ML Service no disponible. Ejecuta: cd ml-service && python app.py",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: error?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
