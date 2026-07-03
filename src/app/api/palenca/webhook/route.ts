import { NextRequest, NextResponse } from "next/server";

const PALENCA_API_URL = process.env.PALENCA_API_URL || "https://sandbox.palenca.com/v1";
const PALENCA_SECRET_KEY = process.env.PALENCA_SECRET_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = body.data || {};
    const webhookAction = data.webhook_action || "";
    const accountId = data.account_id || "";
    const userId = data.user_id || "";
    const platform = data.platform || "";
    const externalId = data.external_id || "";
    const statusDetails = data.status_details || null;

    console.log(`[Palenca Webhook] ${webhookAction} | account=${accountId} user=${userId} platform=${platform}`);

    if (webhookAction === "login.success" && accountId) {
      const baseUrl = PALENCA_API_URL.replace(/\/+$/, "");
      const apiHeaders = {
        "Content-Type": "application/json",
        "x-api-key": PALENCA_SECRET_KEY,
      };

      const accountRes = await fetch(`${baseUrl}/accounts/${accountId}`, { headers: apiHeaders });
      if (!accountRes.ok) {
        console.error(`[Palenca Webhook] Error fetching account ${accountId}: ${accountRes.status}`);
        return NextResponse.json({ success: false, error: "account_fetch_failed" }, { status: 500 });
      }
      const accountJson = await accountRes.json();
      console.log(`[Palenca Webhook] Account data:`, JSON.stringify(accountJson.data, null, 2));

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const earningsRes = await fetch(`${baseUrl}/accounts/${accountId}/earnings/search`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          start_date: sixMonthsAgo.toISOString().split("T")[0],
          end_date: now.toISOString().split("T")[0],
        }),
      });

      if (earningsRes.ok) {
        const earningsJson = await earningsRes.json();
        if (earningsJson.success && earningsJson.data?.earnings) {
          const earnings = earningsJson.data.earnings;
          const monthSet = new Set<string>();
          let total = 0;
          for (const e of earnings) {
            if (e.earning_date) monthSet.add(e.earning_date.substring(0, 7));
            total += e.amount || 0;
          }
          const uniqueMonths = monthSet.size;
          const promedio = uniqueMonths > 0 ? Math.round(total / uniqueMonths) : 0;
          console.log(`[Palenca Webhook] Earnings: ${uniqueMonths} meses, promedio $${promedio}, ${earnings.length} registros`);
        }
      }
    }

    if (webhookAction === "login.error") {
      console.error(`[Palenca Webhook] Login error: account=${accountId} platform=${platform} detail=${statusDetails}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[Palenca Webhook] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
