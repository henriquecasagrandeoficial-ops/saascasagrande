import type { Metadata } from "next";

import { redirectToPortalLogin } from "@/lib/portal-redirect";

export const metadata: Metadata = {
  title: "Login — Painel AllAtiva Joias",
};

/** Login legado: redireciona para o portal central. */
export default async function LoginPage() {
  await redirectToPortalLogin();
}
