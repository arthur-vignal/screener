"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Newspaper,
  Briefcase,
  PieChart,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  LogOut,
  ChevronUp,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/assets", label: "Assets", icon: TrendingUp },
  { href: "/analysis", label: "Analysis", icon: BarChart3, exact: true },
  { href: "/analysis/stats", label: "Mercado", icon: BarChart3, exact: true },
  { href: "/indices", label: "Indices", icon: PieChart },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/portfolios", label: "Portfolios", icon: Briefcase },
];

const COLLAPSED_KEY = "screener:sidebar:collapsed";

type Session = { userId: string; username: string };

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore quota
    }
  }, [collapsed]);

  const [user, setUser] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hydrate user state from /api/auth/me
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-hairline bg-canvas-soft flex flex-col transition-[width] duration-250 ease-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Header / Logo */}
      <div
        className={cn(
          "px-5 py-5 border-b border-hairline flex items-center",
          collapsed ? "justify-center px-0" : "justify-between",
        )}
      >
        {!collapsed ? (
          <Link
            href="/"
            className="flex items-center gap-2 group press transition-transform"
          >
            <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center shadow-[0_0_0_0_var(--brand-glow)] group-hover:shadow-[0_0_0_4px_var(--brand-soft)] transition-shadow duration-200">
              <span className="text-on-brand font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-ink tracking-tight">
              Screener
            </span>
          </Link>
        ) : (
          <Link
            href="/"
            className="w-7 h-7 rounded-md bg-brand flex items-center justify-center press"
            aria-label="Home"
          >
            <span className="text-on-brand font-bold text-sm">S</span>
          </Link>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
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
                "group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 ease-out press",
                collapsed && "justify-center",
                active
                  ? "bg-brand-soft text-brand-bright font-medium"
                  : "text-body hover:text-ink hover:bg-surface-elevated",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-brand animate-fade-in"
                  aria-hidden
                />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-brand-bright" : "text-muted group-hover:text-ink",
                )}
                strokeWidth={2}
              />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: collapse button + user menu */}
      <div
        className={cn(
          "border-t border-hairline",
          collapsed ? "p-2" : "px-3 py-2",
        )}
      >
        {/* User menu */}
        <div ref={menuRef} className="relative">
          {user ? (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md transition-colors hover:bg-surface-elevated press",
                collapsed ? "justify-center p-2" : "px-2 py-2",
              )}
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-full bg-brand-soft text-brand-bright flex items-center justify-center text-xs font-semibold shrink-0 border border-brand/20">
                {user.username[0]?.toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 truncate text-left text-ink">
                    {user.username}
                  </span>
                  <ChevronUp
                    className={cn(
                      "w-3.5 h-3.5 text-muted transition-transform duration-200",
                      !menuOpen && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md bg-brand text-on-brand hover:bg-brand-bright transition-colors press",
                collapsed && "justify-center",
              )}
              title={collapsed ? "Entrar / Criar conta" : undefined}
            >
              <User className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Entrar</span>}
            </Link>
          )}

          {/* Dropdown */}
          {menuOpen && user && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-elevated border border-hairline-strong rounded-md shadow-2xl overflow-hidden animate-slide-up">
              <Link
                href="/portfolios"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-strong transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 text-muted" />
                Meus portfolios
              </Link>
              <Link
                href="/indices"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-strong transition-colors"
              >
                <PieChart className="w-3.5 h-3.5 text-muted" />
                Meus índices
              </Link>
              <div className="border-t border-hairline" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-negative hover:bg-negative-soft transition-colors flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "w-full mt-1 flex items-center gap-2 text-xs text-muted hover:text-ink hover:bg-surface-elevated/60 rounded-md transition-colors press",
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

        {/* Theme toggle */}
        <div className={cn("mt-1", collapsed ? "flex justify-center" : "px-2")}>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
