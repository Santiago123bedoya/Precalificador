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

    const [accountRes, profileRes] = await Promise.all([
      fetch(`${baseUrl}/accounts/${accountId}`, {
        headers: { "Content-Type": "application/json", "x-api-key": PALENCA_SECRET_KEY },
      }),
      fetch(`${baseUrl}/accounts/${accountId}/profile`, {
        headers: { "Content-Type": "application/json", "x-api-key": PALENCA_SECRET_KEY },
      }).catch(() => null),
    ]);

    if (!accountRes.ok) {
      const errBody = await accountRes.text();
      return NextResponse.json({ success: false, error: `Palenca error: ${errBody}` }, { status: accountRes.status });
    }

    const accountJson = await accountRes.json();
    let profileJson = null;
    if (profileRes?.ok) {
      profileJson = await profileRes.json();
    }

    return NextResponse.json({
      success: true,
      data: {
        ...accountJson.data,
        profile: profileJson?.data || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Error interno" }, { status: 500 });
  }
}
