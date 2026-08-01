"use client";

export const dynamic = "force-dynamic";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search as SearchIcon, Loader2, Filter } from "lucide-react";
import { cn, formatCompact, formatPercent } from "@/lib/utils";


type AssetType = "stock" | "etf" | "crypto";

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  prevClose: number;
  volume: number;
};

type Row = {
  symbol: string;
  type: AssetType;
  sector: string;
  quote: Quote | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ALL_TYPES: { value: AssetType | "all"; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "stock", label: "Ações" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
];

export default function AssetsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Search suggestions
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const search = useSWR<{ results: { symbol: string; name: string }[]; count: number }>(
    `/api/assets/search?q=${encodeURIComponent(debouncedQuery)}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  // Pick symbols to show: top of search results + first 30 default
  const symbols = useMemo(() => {
    if (!search.data) return [];
    return search.data.results.slice(0, 50).map((r) => r.symbol);
  }, [search.data]);

  // Fetch quotes
  const quotes = useSWR<{ rows: Row[] }>(
    symbols.length > 0 ? `/api/assets/quote?symbols=${symbols.join(",")}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const rows = useMemo(() => quotes.data?.rows ?? [], [quotes.data]);
  const filteredRows = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((r) => r.type === typeFilter);
  }, [rows, typeFilter]);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Assets</h1>
          <p className="text-sm text-text-secondary">
            Busque por ação, ETF ou cripto. Filtre por tipo e setor.
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors",
            showFilters
              ? "bg-foreground text-background border-foreground"
              : "border-border text-text-secondary hover:text-foreground hover:border-foreground/30",
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      <div className="relative mb-6">
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          strokeWidth={2}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ticker, nome ou descrição (ex: 'empresa de energia')"
          className="w-full bg-surface border border-border rounded-md pl-10 pr-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
        />
        {search.isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
        )}
      </div>

      {/* Type filter chips */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full border transition-colors",
                  typeFilter === t.value
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-text-secondary hover:text-foreground hover:border-foreground/30",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {filteredRows.length === 0 && (search.isLoading || quotes.isLoading) && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md shimmer" />
          ))}
        </div>
      )}

      {filteredRows.length === 0 && !quotes.isLoading && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">
            Nenhum resultado. Tente outro ticker ou nome.
          </p>
        </div>
      )}

      {filteredRows.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Ativo</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-right px-4 py-3 font-medium">24h</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Volume</th>
                <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Setor</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr
                  key={r.symbol}
                  className={cn(
                    "border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-elevated/30",
                  )}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/asset/${encodeURIComponent(r.symbol)}`}
                      className="font-mono font-semibold text-foreground hover:text-accent transition-colors"
                    >
                      {r.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <TypeBadge type={r.type} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {r.quote ? (
                      <PriceDisplay price={r.quote.price} currency={r.quote.currency} />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {r.quote ? (
                      <span
                        className={cn(
                          r.quote.changePercent >= 0 ? "text-positive" : "text-negative",
                        )}
                      >
                        {formatPercent(r.quote.changePercent)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary hidden md:table-cell">
                    {r.quote ? `$${formatCompact(r.quote.volume)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-text-secondary hidden lg:table-cell">
                    {r.sector}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: AssetType }) {
  const colors = {
    stock: "bg-blue-400/10 text-blue-300 border-blue-400/20",
    etf: "bg-violet-400/10 text-violet-300 border-violet-400/20",
    crypto: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  };
  const labels = { stock: "Ação", etf: "ETF", crypto: "Crypto" };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md border font-mono uppercase tracking-wider",
        colors[type],
      )}
    >
      {labels[type]}
    </span>
  );
}

function PriceDisplay({ price, currency }: { price: number; currency: string }) {
  if (price === 0) return <span className="text-text-muted">—</span>;
  const symbol = currency === "USD" ? "$" : currency;
  const formatted =
    price < 0.01 ? price.toFixed(6) : price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return (
    <span>
      {symbol}
      {formatted}
    </span>
  );
}
