"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X, User, LogOut, ChevronDown, Construction, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/search-bar";

type SubItem = {
  href: string;
  label: string;
  description?: string;
};

type NavItem = {
  href: string;
  label: string;
  subitems?: SubItem[];
  explicit?: "build"; // marker for placeholder
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard" },
  {
    href: "/market",
    label: "Market",
    subitems: [
      { href: "/market/stocks", label: "Stocks", description: "Ações S&P 500" },
      { href: "/crypto", label: "Crypto", description: "Top 20 via CMC" },
      { href: "/market/etfs", label: "ETFs", description: "ETFs listados" },
    ],
  },
  {
    href: "/portfolios",
    label: "Portfolios",
    subitems: [
      { href: "/portfolios/sulfur", label: "Sulfur", description: "Portfolios curados" },
      { href: "/portfolios/my", label: "My Portfolios", description: "Os que você criou" },
      { href: "/portfolios/public", label: "Public", description: "Portfolios públicos" },
    ],
  },
  { href: "/news", label: "News" },
  {
    href: "/build",
    label: "Build",
    explicit: "build",
  },
];

type Session = { userId: string; username: string };

export function TopNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  const openSubmenu = useCallback((label: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenDropdown(label);
  }, []);

  const scheduleCloseSubmenu = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
      closeTimerRef.current = null;
    }, 150);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-canvas border-b border-hairline">
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
            Sulfur<span className="text-muted">.io</span>
          </span>
        </Link>

        {/* Center nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.subitems?.some((s) => pathname === s.href) ?? false);
            const isOpen = openDropdown === item.label;
            const hasSub = item.subitems && item.subitems.length > 0;
            const isBuild = item.explicit === "build";

            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => hasSub && openSubmenu(item.label)}
                onMouseLeave={() => hasSub && scheduleCloseSubmenu()}
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    if (hasSub) setOpenDropdown(null);
                  }}
                  className={cn(
                    "flex items-center gap-1 px-3.5 py-2 text-sm transition-colors duration-150 press",
                    active
                      ? "text-ink font-medium"
                      : isBuild
                        ? "text-faint hover:text-muted"
                        : "text-muted hover:text-ink",
                  )}
                >
                  {isBuild && <Construction className="w-3 h-3" />}
                  {item.label}
                  {hasSub && (
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  )}
                  {active && (
                    <span className="absolute left-3.5 right-3.5 -bottom-px h-0.5 bg-brand-deep" />
                  )}
                </Link>

                {hasSub && isOpen && (
                  <div
                    className="absolute top-full left-0 pt-1 z-50 animate-slide-down"
                    onMouseEnter={() => openSubmenu(item.label)}
                    onMouseLeave={scheduleCloseSubmenu}
                  >
                    <div className="panel shadow-2xl py-1 min-w-[280px]">
                      {item.subitems!.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-start gap-3 px-4 py-2.5 transition-colors duration-150",
                              subActive
                                ? "bg-brand-soft"
                                : "hover:bg-surface-elevated",
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div
                                className={cn(
                                  "text-sm font-medium",
                                  subActive ? "text-brand-deep" : "text-ink",
                                )}
                              >
                                {sub.label}
                              </div>
                              {sub.description && (
                                <div className="text-xs text-muted mt-0.5">
                                  {sub.description}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Search bar (desktop) */}
          <div className="hidden md:block w-56">
            <SearchBar />
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

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
              <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-surface-elevated border border-hairline-strong shadow-lg animate-slide-down overflow-hidden">
                <Link
                  href="/watchlist"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-strong transition-colors duration-150"
                >
                  Watchlist
                </Link>
                <Link
                  href="/portfolios"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-strong transition-colors duration-150"
                >
                  My portfolios
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
        <div className="md:hidden absolute top-16 inset-x-0 bg-canvas border-b border-hairline shadow-lg animate-slide-down max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="px-6 py-4 space-y-1">
            {/* Search on mobile */}
            <div className="pb-3">
              <SearchBar />
            </div>

            {NAV.map((item) => {
              const isBuild = item.explicit === "build";
              const active = pathname === item.href;
              return (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 text-sm transition-colors duration-150",
                      active
                        ? "bg-brand-soft text-brand-deep font-medium"
                        : isBuild
                          ? "text-faint"
                          : "text-ink hover:bg-surface-elevated",
                    )}
                  >
                    {isBuild && <Construction className="w-3 h-3" />}
                    {item.label}
                  </Link>
                  {item.subitems && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {item.subitems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "block px-3 py-1.5 text-xs transition-colors duration-150",
                            pathname === sub.href
                              ? "text-brand-deep"
                              : "text-muted hover:text-ink",
                          )}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
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
