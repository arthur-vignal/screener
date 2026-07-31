"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Trash2, Plus } from "lucide-react";
import { useWatchlist } from "@/lib/use-watchlist";
import { cn, formatCompact, formatPercent } from "@/lib/utils";

type Row = {
  ticker: string;
  price: number;
  marketCap: number;
  peRatio: number | null;
  sector: string;
  industry: string;
  changePercent: number;
  yearHigh: number;
  yearLow: number;
  dividendYield: number | null;
  beta: number | null;
};

export default function WatchlistPage() {
  const watchlist = useWatchlist();
  const [input, setInput] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      watchlist.add(input.trim());
      setInput("");
    }
  };

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Watchlist</h1>
          <p className="text-sm text-text-secondary">
            {(watchlist.tickers.length >= 0)
              ? `${watchlist.tickers.length} ativos salvos (local)`
              : "Carregando..."}
          </p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Adicionar ticker (ex: AAPL)"
          className="flex-1 bg-surface border border-border rounded-md px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-foreground text-background font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      {!(watchlist.tickers.length >= 0) && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md shimmer" />
          ))}
        </div>
      )}

      {(watchlist.tickers.length >= 0) && watchlist.tickers.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Star className="w-8 h-8 text-text-muted mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-text-secondary">
            Sua watchlist está vazia. Adicione tickers acima ou use o botão
            <span className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded bg-surface-elevated text-foreground text-xs">
              <Star className="w-3 h-3 mr-1" fill="currentColor" />
              Star
            </span>
            nas páginas de ativos.
          </p>
        </div>
      )}

      {(watchlist.tickers.length >= 0) && watchlist.tickers.length > 0 && (
        <div className="space-y-2">
          {watchlist.tickers.map((ticker) => (
            <WatchlistRow key={ticker} ticker={ticker} onRemove={watchlist.remove} />
          ))}
          {watchlist.tickers.length > 1 && (
            <button
              onClick={watchlist.clear}
              className="text-xs text-text-muted hover:text-negative transition-colors mt-4 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar watchlist
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WatchlistRow({ ticker, onRemove }: { ticker: string; onRemove: (t: string) => void }) {
  const [data, setData] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/screen/stocks?limit=200`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const row = (d.rows as Row[]).find((r) => r.ticker === ticker);
        setData(row ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ticker]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex items-center gap-4">
      <Link
        href={`/asset/${ticker}`}
        className="font-mono font-semibold text-foreground hover:text-accent transition-colors min-w-[80px]"
      >
        {ticker}
      </Link>
      {loading && <span className="text-sm text-text-muted">Carregando...</span>}
      {!loading && !data && (
        <span className="text-sm text-text-muted">Não encontrado</span>
      )}
      {data && (
        <div className="flex-1 flex items-center gap-6 text-sm">
          <span className="font-mono tabular-nums">${data.price.toFixed(2)}</span>
          <span
            className={cn(
              "font-mono tabular-nums text-xs",
              data.changePercent >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {formatPercent(data.changePercent)}
          </span>
          <span className="text-text-secondary text-xs">
            mcap ${formatCompact(data.marketCap * 1e6)}
          </span>
          <span className="text-text-muted text-xs hidden md:inline">
            {data.industry}
          </span>
        </div>
      )}
      <button
        onClick={() => onRemove(ticker)}
        className="text-text-muted hover:text-negative transition-colors"
        aria-label={`Remover ${ticker}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
