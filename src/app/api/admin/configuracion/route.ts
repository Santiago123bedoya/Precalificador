import { NextResponse } from "next/server";
import { appwriteFetch, DB } from "@/lib/appwrite/client";

const CONFIG_COLLECTION = "configuracion";
const DB_PATH = `/databases/${DB.id}`;
const QUERY = `query=${encodeURIComponent('equal("tipo","credito")')}`;

export async function GET() {
  try {
    const result = await appwriteFetch(
      `${DB_PATH}/collections/${CONFIG_COLLECTION}/documents?${QUERY}`
    );
    if (result.documents.length > 0) {
      const doc = result.documents[0];
      return NextResponse.json({
        tasaInteresAnual: parseFloat(doc.tasaInteresAnual),
        montoMinimo: parseFloat(doc.montoMinimo),
        montoMaximo: parseFloat(doc.montoMaximo),
        plazoMinimo: doc.plazoMinimo,
        plazoMaximo: doc.plazoMaximo,
        umbralAprobacion: doc.umbralAprobacion,
        nombreCooperativa: doc.nombreCooperativa || "IA-COOP Cooperativa",
        politicas: doc.politicas ? JSON.parse(doc.politicas) : {},
      });
    }
    return NextResponse.json({
      tasaInteresAnual: 18.0,
      montoMinimo: 100000,
      montoMaximo: 50000000,
      plazoMinimo: 1,
      plazoMaximo: 60,
      umbralAprobacion: 60,
      nombreCooperativa: "IA-COOP Cooperativa",
      politicas: {},
    });
  } catch {
    return NextResponse.json({
      tasaInteresAnual: 18.0,
      montoMinimo: 100000,
      montoMaximo: 50000000,
      plazoMinimo: 1,
      plazoMaximo: 60,
      umbralAprobacion: 60,
      nombreCooperativa: "IA-COOP Cooperativa",
      politicas: {},
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const existing = await appwriteFetch(
      `${DB_PATH}/collections/${CONFIG_COLLECTION}/documents?${QUERY}`
    );

    const data = {
      tipo: "credito",
      nombreCooperativa: body.politicas?.nombreCooperativa || "IA-COOP Cooperativa",
      tasaInteresAnual: String(body.tasaInteresAnual ?? 18.0),
      montoMinimo: String(body.montoMinimo ?? 100000),
      montoMaximo: String(body.montoMaximo ?? 50000000),
      plazoMinimo: body.plazoMinimo ?? 1,
      plazoMaximo: body.plazoMaximo ?? 60,
      umbralAprobacion: body.umbralAprobacion ?? 60,
      politicas: JSON.stringify(body.politicas ?? {}),
      activo: true,
    };

    if (existing.documents.length > 0) {
      await appwriteFetch(
        `${DB_PATH}/documents/${existing.documents[0].$id}`,
        "PATCH",
        { data }
      );
    } else {
      await appwriteFetch(
        `${DB_PATH}/collections/${CONFIG_COLLECTION}/documents`,
        "POST",
        { documentId: "unique()", data }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al guardar configuracion" },
      { status: 500 }
    );
  }
}
