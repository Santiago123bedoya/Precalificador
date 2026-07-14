import { Client, Account, Databases, Functions } from "appwrite";

const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";

function getApiKey(): string {
  if (typeof window !== "undefined") return "";
  return process.env.APPWRITE_API_KEY || "";
}

const API_KEY = getApiKey();
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";

export const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

export const DB = {
  id: DATABASE_ID,
  collections: {
    ASOCIADOS: "asociados",
    SOLICITUDES: "solicitudes_credito",
    EVALUACIONES: "evaluaciones",
    INGRESOS_DIGITALES: "ingresos_digitales",
    CONSENTIMIENTOS: "consentimientos",
    CONFIGURACION: "configuracion",
    SERVICIOS_PUBLICOS: "servicios_publicos",
    CUESTIONARIOS: "cuestionarios_socio_conductuales",
  },
} as const;

export async function appwriteFetch(
  path: string,
  method: string = "GET",
  body?: any
) {
  const url = `${ENDPOINT}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Appwrite-Key": API_KEY,
    "X-Appwrite-Project": PROJECT_ID,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Appwrite error ${res.status}: ${text}`);
  }

  return res.json();
}
