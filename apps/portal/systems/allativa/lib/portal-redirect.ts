import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { portalLoginUrl, portalOriginFromHeaders } from "@casagrande/auth";

/** Redireciona para o login do portal (fora do basePath deste app). */
export async function redirectToPortalLogin(): Promise<never> {
  const h = await headers();
  const origin = portalOriginFromHeaders({
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
  });
  redirect(portalLoginUrl(origin));
}
