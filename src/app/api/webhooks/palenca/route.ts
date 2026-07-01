import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (event === "login.success" && data?.accountId) {
      const platform = data.platform || "desconocida";
      const promedio = data.income?.average_monthly_income || 0;
      const meses = data.income?.months_active || 0;

      console.log(`✅ Palenca: ${platform} conectada — accountId: ${data.accountId}`);

      return NextResponse.json({
        success: true,
        data: {
          platformId: platform,
          accountId: data.accountId,
          promedioMensual: promedio,
          mesesActivo: meses,
        },
      });
    }

    console.log("📨 Webhook Palenca:", event, data?.accountId ? `(${data.accountId})` : "");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error en webhook Palenca:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "Palenca webhook endpoint" });
}
