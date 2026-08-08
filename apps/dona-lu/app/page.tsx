import { redirect } from "next/navigation";

/** Entrada do app: sem vitrine pública — vai direto ao painel. */
export default function Home() {
  redirect("/painel");
}
