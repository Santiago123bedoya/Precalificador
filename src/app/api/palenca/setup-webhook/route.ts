import { NextRequest, NextResponse } from "next/server";

const PALENCA_API_URL = process.env.PALENCA_API_URL || "https://sandbox.palenca.com/v1";
const PALENCA_SECRET_KEY = process.env.PALENCA_SECRET_KEY || "";
const WIDGET_ID = process.env.NEXT_PUBLIC_PALENCA_WIDGET_ID || "";

export async function POST(req: NextRequest) {
  try {
    const { url, name } = await req.json();
    if (!url) {
      return NextResponse.json({ success: false, error: "URL es requerida (ej: https://tu-dominio.com/api/palenca/webhook)" }, { status: 400 });
    }
    if (!WIDGET_ID) {
      return NextResponse.json({ success: false, error: "NEXT_PUBLIC_PALENCA_WIDGET_ID no está configurado en .env.local" }, { status: 400 });
    }
    if (!PALENCA_SECRET_KEY) {
      return NextResponse.json({ success: false, error: "PALENCA_SECRET_KEY no está configurado en .env.local" }, { status: 400 });
    }

    const baseUrl = PALENCA_API_URL.replace(/\/+$/, "");
    const isSandbox = baseUrl.includes("sandbox");

    const body = {
      url: url.replace(/\/+$/, ""),
      name: name || `IA-COOP Webhook ${isSandbox ? "(Sandbox)" : "(Producción)"}`,
      widget_id: WIDGET_ID,
      is_sandbox: isSandbox,
      sign_request: false,
    };

    console.log("[Palenca] Creating webhook:", JSON.stringify(body, null, 2));

    const res = await fetch(`${baseUrl}/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PALENCA_SECRET_KEY,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      const errorMsg = json?.error?.message || json?.error || "Error desconocido";
      return NextResponse.json({ success: false, error: errorMsg, details: json }, { status: res.status });
    }

    console.log("[Palenca] Webhook created:", JSON.stringify(json, null, 2));

    return NextResponse.json({
      success: true,
      data: {
        webhookId: json.data?.webhook_id,
        url: json.data?.url,
        name: json.data?.name,
        isSandbox: json.data?.is_sandbox,
        isActive: json.data?.is_active,
      },
    });
  } catch (err: any) {
    console.error("[Palenca] Error creating webhook:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!PALENCA_SECRET_KEY || !WIDGET_ID) {
      return NextResponse.json({
        success: false,
        error: "Faltan variables de entorno: PALENCA_SECRET_KEY o NEXT_PUBLIC_PALENCA_WIDGET_ID",
      }, { status: 400 });
    }

    const baseUrl = PALENCA_API_URL.replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/webhooks`, {
      headers: { "x-api-key": PALENCA_SECRET_KEY },
    });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json({ success: false, error: json?.error?.message || "Error" }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
