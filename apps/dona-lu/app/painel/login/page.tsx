import type { Metadata } from "next";

import { redirectToPortalLogin } from "@/lib/portal-redirect";

export const metadata: Metadata = {
  title: "Login — Painel Doceria Dona Lu",
};

/** Login legado: redireciona para o portal central. */
export default async function LoginPage() {
  await redirectToPortalLogin();
}
