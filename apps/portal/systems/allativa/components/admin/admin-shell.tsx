"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gem,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Tags,
  X,
} from "lucide-react";

import { cn } from "@allativa/lib/utils";
import { PendingOrdersBadge } from "@allativa/components/admin/pending-orders-badge";

const links = [
  { href: "/allativa/painel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/allativa/painel/categorias", label: "Categorias", icon: Tags },
  { href: "/allativa/painel/produtos", label: "Produtos", icon: Package },
  { href: "/allativa/painel/insumos", label: "Insumos", icon: Gem },
  { href: "/allativa/painel/ficha-tecnica", label: "Ficha Técnica", icon: Calculator },
  { href: "/allativa/painel/pedidos/novo", label: "Novo Pedido", icon: ShoppingCart },
  {
    href: "/allativa/painel/pedidos",
    label: "Pedidos",
    icon: ClipboardList,
    exact: true,
    badge: true,
  },
  { href: "/allativa/painel/pedidos/historico", label: "Histórico", icon: History },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false); // desktop: minimizada
  const [mobileOpen, setMobileOpen] = useState(false); // mobile: gaveta

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Barra superior (apenas mobile) */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-slate-700 hover:bg-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Gem className="h-5 w-5 text-brand-600" />
          AllAtiva Joias
        </span>
      </header>

      {/* Overlay da gaveta (apenas mobile) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-100 transition-all duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <div className="flex h-[57px] items-center justify-between border-b border-slate-800 px-4">
          <span
            className={cn(
              "flex items-center gap-2",
              collapsed && "lg:hidden"
            )}
          >
            <Gem className="h-5 w-5 shrink-0 text-brand-300" />
            <span className="font-serif text-lg font-semibold">
              AllAtiva Joias
            </span>
          </span>

          {/* Toggle de colapsar (desktop) */}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
            className="hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:block"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>

          {/* Fechar gaveta (mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {links.map(({ href, label, icon: Icon, exact, badge }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(href, exact)
                  ? "bg-brand-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
                collapsed && "lg:justify-center lg:px-0"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>{label}</span>
              {badge && <PendingOrdersBadge collapsed={collapsed} />}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={() =>
              signOut({ callbackUrl: `${window.location.origin}/login` })
            }
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white",
              collapsed && "lg:justify-center lg:px-0"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div
        className={cn(
          "transition-all duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
