import { Client, Account, Databases, Functions } from "appwrite";

function envOrThrow(name: string): string {
  const val = process.env[name];
  if (!val) {
    if (typeof window !== "undefined") return "";
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return val;
}

const PROJECT_ID = envOrThrow("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const DATABASE_ID = envOrThrow("NEXT_PUBLIC_APPWRITE_DATABASE_ID");
const API_KEY = envOrThrow("APPWRITE_API_KEY");
const ENDPOINT = envOrThrow("NEXT_PUBLIC_APPWRITE_ENDPOINT");

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
