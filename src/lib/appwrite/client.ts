// src/lib/appwrite/client.ts
import { Client, Account, Databases, Functions } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

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
  },
} as const;