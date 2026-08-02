"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Newspaper,
  Briefcase,
  PieChart,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

// Nova estrutura do menu (apenas 6 itens)
const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/assets", label: "Assets", icon: TrendingUp },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/indices", label: "Indices", icon: PieChart },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/portfolios", label: "Portfolios", icon: Briefcase },
];

const COLLAPSED_KEY = "screener:sidebar:collapsed";

export function Sidebar() {
  const pathname = usePathname();
  // Inicializa direto do localStorage (lazy init evita setState in effect).
  // No SSR, retorna false (servidor nao tem localStorage).
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Persiste estado quando muda (efeito secundario: escrever no storage).
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore quota
    }
  }, [collapsed]);

  // Current user state
  const [user, setUser] = useState<{ userId: number; username: string } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-border bg-surface flex flex-col transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "px-6 py-5 border-b border-border-subtle flex items-center",
          collapsed ? "justify-center px-0" : "justify-between",
        )}
      >
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-foreground tracking-tight">
              Screener
            </span>
          </Link>
        )}
        {collapsed && (
          <Link
            href="/"
            className="w-7 h-7 rounded-md bg-accent flex items-center justify-center"
          >
            <span className="text-white font-bold text-sm">S</span>
          </Link>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                collapsed ? "justify-center" : "",
                active
                  ? "bg-foreground text-background font-medium"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-elevated",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "border-t border-border-subtle",
          collapsed ? "p-2" : "px-3 py-2",
        )}
      >
        {!collapsed && (
          <div className="mb-2 flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <Link
                  href="/portfolios"
                  className="text-xs text-text-secondary hover:text-foreground truncate"
                >
                  @{user.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-text-muted hover:text-negative"
                >
                  sair
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <Link href="/login" className="text-xs text-accent hover:underline">
                  Entrar
                </Link>
                <Link href="/signup" className="text-xs text-text-muted hover:text-foreground">
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "w-full flex items-center gap-2 text-xs text-text-muted hover:text-foreground hover:bg-surface-elevated rounded-md transition-colors",
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span>Recolher menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
