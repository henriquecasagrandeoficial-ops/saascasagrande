import { auth } from "@/auth";
import { AdminShell } from "@dona-lu/components/admin/admin-shell";
import { redirectToPortalLogin } from "@dona-lu/lib/portal-redirect";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defesa em profundidade: além do middleware, garantimos a sessão aqui.
  const session = await auth();
  if (!session?.user) {
    await redirectToPortalLogin();
  }

  return <AdminShell>{children}</AdminShell>;
}
