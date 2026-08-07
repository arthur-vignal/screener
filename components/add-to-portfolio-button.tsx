"use client";

/**
 * AddToPortfolioButton — dropdown that lets the user add the current ticker
 * to one of their existing portfolios, or create a new portfolio inline.
 *
 * Uses /api/portfolios for list + create, and /api/portfolios/[id] to patch
 * holdings. If the user is not logged in, redirects to /login?next=...
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Portfolio = {
  id: number;
  slug: string;
  name: string;
  holdings: string[];
};

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<{
    user?: { userId: string };
    portfolios?: Portfolio[];
  }>;

type Props = {
  symbol: string;
};

export function AddToPortfolioButton({ symbol }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | "new" | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Lazy-load portfolios when dropdown opens.
  useEffect(() => {
    if (!open || loggedIn !== null) return;
    setLoading(true);
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/portfolios?scope=mine").then((r) => r.json()),
    ])
      .then(([me, pf]) => {
        setLoggedIn(!!me.user);
        const list = (pf.portfolios ?? []) as Array<{
          id: number;
          slug: string;
          name: string;
          constituents?: string[];
        }>;
        // constituents is symbol+weight rows from the list endpoint; the field
        // shape here is `constituents: [{symbol, weight}]` — flatten to symbols.
        const flat = list.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          holdings: (p.constituents ?? []).map((c) =>
            typeof c === "string" ? c : (c as { symbol: string }).symbol,
          ),
        }));
        setPortfolios(flat);
      })
      .catch(() => {
        setLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, [open, loggedIn]);

  async function addToExisting(portfolioId: number) {
    setAdding(portfolioId);
    setFeedback(null);
    try {
      const r = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addHolding: { symbol } }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      const name = portfolios.find((p) => p.id === portfolioId)?.name;
      setFeedback(`Adicionado a "${name}"`);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 800);
    } catch (e) {
      setFeedback(`Erro: ${e instanceof Error ? e.message : "falha"}`);
    } finally {
      setAdding(null);
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    setAdding("new");
    setFeedback(null);
    try {
      const r = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: `Criado a partir de ${symbol}`,
          initialValue: 10000,
          isPublic: false,
          holdings: [{ symbol, weight: 1 }],
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      const data = await r.json();
      const slug = data?.portfolio?.slug ?? data?.slug;
      setFeedback("Portfolio criado");
      setTimeout(() => {
        setOpen(false);
        if (slug) router.push(`/portfolios/${slug}`);
        else router.push("/portfolios/my");
      }, 600);
    } catch (e) {
      setFeedback(`Erro: ${e instanceof Error ? e.message : "falha"}`);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-primary flex items-center gap-1.5 press"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus className="w-3 h-3" strokeWidth={2.5} />
        Add to portfolio
        <ChevronDown className="w-3 h-3 opacity-60" strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[260px] bg-surface border border-hairline-strong shadow-lg"
        >
          {loggedIn === null && loading && (
            <div className="px-3 py-3 text-muted text-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
            </div>
          )}

          {loggedIn === false && (
            <div className="px-3 py-3 space-y-2">
              <p className="text-sm text-muted">
                Faça login para adicionar a um portfolio.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/login?next=/asset/${symbol}`)}
                className="btn-primary w-full"
              >
                Login
              </button>
            </div>
          )}

          {loggedIn === true && (
            <>
              {portfolios.length === 0 && !showNew && (
                <div className="px-3 py-3 text-muted text-sm">
                  Você ainda não tem portfolios.
                </div>
              )}

              {portfolios.length > 0 && !showNew && (
                <div className="py-1">
                  <div className="px-3 py-1 label-s label-muted-2 uppercase tracking-wide">
                    Seus portfolios
                  </div>
                  {portfolios.map((p) => {
                    const has = p.holdings?.includes(symbol);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addToExisting(p.id)}
                        disabled={adding !== null}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-surface-elevated flex items-center justify-between press",
                          has && "opacity-60",
                        )}
                      >
                        <span className="truncate">{p.name}</span>
                        {adding === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : has ? (
                          <Check className="w-3 h-3 text-brand-deep" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-hairline">
                {!showNew ? (
                  <button
                    type="button"
                    onClick={() => setShowNew(true)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-elevated flex items-center gap-2 text-brand-deep press"
                  >
                    <Plus className="w-3 h-3" />
                    Criar novo portfolio com {symbol}
                  </button>
                ) : (
                  <div className="p-3 space-y-2">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do portfolio"
                      className="w-full px-2 py-1.5 bg-canvas border border-hairline-strong text-sm focus:outline-none focus:border-brand-deep"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createAndAdd();
                        if (e.key === "Escape") setShowNew(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNew(false)}
                        className="btn-ghost text-xs flex-1"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={createAndAdd}
                        disabled={adding === "new" || !newName.trim()}
                        className="btn-primary text-xs flex-1 flex items-center justify-center gap-1"
                      >
                        {adding === "new" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        Criar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {feedback && (
                <div
                  className={cn(
                    "px-3 py-2 text-xs border-t border-hairline",
                    feedback.startsWith("Erro") ? "text-negative" : "text-brand-deep",
                  )}
                >
                  {feedback}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
