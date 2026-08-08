import type { Metadata } from "next";
import { signOut } from "@/auth";
import { CakeSlice, Gem, LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SystemCard } from "@/components/system-card";

export const metadata: Metadata = {
  title: "Hub — Casagrande SaaS",
};

export default async function HubPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-10 sm:py-16">
      <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="font-display text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            Casagrande
          </p>
          <h1 className="mt-3 text-lg text-ink-200 sm:text-xl">
            Escolha o sistema
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Olá{session.user.email ? `, ${session.user.email}` : ""}. Selecione
            o ambiente para continuar.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-900/50 px-4 py-2.5 text-sm text-ink-200 transition hover:border-ink-500 hover:text-ink-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sair
          </button>
        </form>
      </header>

      <section className="grid animate-in fade-in slide-in-from-bottom-3 gap-5 duration-700 sm:grid-cols-2">
        <SystemCard
          href="/dona-lu/painel"
          title="Sistema de Confeitaria"
          description="Cardápio digital, pedidos, estoque, promoções e painel completo da confeitaria."
          accentClassName="bg-rose-500/40"
          icon={CakeSlice}
        />
        <SystemCard
          href="/allativa/painel"
          title="Sistema de Joias"
          description="Catálogo, insumos, ficha técnica e operação do ateliê de joias."
          accentClassName="bg-emerald-600/40"
          icon={Gem}
        />
      </section>
    </main>
  );
}
