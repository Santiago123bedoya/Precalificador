import { NextResponse } from "next/server";
import { appwriteFetch, DB } from "@/lib/appwrite/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asociadoId = searchParams.get("asociadoId");

    const basePath = `/databases/${DB.id}/collections/${DB.collections.SOLICITUDES}/documents`;

    let allDocs: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const url = `${basePath}?limit=${limit}&offset=${offset}&orderDesc("fechaSolicitud")`;
      const result = await appwriteFetch(url);
      allDocs = allDocs.concat(result.documents || []);
      hasMore = (result.documents || []).length === limit;
      offset += limit;
    }

    if (asociadoId) {
      allDocs = allDocs.filter((d: any) => d.asociadoId === asociadoId);
    }

    const docs = allDocs.map((d: any) => {
      if (d.fechasolicitud && !d.fechaSolicitud) d.fechaSolicitud = d.fechasolicitud;
      return d;
    });

    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al cargar solicitudes", documents: [] },
      { status: 500 }
    );
  }
}
