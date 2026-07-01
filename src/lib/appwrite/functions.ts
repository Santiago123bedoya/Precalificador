// src/lib/appwrite/functions.ts
import { functions } from "./client";

export async function callFunction(functionId: string, data?: any): Promise<any> {
  const response = await functions.createExecution(
    functionId,
    JSON.stringify(data),
    false
  );
  return JSON.parse(response.responseBody);
}

export async function evaluarCredito(solicitudId: string): Promise<{
  success: boolean;
  evaluationId?: string;
  decision?: string;
  error?: string;
}> {
  const functionId = process.env.APPWRITE_FUNCTION_EVALUACION!;
  return callFunction(functionId, { solicitudId });
}