"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Search as SearchIcon,
  Loader2,
  Filter,
  TrendingUp,
  Activity,
  Volume2,
  ShieldAlert,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import { STOCKS, ETFS, CRYPTOS } from "@/lib/universe";

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

type Analysis = {
  adx: number | null;
  rsi: number | null;
  atrPct: number | null;
  bbWidth: number | null;
  mfi: number | null;
  volatility: number | null;
  sharpe: number | null;
  trend: "bullish" | "bearish" | "neutral";
};

type Row = {
  symbol: string;
  type: AssetType;
  sector: string;
  quote: Quote | null;
  analysis?: Analysis | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ALL_TYPES: { value: AssetType | "all"; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "stock", label: "Ações" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
];

const TRENDS: { value: "bullish" | "bearish" | "neutral" | "all"; label: string }[] = [
  { value: "all", label: "Qualquer" },
  { value: "bullish", label: "↑ Alta" },
  { value: "bearish", label: "↓ Baixa" },
  { value: "neutral", label: "→ Lateral" },
];

const VOL_LEVELS = [
  { value: "all", label: "Qualquer" },
  { value: "low", label: "Baixa (<15%)" },
  { value: "med", label: "Média (15-30%)" },
  { value: "high", label: "Alta (>30%)" },
] as const;

const RISK_LEVELS = [
  { value: "all", label: "Qualquer" },
  { value: "low", label: "Baixo (Sharpe > 1)" },
  { value: "med", label: "Médio (0-1)" },
  { value: "high", label: "Alto (< 0)" },
] as const;

const RSI_ZONES = [
  { value: "all", label: "Qualquer" },
  { value: "oversold", label: "< 30 (sobrevendido)" },
  { value: "neutral", label: "30-70" },
  { value: "overbought", label: "> 70 (sobrecomprado)" },
] as const;

export default function AssetsPage() {
  const [query, setQuery] = useState("");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debouncedSemantic, setDebouncedSemantic] = useState("");
  const [searchMode, setSearchMode] = useState<"exact" | "semantic">("exact");
  const [showFilters, setShowFilters] = useState(true);

  // Indicator filters
  const [trendFilter, setTrendFilter] = useState<"bullish" | "bearish" | "neutral" | "all">("all");
  const [volFilter, setVolFilter] = useState<"all" | "low" | "med" | "high">("all");
  const [rsiFilter, setRsiFilter] = useState<"all" | "oversold" | "neutral" | "overbought">("all");
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "med" | "high">("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSemantic(semanticQuery), 600);
    return () => clearTimeout(t);
  }, [semanticQuery]);

  // Default universe: 30 stocks + 10 ETFs + 10 crypto
  const defaultSymbols = useMemo(() => {
    return [...STOCKS.slice(0, 30), ...ETFS.slice(0, 10), ...CRYPTOS.slice(0, 10)];
  }, []);

  // Exact search (symbol/name prefix)
  const search = useSWR<{ results: { symbol: string; name: string }[]; count: number }>(
    debouncedQuery ? `/api/assets/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  // Semantic search (NLP / keywords)
  const semantic = useSWR<{
    results: { symbol: string; name: string; type: string; sector: string }[];
    explanation: string;
    mode: string;
  }>(
    debouncedSemantic && searchMode === "semantic"
      ? `/api/assets/semantic?q=${encodeURIComponent(debouncedSemantic)}`
      : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  // Pick symbols to show: top of search results OR default universe
  const symbols = useMemo(() => {
    if (debouncedQuery && search.data) {
      return search.data.results.slice(0, 50).map((r) => r.symbol);
    }
    if (debouncedSemantic && semantic.data) {
      return semantic.data.results.slice(0, 30).map((r) => r.symbol);
    }
    return defaultSymbols;
  }, [debouncedQuery, debouncedSemantic, search.data, semantic.data, defaultSymbols]);

  // Fetch quotes
  const quotes = useSWR<{ rows: Row[] }>(
    symbols.length > 0 ? `/api/assets/quote?symbols=${symbols.join(",")}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Fetch analysis (only for filtered indicators — only when filters active)
  const analysisSymbols = useMemo(() => {
    if (trendFilter === "all" && volFilter === "all" && rsiFilter === "all" && riskFilter === "all") {
      return [];
    }
    return symbols.slice(0, 50);
  }, [symbols, trendFilter, volFilter, rsiFilter, riskFilter]);

  // Fetch analysis per ticker (in parallel)
  const [analysisMap, setAnalysisMap] = useState<Record<string, Analysis | null>>({});

  useEffect(() => {
    if (analysisSymbols.length === 0) return;
    let cancelled = false;
    Promise.all(
      analysisSymbols.map(async (s) => {
        try {
          const r = await fetch(`/api/analysis/${encodeURIComponent(s)}`);
          const d = await r.json();
          const a = d?.analysis?.latest;
          if (!a) return [s, null] as const;
          return [
            s,
            {
              adx: a.adx ?? null,
              rsi: a.rsi ?? null,
              atrPct: a.atrPct ?? null,
              bbWidth: a.bbWidth ?? null,
              mfi: a.mfi ?? null,
              volatility: a.volatility ?? null,
              sharpe: a.sharpe ?? null,
              trend:
                a.adx != null && a.adx > 25
                  ? (a.smaTrend === "up" ? "bullish" : "bearish")
                  : "neutral",
            } as Analysis,
          ] as const;
        } catch {
          return [s, null] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const map: Record<string, Analysis | null> = {};
      pairs.forEach(([s, a]) => (map[s] = a));
      setAnalysisMap(map);
    });
    return () => { cancelled = true; };
  }, [analysisSymbols]);

  const analysisLoading =
    analysisSymbols.length > 0 && Object.keys(analysisMap).length === 0;

  const rows = useMemo(() => {
    const baseRows = quotes.data?.rows ?? [];
    return baseRows.map((r) => ({
      ...r,
      analysis: analysisMap[r.symbol] ?? null,
    }));
  }, [quotes.data, analysisMap]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (typeFilter !== "all") {
      out = out.filter((r) => r.type === typeFilter);
    }
    // Indicator filters
    if (trendFilter !== "all") {
      out = out.filter((r) => r.analysis?.trend === trendFilter);
    }
    if (volFilter !== "all") {
      out = out.filter((r) => {
        const v = r.analysis?.volatility;
        if (v == null) return false;
        if (volFilter === "low") return v < 15;
        if (volFilter === "med") return v >= 15 && v <= 30;
        if (volFilter === "high") return v > 30;
        return true;
      });
    }
    if (rsiFilter !== "all") {
      out = out.filter((r) => {
        const rsi = r.analysis?.rsi;
        if (rsi == null) return false;
        if (rsiFilter === "oversold") return rsi < 30;
        if (rsiFilter === "neutral") return rsi >= 30 && rsi <= 70;
        if (rsiFilter === "overbought") return rsi > 70;
        return true;
      });
    }
    if (riskFilter !== "all") {
      out = out.filter((r) => {
        const s = r.analysis?.sharpe;
        if (s == null) return false;
        if (riskFilter === "low") return s > 1;
        if (riskFilter === "med") return s >= 0 && s <= 1;
        if (riskFilter === "high") return s < 0;
        return true;
      });
    }
    return out;
  }, [rows, typeFilter, trendFilter, volFilter, rsiFilter, riskFilter]);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Assets</h1>
        <p className="text-sm text-text-secondary">
          {filteredRows.length} de {rows.length} ativos. Filtre por tipo, tendência, volatilidade, RSI ou risco.
        </p>
      </div>

      {/* Search mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setSearchMode("exact")}
          className={cn(
            "px-3 py-1 text-xs rounded-md border transition-colors",
            searchMode === "exact"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-text-secondary hover:text-foreground"
          )}
        >
          Ticker / Nome
        </button>
        <button
          onClick={() => setSearchMode("semantic")}
          className={cn(
            "px-3 py-1 text-xs rounded-md border transition-colors",
            searchMode === "semantic"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-text-secondary hover:text-foreground"
          )}
        >
          Busca semântica
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "ml-auto flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border transition-colors",
            showFilters
              ? "bg-foreground text-background border-foreground"
              : "border-border text-text-secondary hover:text-foreground"
          )}
        >
          <Filter className="w-3 h-3" />
          Filtros
        </button>
      </div>

      {searchMode === "exact" ? (
        <div className="relative mb-4">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ticker ou nome (ex: AAPL, Apple, Microsoft)"
            className="w-full bg-surface border border-border rounded-md pl-10 pr-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
          />
          {search.isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
          )}
        </div>
      ) : (
        <div className="mb-4">
          <input
            type="text"
            value={semanticQuery}
            onChange={(e) => setSemanticQuery(e.target.value)}
            placeholder="Busca semântica (ex: 'empresa de IA', 'banco grande')"
            className="w-full bg-surface border border-border rounded-md px-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
          />
          {semantic.data?.explanation && (
            <div className="mt-1 text-xs text-text-muted">
              {semantic.data.mode === "ollama" ? "🤖 LLM" : "🔍 keyword"} — {semantic.data.explanation}
            </div>
          )}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <FilterSelect
              label="Tipo"
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as AssetType | "all")}
              options={ALL_TYPES.map((o) => ({ value: o.value, label: o.label }))}
            />
            <FilterSelect
              label="Tendência (ADX)"
              value={trendFilter}
              onChange={(v) => setTrendFilter(v as typeof trendFilter)}
              options={TRENDS.map((o) => ({ value: o.value, label: o.label }))}
              icon={TrendingUp}
            />
            <FilterSelect
              label="Volatilidade"
              value={volFilter}
              onChange={(v) => setVolFilter(v as typeof volFilter)}
              options={VOL_LEVELS.map((o) => ({ value: o.value, label: o.label }))}
              icon={Activity}
            />
            <FilterSelect
              label="RSI (14)"
              value={rsiFilter}
              onChange={(v) => setRsiFilter(v as typeof rsiFilter)}
              options={RSI_ZONES.map((o) => ({ value: o.value, label: o.label }))}
              icon={Volume2}
            />
            <FilterSelect
              label="Risco (Sharpe)"
              value={riskFilter}
              onChange={(v) => setRiskFilter(v as typeof riskFilter)}
              options={RISK_LEVELS.map((o) => ({ value: o.value, label: o.label }))}
              icon={ShieldAlert}
            />
          </div>
          {(trendFilter !== "all" || volFilter !== "all" || rsiFilter !== "all" || riskFilter !== "all") && (
            <div className="mt-3 text-xs text-text-muted">
              {analysisLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Calculando indicadores pros ativos...
                </span>
              ) : (
                <span>Filtros ativos · {filteredRows.length} resultados</span>
              )}
            </div>
          )}
        </div>
      )}

      {filteredRows.length === 0 && !quotes.isLoading && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary text-sm">
            Nenhum resultado. Tente outro ticker ou nome.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Ativo</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Setor</th>
              <th className="text-right px-4 py-3 font-medium">Preço</th>
              <th className="text-right px-4 py-3 font-medium">24h</th>
              <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">ADX</th>
              <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">RSI</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => (
              <tr
                key={`${r.symbol}-${r.type}`}
                className={cn(
                  "border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors",
                  i % 2 === 0 ? "bg-transparent" : "bg-surface-elevated/30",
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted uppercase">
                      {r.type}
                    </span>
                    <Link
                      href={`/asset/${encodeURIComponent(r.symbol)}`}
                      className="font-mono font-semibold text-foreground hover:text-accent transition-colors"
                    >
                      {r.symbol}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted text-xs hidden md:table-cell">{r.sector}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {r.quote ? (
                    <span>${r.quote.price.toFixed(2)}</span>
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
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-muted hidden lg:table-cell">
                  {r.analysis?.adx != null ? r.analysis.adx.toFixed(0) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums hidden lg:table-cell">
                  {r.analysis?.rsi != null ? (
                    <span
                      className={cn(
                        r.analysis.rsi < 30
                          ? "text-positive"
                          : r.analysis.rsi > 70
                          ? "text-negative"
                          : "text-text-muted",
                      )}
                    >
                      {r.analysis.rsi.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: typeof TrendingUp;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-text-muted font-medium flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-foreground/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
