import { useEffect, useState, useRef } from "react";
import { account, databases, DB } from "@/lib/appwrite/client";
import { Query } from "appwrite";
import type { Asociado, UserRole } from "@/lib/types";
import { USE_MOCK, MOCK_CREDENTIALS } from "@/lib/mock";
import { seedMockData } from "@/lib/seed-mock";

const AUTH_CACHE_TTL = 30000;

function createMockUser(email: string): Asociado {
  return {
    $id: `mock-${email.replace(/[^a-z]/g, "")}`,
    nombre: email === "admin@demo.com" ? "Admin Demo" : email === "gestor@demo.com" ? "Gestor Demo" : "Asociado Demo",
    email,
    telefono: "3001234567",
    fechaRegistro: new Date().toISOString(),
    rol: email === "admin@demo.com" ? "admin" : email === "gestor@demo.com" ? "gestor" : "asociado",
    ingresosVerificados: false,
    consistenciaIngresos: 60,
    responsabilidadPagos: 65,
    compromisoCooperativo: 70,
    perfilEndeudamiento: 50,
    capacidadAhorro: 45,
  };
}

const SESSION_KEY = "ia-coop-mock-session";

function getSavedEmail(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

function saveEmail(email: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SESSION_KEY, email); } catch { /* noop */ }
}

function clearSession() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
}

export function useAuth() {
  const [user, setUser] = useState<Asociado | null>(null);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<{ data: Asociado | null; time: number } | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (USE_MOCK) {
      seedMockData();
      const savedEmail = getSavedEmail();
      if (savedEmail) {
        const mockUser = createMockUser(savedEmail);
        cacheRef.current = { data: mockUser, time: Date.now() };
        setUser(mockUser);
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      const cached = cacheRef.current;
      if (cached && Date.now() - cached.time < AUTH_CACHE_TTL) {
        setUser(cached.data);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      try {
        const session = await account.get();
        if (session?.$id) {
          let result;
          try {
            result = await databases.listDocuments(DB.id, DB.collections.ASOCIADOS, [Query.equal("authId", session.$id)]);
          } catch {
            result = await databases.listDocuments(DB.id, DB.collections.ASOCIADOS, [Query.equal("email", session.email)]);
          }
          if (result.documents.length > 0) {
            const userData = result.documents[0] as unknown as Asociado;
            cacheRef.current = { data: userData, time: Date.now() };
            setUser(userData);
          } else {
            cacheRef.current = { data: null, time: Date.now() };
            setUser(null);
          }
        }
      } catch {
        cacheRef.current = { data: null, time: Date.now() };
        setUser(null);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    if (USE_MOCK) {
      const validEmails = Object.values(MOCK_CREDENTIALS).map(c => c.email);
      if (!validEmails.includes(email)) {
        throw new Error("Usuario no encontrado. Usuarios demo: admin@demo.com, gestor@demo.com, carlos@demo.com");
      }
      const mockUser = createMockUser(email);
      saveEmail(email);
      cacheRef.current = { data: mockUser, time: Date.now() };
      setUser(mockUser);
      return mockUser;
    }

    try {
      try { await account.deleteSessions(); } catch {}
      await new Promise((r) => setTimeout(r, 300));
      await account.createEmailPasswordSession(email, password);
      const session = await account.get();

      let result;
      try {
        result = await databases.listDocuments(DB.id, DB.collections.ASOCIADOS, [Query.equal("authId", session.$id)]);
      } catch {
        result = await databases.listDocuments(DB.id, DB.collections.ASOCIADOS, [Query.equal("email", email)]);
      }
      if (result.documents.length === 0) {
        throw new Error("Usuario no encontrado en la base de datos.");
      }
      const asociado = result.documents[0] as unknown as Asociado;
      cacheRef.current = { data: asociado, time: Date.now() };
      setUser(asociado);
      return asociado;
    } catch (error: any) {
      console.error("Error en login:", error);
      throw new Error(error?.message || "Error de conexión");
    }
  };

  const logout = async () => {
    if (USE_MOCK) {
      clearSession();
    } else {
      try { await account.deleteSession("current"); } catch {}
    }
    cacheRef.current = null;
    setUser(null);
  };

  const register = async (email: string, password: string, nombre: string, rol: UserRole = "asociado") => {
    if (USE_MOCK) {
      return createMockUser(email);
    }
    try { await account.deleteSessions(); } catch {}
    const session = await account.create('unique()', email, password);
    await databases.createDocument(DB.id, DB.collections.ASOCIADOS, "unique()", {
      authId: session.$id, nombre, email, telefono: "",
      fechaRegistro: new Date().toISOString(), rol,
      ingresosVerificados: false,
      consistenciaIngresos: 50, responsabilidadPagos: 50,
      compromisoCooperativo: 50, perfilEndeudamiento: 50, capacidadAhorro: 50,
    });
    await new Promise((r) => setTimeout(r, 300));
    await account.createEmailPasswordSession(email, password);
    const result = await databases.listDocuments(DB.id, DB.collections.ASOCIADOS, [Query.equal("authId", session.$id)]);
    const userData = result.documents[0] as unknown as Asociado;
    cacheRef.current = { data: userData, time: Date.now() };
    setUser(userData);
    return userData;
  };

  return { user, loading, login, logout, register, isAuthenticated: !!user };
}
