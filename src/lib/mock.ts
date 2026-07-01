// Permite cambiar entre Appwrite real y modo simulado
// Cambia a true para probar sin conexión a Appwrite
export const USE_MOCK = true;

export const MOCK_CREDENTIALS = {
  admin: { email: "admin@demo.com", password: "cualquier123" },
  gestor: { email: "gestor@demo.com", password: "cualquier123" },
  asociado: { email: "carlos@demo.com", password: "cualquier123" },
};

export const MOCK_USERS = [
  { role: "👑 Admin", email: "admin@demo.com", pass: "cualquier123" },
  { role: "📋 Gestor", email: "gestor@demo.com", pass: "cualquier123" },
  { role: "👤 Asociado", email: "carlos@demo.com", pass: "cualquier123" },
];
