"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu,
  X,
  User,
  LogOut,
  Construction,
} from "lucide-react";
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
  explicit?: "build";
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
  const [now, setNow] = useState<string>("--:--:--");
  const userRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // Market status clock (updates every second, no flash — formatted on render only)
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = String(d.getUTCHours()).padStart(2, "0");
      const m = String(d.getUTCMinutes()).padStart(2, "0");
      const s = String(d.getUTCSeconds()).padStart(2, "0");
      setNow(`${h}:${m}:${s} UTC`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Market status: weekdays 13:30–20:00 UTC = NYSE open. Simple heuristic.
  const marketOpen = (() => {
    const d = new Date();
    const day = d.getUTCDay();
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    return day >= 1 && day <= 5 && mins >= 13 * 60 + 30 && mins < 20 * 60;
  })();

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
    <header className="fixed top-0 inset-x-0 z-50 bg-canvas">
      {/* ============= TIER 1: identity + search (60px, canvas bg) ============= */}
      <div className="h-[60px] border-b border-hairline-strong">
        <div className="h-full max-w-[1920px] mx-auto px-8 flex items-center justify-between">
          {/* Logo (left) */}
          <Link
            href="/"
            className="flex items-center gap-[11px] press transition-opacity hover:opacity-70"
          >
            <div className="w-[22px] h-[22px] bg-ink flex items-center justify-center">
              <span className="font-display text-[15px] text-canvas leading-none font-bold">
                S
              </span>
            </div>
            <span className="font-display text-[19px] text-ink leading-none tracking-[-0.03em]">
              Sulfur<span className="bg-brand text-brand-on px-[3px] ml-[1px]">.io</span>
            </span>
          </Link>

          {/* Search (centre, 520px) */}
          <div className="hidden md:block w-[520px]">
            <SearchBar />
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-[14px]">
            <ThemeToggle />

            {/* User avatar (always rendered; popover if logged in) */}
            <div ref={userRef} className="relative hidden md:block">
              {user ? (
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-[30px] h-[30px] bg-surface-elevated border border-hairline-strong flex items-center justify-center num text-[11px] text-ink hover:bg-surface-strong transition-colors duration-150 press"
                  aria-label="User menu"
                >
                  {user.username[0]?.toUpperCase()}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-[30px] h-[30px] border border-hairline-strong flex items-center justify-center text-muted hover:text-ink hover:bg-surface-elevated transition-colors duration-150 press"
                  aria-label="Entrar"
                >
                  <User className="w-3.5 h-3.5" />
                </Link>
              )}

              {menuOpen && user && (
                <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-surface-elevated border border-hairline-strong shadow-lg animate-slide-down overflow-hidden">
                  <div className="px-4 py-2 label label-muted-2 border-b border-hairline">
                    {user.username}
                  </div>
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

            {/* CTA (Ledger spec — btn-primary class) */}
            {user ? (
              <Link href="/portfolios/new" className="hidden md:inline-flex btn-primary">
                New portfolio
              </Link>
            ) : (
              <Link href="/signup" className="hidden md:inline-flex btn-primary">
                Sign up
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
      </div>

      {/* ============= TIER 2: nav + market status (42px, canvas-soft bg) ============= */}
      <div className="h-[42px] bg-canvas-soft border-b border-hairline-strong">
        <div className="h-full max-w-[1920px] mx-auto px-8 flex items-center justify-between">
          {/* Nav (5 items, mono uppercase) */}
          <nav className="hidden md:flex items-stretch h-full">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.subitems?.some((s) => pathname.startsWith(s.href.split("?")[0])) ?? false);
              const isOpen = openDropdown === item.label;
              const hasSub = item.subitems && item.subitems.length > 0;
              const isBuild = item.explicit === "build";

              return (
                <div
                  key={item.label}
                  className="relative flex items-stretch"
                  onMouseEnter={() => hasSub && openSubmenu(item.label)}
                  onMouseLeave={() => hasSub && scheduleCloseSubmenu()}
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (hasSub) setOpenDropdown(null);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-[18px] h-full label transition-colors duration-150 press",
                      active
                        ? "text-ink"
                        : isBuild
                          ? "text-faint hover:text-muted"
                          : "text-muted hover:text-ink",
                    )}
                    style={active ? { boxShadow: "inset 0 -2px 0 var(--brand-deep)" } : undefined}
                  >
                    {isBuild && <Construction className="w-3 h-3" />}
                    {item.label}
                    {hasSub && (
                      <span className="text-[8px] opacity-60 leading-none -mt-px">▾</span>
                    )}
                  </Link>

                  {hasSub && isOpen && (
                    <div
                      className="absolute top-full left-0 z-50 animate-slide-down"
                      onMouseEnter={() => openSubmenu(item.label)}
                      onMouseLeave={scheduleCloseSubmenu}
                    >
                      <div className="bg-surface border border-hairline-strong border-t-0 shadow-lg py-1 min-w-[280px]">
                        {item.subitems!.map((sub) => {
                          const subActive = pathname.startsWith(sub.href.split("?")[0]);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "flex items-start gap-3 px-4 py-2.5 transition-colors duration-150",
                                subActive ? "bg-surface-elevated" : "hover:bg-surface-elevated",
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

            {/* Build WIP chip */}
            <div className="flex items-center pl-2">
              <span className="label-s border border-hairline-strong px-1.5 py-0.5 text-faint">
                WIP
              </span>
            </div>
          </nav>

          {/* Right: market status */}
          <div className="hidden md:flex items-center gap-[10px] label text-faint">
            <span
              className={cn(
                "inline-block w-[6px] h-[6px]",
                marketOpen ? "bg-brand-deep" : "bg-faint",
              )}
              aria-hidden="true"
            />
            <span className={marketOpen ? "text-brand-deep" : "text-muted"}>
              {marketOpen ? "Market open" : "Market closed"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="num-row text-faint">{now}</span>
          </div>
        </div>
      </div>

      {/* ============= MOBILE MENU ============= */}
      {mobileOpen && (
        <div className="md:hidden absolute top-[102px] inset-x-0 bg-canvas border-b border-hairline-strong shadow-lg animate-slide-down max-h-[calc(100vh-6rem)] overflow-y-auto">
          <nav className="px-6 py-4 space-y-1">
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
                        ? "bg-surface-elevated text-brand-deep font-medium"
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
                            pathname.startsWith(sub.href.split("?")[0])
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