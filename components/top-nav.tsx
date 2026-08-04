"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/portfolios", label: "Portfolios" },
  { href: "/indices", label: "Indices" },
  { href: "/crypto", label: "Crypto" },
  { href: "/analysis", label: "Analysis" },
  { href: "/analysis/stats", label: "Mercado" },
  { href: "/news", label: "News" },
];

type Session = { userId: string; username: string };

export function TopNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <header className="fixed top-7 inset-x-0 z-50 h-16 bg-canvas border-b border-hairline">
      <div className="h-full max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 press transition-opacity hover:opacity-70"
        >
          <div className="w-7 h-7 bg-brand flex items-center justify-center">
            <span className="font-display text-lg text-brand-on leading-none">S</span>
          </div>
          <span className="font-medium text-ink tracking-tight">
            Screener
          </span>
        </Link>

        {/* Search bar (desktop) */}
        <div className="hidden md:block flex-1 max-w-md mx-6">
          <SearchBar />
        </div>

        {/* Center nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3.5 py-2 text-sm transition-colors duration-150 press",
                  active
                    ? "text-ink font-medium"
                    : "text-muted hover:text-ink",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute left-3.5 right-3.5 -bottom-px h-0.5 bg-brand-deep" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* User menu (desktop) */}
          <div ref={userRef} className="relative hidden md:block">
            {user ? (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-elevated transition-colors duration-150 press"
                aria-label="User menu"
              >
                <div className="w-6 h-6 rounded-full bg-brand-soft text-brand-deep flex items-center justify-center text-xs font-semibold">
                  {user.username[0]?.toUpperCase()}
                </div>
                <span className="font-medium">{user.username}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted transition-transform duration-200",
                    menuOpen && "rotate-180",
                  )}
                />
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-ink hover:bg-surface-elevated transition-colors duration-150 press"
              >
                <User className="w-3.5 h-3.5" />
                <span className="font-medium">Entrar</span>
              </Link>
            )}

            {menuOpen && user && (
              <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-surface border border-hairline-strong shadow-lg animate-slide-down overflow-hidden">
                <Link
                  href="/portfolios"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-elevated transition-colors duration-150"
                >
                  Meus portfolios
                </Link>
                <Link
                  href="/indices"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-elevated transition-colors duration-150"
                >
                  Meus índices
                </Link>
                <div className="border-t border-hairline" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-negative hover:bg-negative-soft transition-colors duration-150"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* CTA */}
          {user ? (
            <Link
              href="/portfolios/new"
              className="hidden md:inline-flex items-center px-4 h-9 bg-brand text-brand-on text-sm font-medium hover:bg-brand-soft transition-colors duration-150 press"
            >
              Novo portfolio
            </Link>
          ) : (
            <Link
              href="/signup"
              className="hidden md:inline-flex items-center px-4 h-9 bg-brand text-brand-on text-sm font-medium hover:bg-brand-soft transition-colors duration-150 press"
            >
              Criar conta
            </Link>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-ink hover:bg-surface-elevated transition-colors duration-150 press"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-23 inset-x-0 bg-canvas border-b border-hairline shadow-lg animate-slide-down">
          <nav className="px-6 py-4 space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2.5 text-sm transition-colors duration-150",
                    active
                      ? "bg-brand-soft text-brand-deep font-medium"
                      : "text-ink hover:bg-surface-elevated",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="border-t border-hairline my-3" />
            {user ? (
              <>
                <div className="px-3 py-2 text-xs text-muted">
                  Logado como <span className="font-medium text-ink">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-negative hover:bg-negative-soft transition-colors duration-150"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-3 py-2.5 text-sm text-ink hover:bg-surface-elevated transition-colors duration-150"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
