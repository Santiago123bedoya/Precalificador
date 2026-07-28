import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const BASE = `${ENDPOINT}/databases/${DATABASE_ID}/collections/evaluaciones/documents`;
const H = {
  "Content-Type": "application/json",
  "X-Appwrite-Key": API_KEY!,
  "X-Appwrite-Project": PROJECT_ID!,
};

export async function GET(request: NextRequest) {
  try {
    const sid = request.nextUrl.searchParams.get("solicitudId");
    if (!sid) {
      return NextResponse.json({ success: false, error: "solicitudId required" }, { status: 400 });
    }
    const res = await fetch(
      `${BASE}?queries%5B0%5D=equal%28%22solicitudId%22%2C%22${encodeURIComponent(sid)}%22%29`,
      { headers: H }
    );
    if (!res.ok) {
      // Fallback: list all and filter
      const allRes = await fetch(BASE, { headers: H });
      const allData = await allRes.json();
      const allDocs = allData.documents || [];
      const filtered = allDocs.filter((d: any) => d.solicitudId === sid);
      return NextResponse.json({ success: true, documents: filtered });
    }
    const data = await res.json();
    const docs = data.documents || [];
    return NextResponse.json({ success: true, documents: docs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(BASE, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        documentId: "unique()",
        data: {
          solicitudId: body.solicitudId,
          asociadoId: body.asociadoId,
          fechaEvaluacion: new Date().toISOString(),
          puntajeRiesgo: body.puntajeRiesgo,
          consistenciaIngresos: body.consistenciaIngresos,
          responsabilidadPagos: body.responsabilidadPagos,
          compromisoCooperativo: body.compromisoCooperativo,
          perfilEndeudamiento: body.perfilEndeudamiento,
          capacidadAhorro: body.capacidadAhorro,
          decision: body.decision,
          explicacionResumen: body.explicacionResumen,
          montoRecomendado: body.montoRecomendado ?? 0,
          recomendaciones: JSON.stringify(body.recomendaciones || []),
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Error saving evaluation:", res.status, errText);
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, id: data.$id });
  } catch (error: any) {
    console.error("Error in evaluations route:", error?.message);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
