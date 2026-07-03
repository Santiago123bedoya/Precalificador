import { NextRequest, NextResponse } from "next/server";

const PALENCA_API_URL = process.env.PALENCA_API_URL || "https://sandbox.palenca.com/v1";
const PALENCA_SECRET_KEY = process.env.PALENCA_SECRET_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();
    if (!accountId) {
      return NextResponse.json({ success: false, error: "accountId es requerido" }, { status: 400 });
    }

    const baseUrl = PALENCA_API_URL.replace(/\/+$/, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": PALENCA_SECRET_KEY,
    };

    const accountRes = await fetch(`${baseUrl}/accounts/${accountId}`, { headers });
    if (!accountRes.ok) {
      const errBody = await accountRes.text();
      return NextResponse.json({ success: false, error: `Palenca account error: ${errBody}` }, { status: accountRes.status });
    }
    const accountData = await accountRes.json();

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const startDate = sixMonthsAgo.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    const earningsRes = await fetch(`${baseUrl}/accounts/${accountId}/earnings/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });

    let earningsData = { earnings: [] as any[], promedioMensual: 0, mesesActivo: 0, totalMeses: 0 };

    if (earningsRes.ok) {
      const earningsJson = await earningsRes.json();
      if (earningsJson.success && earningsJson.data?.earnings) {
        const earnings = earningsJson.data.earnings;
        const monthsWithEarnings = new Set<string>();
        let totalAmount = 0;

        for (const e of earnings) {
          if (e.earning_date) {
            const month = e.earning_date.substring(0, 7);
            monthsWithEarnings.add(month);
          }
          totalAmount += e.amount || 0;
        }

        const uniqueMonths = monthsWithEarnings.size;
        earningsData = {
          earnings,
          promedioMensual: uniqueMonths > 0 ? Math.round(totalAmount / uniqueMonths) : 0,
          mesesActivo: uniqueMonths,
          totalMeses: earnings.length > 0 ? uniqueMonths : 0,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        accountId: accountData.data?.account_id || accountId,
        platform: accountData.data?.platform || "unknown",
        country: accountData.data?.country || "co",
        status: accountData.data?.status || "unknown",
        identifier: accountData.data?.identifier || null,
        lastConnection: accountData.data?.last_successful_connection || null,
        ...earningsData,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Error interno" }, { status: 500 });
  }
}
