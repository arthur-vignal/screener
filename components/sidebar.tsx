"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
        "shrink-0 border-r border-border bg-surface flex flex-col transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Header / Logo */}
      <div
        className={cn(
          "px-6 py-5 border-b border-border-subtle flex items-center",
          collapsed ? "justify-center px-0" : "justify-between",
        )}
      >
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-foreground tracking-tight">
              Screener
            </span>
          </Link>
        ) : (
          <Link href="/" className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </Link>
        )}
      </div>

      {/* Main nav */}
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
                collapsed && "justify-center",
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

      {/* Footer: collapse button + user menu */}
      <div
        className={cn(
          "border-t border-border-subtle",
          collapsed ? "p-2" : "px-3 py-2",
        )}
      >
        {/* User menu */}
        <div ref={menuRef} className="relative">
          {user ? (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md transition-colors hover:bg-surface-elevated",
                collapsed ? "justify-center p-2" : "px-2 py-2",
              )}
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                {user.username[0]?.toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 truncate text-left">
                    {user.username}
                  </span>
                  <ChevronUp
                    className={cn(
                      "w-3.5 h-3.5 text-text-muted transition-transform",
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
                "w-full flex items-center gap-2 px-3 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity",
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
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-border rounded-md shadow-lg overflow-hidden">
              <Link
                href="/portfolios"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-surface-elevated"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  Meus portfolios
                </div>
              </Link>
              <Link
                href="/indices"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-surface-elevated"
              >
                <div className="flex items-center gap-2">
                  <PieChart className="w-3.5 h-3.5" />
                  Meus índices
                </div>
              </Link>
              <div className="border-t border-border-subtle" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-negative transition-colors flex items-center gap-2"
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
            "w-full mt-1 flex items-center gap-2 text-xs text-text-muted hover:text-foreground hover:bg-surface-elevated rounded-md transition-colors",
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
