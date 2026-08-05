"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchlistButton } from "@/components/watchlist-button";
import { cn, formatPercent } from "@/lib/utils";

type WatchEntry = {
  symbol: string;
  createdAt: number;
};

type Quote = {
  price: number;
  changePercent: number;
  change: number;
  currency: string;
};

type WatchlistResponse = {
  entries: WatchEntry[];
  prices: Record<string, Quote | null>;
};

export default function WatchlistPage() {
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!d.user))
      .catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    if (loggedIn === false) {
      setLoading(false);
      return;
    }
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loggedIn]);

  async function remove(symbol: string) {
    if (!confirm(`Remover ${symbol} da watchlist?`)) return;
    const prev = data;
    setData({
      entries: prev!.entries.filter((e) => e.symbol !== symbol),
      prices: Object.fromEntries(
        Object.entries(prev!.prices).filter(([k]) => k !== symbol),
      ),
    });
    await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    });
  }

  if (loggedIn === null) {
    return (
      <div className="px-4 md:px-6 py-4 md:py-6 max-w-5xl">
        <PageHeader
          title="Watchlist"
          description="Acompanhe os ativos que você favoritou."
        />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (loggedIn === false) {
    return (
      <div className="px-4 md:px-6 py-4 md:py-6 max-w-5xl">
        <PageHeader
          title="Watchlist"
          description="Acompanhe os ativos que você favoritou."
        />
        <div className="border-t border-hairline py-12 text-center">
          <Star className="w-8 h-8 text-muted mx-auto mb-3" />
          <h2 className="font-medium text-ink mb-1">Faça login para usar a watchlist</h2>
          <p className="text-sm text-muted mb-4">
            Sua watchlist é salva por usuário e sincroniza entre dispositivos.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center px-4 h-9 bg-ink text-canvas text-sm font-medium hover:bg-brand-deep transition-colors duration-150 press"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center px-4 h-9 border border-hairline-strong text-sm font-medium hover:bg-surface-elevated transition-colors duration-150 press"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-5xl">
      <PageHeader
        title="Watchlist"
        description="Ativos que você favoritou. Use a estrela em qualquer asset para adicionar."
      />

      <div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted mb-2">
              Sua watchlist está vazia.
            </p>
            <p className="text-xs text-muted">
              Vá em <Link href="/assets" className="text-brand-deep link-underline">Assets</Link>{" "}
              e clique na estrela ao lado de cada ticker.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted border-b border-hairline">
                  <th className="text-left py-2 px-3 font-medium w-10"></th>
                  <th className="text-left py-2 px-3 font-medium">Ticker</th>
                  <th className="text-right py-2 px-3 font-medium">Preço</th>
                  <th className="text-right py-2 px-3 font-medium">24h</th>
                  <th className="text-right py-2 px-3 font-medium">Adicionado em</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => {
                  const q = data.prices[e.symbol];
                  return (
                    <tr
                      key={e.symbol}
                      className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="py-2 px-3">
                        <WatchlistButton symbol={e.symbol} initialWatched={true} size="sm" />
                      </td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/asset/${encodeURIComponent(e.symbol)}`}
                          className="font-mono font-medium text-ink hover:text-brand-deep transition-colors duration-150"
                        >
                          {e.symbol}
                        </Link>
                      </td>
                      <td className="text-right py-2 px-3 font-tabular text-ink">
                        {q ? (
                          q.price < 1
                            ? `$${q.price.toFixed(4)}`
                            : `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "text-right py-2 px-3 font-tabular font-medium",
                          q?.changePercent == null
                            ? "text-muted"
                            : q.changePercent >= 0
                              ? "text-positive"
                              : "text-negative",
                        )}
                      >
                        {q ? formatPercent(q.changePercent) : "—"}
                      </td>
                      <td className="text-right py-2 px-3 text-muted text-xs">
                        {new Date(e.createdAt * 1000).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => remove(e.symbol)}
                          className="p-1 text-muted hover:text-negative transition-colors press"
                          aria-label="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
