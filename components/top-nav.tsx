"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
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
import { MarketToggle } from "@/components/market-toggle";

type SubItem = {
  href: string;
  label: string;
  description?: string;
};

type NavItem = {
  href?: string;
  label: string;
  subitems?: SubItem[];
  explicit?: "build";
};

const BR = "\u{1F1E7}\u{1F1F7}";
const US = "\u{1F1FA}\u{1F1F8}";

/**
 * Top nav reorganised by INTENTION (mercado / juros / análise / portfólios /
 * notícias / dashboard) rather than by asset class. Scales better as new
 * feature blocks land (juros & derivativos, comps setoriais, etc).
 */
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard" },

  // 1) Mercado — every sub-market + sector heatmap + índices (no longer
  //    a top-level item).
  {
    label: "Mercado",
    subitems: [
      { href: "/market/br", label: `Mercado BR ${BR}`, description: "Ações, FIIs, ETFs, BDRs" },
      { href: "/market/us", label: `Mercado US ${US}`, description: "S&P 500 + ETFs" },
      { href: "/market/fiis", label: `FIIs ${BR}`, description: "Fundos imobiliários B3" },
      { href: "/market/etfs", label: `ETFs ${BR}`, description: "ETFs listados na B3" },
      { href: "/market/bdrs", label: `BDRs ${BR}`, description: "Brazilian Depositary Receipts" },
      { href: "/market/sectors", label: "Setores", description: "Heatmap setorial" },
      { href: "/indices", label: "Índices", description: "B3 oficiais + custom" },
    ],
  },

  // 2) Juros & Derivativos — differentiator. Macro BR, Copom Watch, options,
  //    Tesouro Direto, breakeven de inflação.
  {
    label: "Juros & Derivativos",
    subitems: [
      { href: "/macro", label: "Painel Macro BR", description: "Selic, CDI, IPCA, IGP-M, IBC-Br, PIB, Desemprego" },
      { href: "/copom", label: "Curva de Juros / Copom Watch", description: "DI1 forward rates por reunião" },
      { href: "/options", label: "Opções", description: "Gregas, payoff diagrams, smile/skew" },
      { href: "/tesouro", label: "Tesouro Direto", description: "Pré, IPCA+ (NTN-B), Selic" },
      { href: "/breakeven", label: "Breakeven IPCA", description: "Inflação implícita vs realizada" },
    ],
  },

  // 3) Análise — fundamentalista, técnica, comparador, correlação, comps,
  //    raio-x FII, fear & greed.
  {
    label: "Análise",
    subitems: [
      { href: "/screener", label: "Screener avançado", description: "Multi-critério (P/L, P/VP, ROE, EV/EBITDA…)" },
      { href: "/analysis", label: "Técnica", description: "RSI, MACD, médias, bandas" },
      { href: "/compare", label: "Comparar", description: "Side-by-side 2-5 tickers" },
      { href: "/correlation", label: "Correlação", description: "Cross-asset matrix" },
      { href: "/comps", label: "Comps setoriais", description: "Tabela + radar de múltiplos" },
      { href: "/fii-xray", label: "Raio-X de FII", description: "Vacância, imóveis, inadimplência" },
      { href: "/fear-greed", label: "Fear & Greed", description: "Índice de sentimento" },
    ],
  },

  // 4) Portfólios — Sulfur / Meus / Públicos / Calendário de Proventos (novo).
  {
    label: "Portfólios",
    subitems: [
      { href: "/portfolios/sulfur", label: "Sulfur", description: "Portfólios curados" },
      { href: "/portfolios/my", label: "Meus", description: "Os que você criou" },
      { href: "/portfolios/public", label: "Públicos", description: "Portfólios públicos" },
      { href: "/dividends", label: "Calendário de Proventos", description: "Dividendos + JCP + FIIs" },
    ],
  },

  // 5) Notícias — unchanged.
  { href: "/news", label: "Notícias" },

  // 6) Build — WIP, kept for now.
  {
    href: "/build",
    label: "Build",
    explicit: "build",
  },
];

type Session = { userId: string; username: string };

export function TopNav() {
  return (
    <Suspense fallback={<TopNavSkeleton />}>
      <TopNavInner />
    </Suspense>
  );
}

function TopNavSkeleton() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-canvas">
      <div className="h-[60px] border-b border-hairline-strong" />
      <div className="h-[42px] bg-canvas-soft border-b border-hairline-strong" />
    </header>
  );
}

function TopNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  /**
   * marketHref — Market menu's primary entry. Reads current ?market= (set by
   * the MarketToggle on /?dashboard=*) and routes accordingly.
   *   ?market=us  -> /market/us
   *   default BR  -> /market/br
   */
  function marketHref(): string {
    const m = searchParams?.get("market");
    if (m === "us") return "/market/us";
    return "/market/br";
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-canvas">
      <div className="h-[60px] border-b border-hairline-strong">
        <div className="h-full max-w-[1920px] mx-auto px-8 flex items-center justify-between">
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

          <div className="hidden md:block w-[520px]">
            <SearchBar />
          </div>

          <div className="flex items-center gap-[14px]">
            <Suspense fallback={null}>
              <MarketToggle className="hidden lg:inline-flex" />
            </Suspense>
            <ThemeToggle />

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

            {user ? (
              <Link href="/portfolios/new" className="hidden md:inline-flex btn-primary">
                New portfolio
              </Link>
            ) : (
              <Link href="/signup" className="hidden md:inline-flex btn-primary">
                Sign up
              </Link>
            )}

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

      <div className="h-[42px] bg-canvas-soft border-b border-hairline-strong">
        <div className="h-full max-w-[1920px] mx-auto px-8 flex items-center justify-between">
          <nav className="hidden md:flex items-stretch h-full">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.subitems?.some((s) => pathname.startsWith(s.href.split("?")[0])) ?? false);
              const isOpen = openDropdown === item.label;
              const hasSub = item.subitems && item.subitems.length > 0;
              const isBuild = item.explicit === "build";

              // Items with submenus render as buttons (not Links) to avoid
              // accidentally navigating when the user clicks the label.
              const isMenu = !!hasSub;

              return (
                <div
                  key={item.label}
                  className="relative flex items-stretch"
                  onMouseEnter={() => hasSub && openSubmenu(item.label)}
                  onMouseLeave={() => hasSub && scheduleCloseSubmenu()}
                >
                  {isMenu ? (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdown(isOpen ? null : item.label)
                      }
                      className={cn(
                        "flex items-center gap-1 px-[14px] h-full label transition-colors duration-150 press",
                        active
                          ? "text-ink"
                          : isBuild
                            ? "text-faint hover:text-muted"
                            : "text-muted hover:text-ink",
                      )}
                      style={
                        active
                          ? { boxShadow: "inset 0 -2px 0 var(--brand-deep)" }
                          : undefined
                      }
                    >
                      {isBuild && <Construction className="w-3 h-3" />}
                      {item.label}
                      <span className="text-[8px] opacity-60 leading-none -mt-px">
                        {"\u25be"}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-1 px-[14px] h-full label transition-colors duration-150 press",
                        active
                          ? "text-ink"
                          : isBuild
                            ? "text-faint hover:text-muted"
                            : "text-muted hover:text-ink",
                      )}
                      style={
                        active
                          ? { boxShadow: "inset 0 -2px 0 var(--brand-deep)" }
                          : undefined
                      }
                    >
                      {isBuild && <Construction className="w-3 h-3" />}
                      {item.label}
                    </Link>
                  )}

                  {hasSub && isOpen && (
                    <div
                      className="absolute top-full left-0 z-50 animate-slide-down"
                      onMouseEnter={() => openSubmenu(item.label)}
                      onMouseLeave={scheduleCloseSubmenu}
                    >
                      <div className="bg-surface border border-hairline-strong border-t-0 shadow-lg py-1 min-w-[280px] max-h-[70vh] overflow-y-auto">
                        {item.subitems!.map((sub) => {
                          const subActive = pathname.startsWith(
                            sub.href.split("?")[0],
                          );
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "flex items-start gap-3 px-4 py-2.5 transition-colors duration-150",
                                subActive
                                  ? "bg-surface-elevated"
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

            <div className="flex items-center pl-2">
              <span className="label-s border border-hairline-strong px-1.5 py-0.5 text-faint">
                WIP
              </span>
            </div>
          </nav>

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

      {mobileOpen && (
        <div className="md:hidden absolute top-[102px] inset-x-0 bg-canvas border-b border-hairline-strong shadow-lg animate-slide-down max-h-[calc(100vh-6rem)] overflow-y-auto">
          <nav className="px-6 py-4 space-y-1">
            <div className="pb-3">
              <SearchBar />
            </div>

            <div className="pb-3">
              <Suspense fallback={null}>
                <MarketToggle />
              </Suspense>
            </div>

            {NAV.map((item) => {
              const isBuild = item.explicit === "build";
              const active = pathname === item.href;
              return (
                <div key={item.label}>
                  {item.href ? (
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
                  ) : (
                    <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted font-medium">
                      {item.label}
                    </div>
                  )}
                  {item.subitems && (
                    <div className="ml-4 mt-0.5 mb-2 space-y-0.5">
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
