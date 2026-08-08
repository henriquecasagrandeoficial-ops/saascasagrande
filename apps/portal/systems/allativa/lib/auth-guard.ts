import { auth } from "@/auth";

/**
 * Garante que há um administrador autenticado antes de executar uma
 * Server Action de mutação. Lança erro caso contrário.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Não autorizado. Faça login como administrador.");
  }
  return session;
}
