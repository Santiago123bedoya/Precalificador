import { NextRequest, NextResponse } from "next/server";
import { functions } from "@/lib/appwrite/client";

export async function POST(request: NextRequest) {
  try {
    const { solicitudId } = await request.json();

    const functionId = process.env.APPWRITE_FUNCTION_EVALUACION!;

    const execution = await functions.createExecution(
      functionId,
      JSON.stringify({ solicitudId }),
      false
    );

    const result = JSON.parse(execution.responseBody);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}