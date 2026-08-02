"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Search as SearchIcon,
  Loader2,
  Filter,
  ChevronDown,
} from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";

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
  volatility: number | null;
  sharpe: number | null;
  trend: "bullish" | "bearish" | "neutral";
};

type ListItem = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
};

type Row = {
  symbol: string;
  type: AssetType;
  sector: string;
  quote: Quote | null;
  analysis?: Analysis | null;
};

type ListResponse = {
  items: ListItem[];
  total: number;
  hasMore: boolean;
  sectors: string[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EXCHANGES = [
  { value: "all", label: "Todos" },
  { value: "sp500", label: "S&P 500" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
] as const;

const PAGE_SIZE = 50;

type Band = { min: number | null; max: number | null; label: string; tone: "good" | "bad" | "neutral" };

function classifyValue(value: number, bands: Band[]): { label: string; tone: "good" | "bad" | "neutral" } {
  for (const b of bands) {
    const minOk = b.min === null || value >= b.min;
    const maxOk = b.max === null || value < b.max;
    if (minOk && maxOk) return { label: b.label, tone: b.tone };
  }
  return { label: "Fora do range", tone: "neutral" };
}

const VOL_BANDS: Band[] = [
  { min: null, max: 15, label: "Baixa", tone: "good" },
  { min: 15, max: 30, label: "Média", tone: "neutral" },
  { min: 30, max: null, label: "Alta", tone: "bad" },
];

const RSI_BANDS: Band[] = [
  { min: null, max: 30, label: "Sobrevendido (sinal de compra)", tone: "good" },
  { min: 30, max: 70, label: "Neutro", tone: "neutral" },
  { min: 70, max: null, label: "Sobrecomprado (sinal de venda)", tone: "bad" },
];

const ADX_BANDS: Band[] = [
  { min: null, max: 20, label: "Sem tendência", tone: "neutral" },
  { min: 20, max: 25, label: "Fraca", tone: "neutral" },
  { min: 25, max: 50, label: "Forte", tone: "good" },
  { min: 50, max: null, label: "Muito forte (exaustão)", tone: "bad" },
];

const SHARPE_BANDS: Band[] = [
  { min: null, max: 0, label: "Pior que sem risco", tone: "bad" },
  { min: 0, max: 1, label: "Aceitável", tone: "neutral" },
  { min: 1, max: 2, label: "Bom", tone: "good" },
  { min: 2, max: null, label: "Excelente", tone: "good" },
];

export default function AssetsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Filters
  const [exchangeFilter, setExchangeFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [trendFilter, setTrendFilter] = useState<"bullish" | "bearish" | "neutral" | "all">("all");
  const [volRange, setVolRange] = useState<[number, number]>([0, 100]);
  const [rsiRange, setRsiRange] = useState<[number, number]>([0, 100]);
  const [sharpeRange, setSharpeRange] = useState<[number, number]>([-10, 10]);
  const [adxRange, setAdxRange] = useState<[number, number]>([0, 100]);

  // Pagination state
  const [page, setPage] = useState(0); // page number, increments per load-more
  const [accumulated, setAccumulated] = useState<ListItem[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [debouncedQuery, query]);

  // Reset when filters change — needed to clear pagination state
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPage(0);
    setAccumulated([]);
  }, [exchangeFilter, sectorFilter, debouncedQuery]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const offset = page * PAGE_SIZE;

  const listUrl = useMemo(() => {
    const sp = new URLSearchParams({
      exchange: exchangeFilter,
      offset: String(offset),
      limit: String(PAGE_SIZE),
    });
    if (sectorFilter !== "all") sp.set("sector", sectorFilter);
    if (debouncedQuery) sp.set("q", debouncedQuery);
    return `/api/assets/list?${sp}`;
  }, [exchangeFilter, sectorFilter, debouncedQuery, offset]);

  const { data: listData, isLoading: loadingList } = useSWR<ListResponse>(listUrl, fetcher, {
    keepPreviousData: true,
  });

  // Append new page to accumulated list
  const lastUrlRef = useRef<string>("");
  useEffect(() => {
    if (!listData) return;
    if (lastUrlRef.current === listUrl) return;
    lastUrlRef.current = listUrl;
    setAccumulated((prev) => {
      // If resetting, replace. Otherwise append only new items.
      if (page === 0) return listData.items;
      // Filter out duplicates
      const existing = new Set(prev.map((i) => i.symbol));
      const fresh = listData.items.filter((i) => !existing.has(i.symbol));
      return [...prev, ...fresh];
    });
  }, [listData, listUrl, page]);

  const loadMore = () => {
    if (listData?.hasMore && !loadingList) setPage((p) => p + 1);
  };

  // Quotes for accumulated items
  const symbols = useMemo(() => accumulated.map((it) => it.symbol), [accumulated]);
  const quotes = useSWR<{ rows: Row[] }>(
    symbols.length > 0 ? `/api/assets/quote?symbols=${symbols.join(",")}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const sectors = useMemo(() => listData?.sectors ?? [], [listData?.sectors]);

  // Analysis (lazy — only when filters active)
  const [analysisMap, setAnalysisMap] = useState<Record<string, Analysis | null>>({});

  const filtersActive =
    trendFilter !== "all" ||
    volRange[0] !== 0 || volRange[1] !== 100 ||
    rsiRange[0] !== 0 || rsiRange[1] !== 100 ||
    sharpeRange[0] !== -10 || sharpeRange[1] !== 10 ||
    adxRange[0] !== 0 || adxRange[1] !== 100;

  const symbolsKey = symbols.join(",");

  useEffect(() => {
    if (!filtersActive) return;
    if (symbols.length === 0) return;
    let cancelled = false;
    Promise.all(
      symbols.map(async (s) => {
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
    return () => {
      cancelled = true;
    };
  }, [filtersActive, symbolsKey, symbols.length, symbols]);

  const rows = useMemo(() => {
    const baseRows = quotes.data?.rows ?? [];
    return baseRows.map((r) => ({
      ...r,
      analysis: analysisMap[r.symbol] ?? null,
    }));
  }, [quotes.data, analysisMap]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (trendFilter !== "all") {
      out = out.filter((r) => r.analysis?.trend === trendFilter);
    }
    out = out.filter((r) => {
      const v = r.analysis?.volatility;
      if (v != null && (v < volRange[0] || v > volRange[1])) return false;
      return true;
    });
    out = out.filter((r) => {
      const rsi = r.analysis?.rsi;
      if (rsi != null && (rsi < rsiRange[0] || rsi > rsiRange[1])) return false;
      return true;
    });
    out = out.filter((r) => {
      const s = r.analysis?.sharpe;
      if (s != null && (s < sharpeRange[0] || s > sharpeRange[1])) return false;
      return true;
    });
    out = out.filter((r) => {
      const adx = r.analysis?.adx;
      if (adx != null && (adx < adxRange[0] || adx > adxRange[1])) return false;
      return true;
    });
    return out;
  }, [rows, trendFilter, volRange, rsiRange, sharpeRange, adxRange]);

  const volZone = classifyValue((volRange[0] + volRange[1]) / 2, VOL_BANDS);
  const rsiZone = classifyValue((rsiRange[0] + rsiRange[1]) / 2, RSI_BANDS);
  const sharpeZone = classifyValue((sharpeRange[0] + sharpeRange[1]) / 2, SHARPE_BANDS);
  const adxZone = classifyValue((adxRange[0] + adxRange[1]) / 2, ADX_BANDS);

  const analysisLoading =
    filtersActive && symbols.length > 0 && Object.keys(analysisMap).length === 0 && !loadingList;

  const total = listData?.total ?? 0;
  const hasMore = listData?.hasMore ?? false;

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Assets</h1>
          <p className="text-sm text-text-secondary">
            <span className="font-mono text-foreground">{total}</span> ativos no universo · {filteredRows.length} mostrados
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border transition-colors",
            showFilters
              ? "bg-foreground text-background border-foreground"
              : "border-border text-text-secondary hover:text-foreground"
          )}
        >
          <Filter className="w-3 h-3" />
          Filtros
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ticker ou nome (ex: AAPL, Apple, Microsoft)"
            className="w-full bg-surface border border-border rounded-md pl-10 pr-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30 transition-colors"
          />
          {loadingList && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
          )}
        </div>
        <select
          value={exchangeFilter}
          onChange={(e) => setExchangeFilter(e.target.value)}
          className="bg-surface border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-foreground/30"
        >
          {EXCHANGES.map((ex) => (
            <option key={ex.value} value={ex.value}>{ex.label}</option>
          ))}
        </select>
        {exchangeFilter === "sp500" && (
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-surface border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-foreground/30 max-w-[220px]"
          >
            <option value="all">Todos os setores</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {showFilters && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <RangeSlider
              label="Volatilidade (anualizada)"
              value={volRange}
              onChange={setVolRange}
              min={0}
              max={100}
              step={1}
              unit="%"
              zone={volZone}
            />
            <RangeSlider
              label="RSI (14)"
              value={rsiRange}
              onChange={setRsiRange}
              min={0}
              max={100}
              step={1}
              unit=""
              zone={rsiZone}
            />
            <RangeSlider
              label="ADX (força da tendência)"
              value={adxRange}
              onChange={setAdxRange}
              min={0}
              max={100}
              step={1}
              unit=""
              zone={adxZone}
            />
            <RangeSlider
              label="Sharpe (risk-adj. return)"
              value={sharpeRange}
              onChange={setSharpeRange}
              min={-5}
              max={5}
              step={0.1}
              unit=""
              zone={sharpeZone}
            />
            <div>
              <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">
                Tendência
              </label>
              <select
                value={trendFilter}
                onChange={(e) => setTrendFilter(e.target.value as typeof trendFilter)}
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm"
              >
                <option value="all">Qualquer</option>
                <option value="bullish">↑ Alta (SMA20 acima de SMA50, ADX acima de 25)</option>
                <option value="bearish">↓ Baixa (SMA20 abaixo de SMA50, ADX acima de 25)</option>
                <option value="neutral">→ Lateral (ADX até 25)</option>
              </select>
            </div>
          </div>
          {filtersActive && (
            <div className="mt-4 text-xs text-text-muted">
              {analysisLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Calculando indicadores pros {symbols.length} ativos visíveis...
                </span>
              ) : (
                <span>Filtros ativos · {filteredRows.length} de {rows.length} resultados</span>
              )}
            </div>
          )}
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
              <th className="text-right px-4 py-3 font-medium hidden xl:table-cell">Vol%</th>
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
                      {r.type === "stock" ? "ação" : r.type === "etf" ? "etf" : "crypto"}
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
                    <span className={cn(r.quote.changePercent >= 0 ? "text-positive" : "text-negative")}>
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
                    <span className={cn(
                      r.analysis.rsi < 30 ? "text-positive" : r.analysis.rsi > 70 ? "text-negative" : "text-text-muted",
                    )}>
                      {r.analysis.rsi.toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-text-muted hidden xl:table-cell">
                  {r.analysis?.volatility != null ? `${r.analysis.volatility.toFixed(0)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingList}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-surface border border-border rounded-md hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            {loadingList ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Carregar mais 50 ({total - accumulated.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
}

function RangeSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  zone,
}: {
  label: string;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  zone: { label: string; tone: "good" | "bad" | "neutral" };
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-xs uppercase tracking-wider text-text-muted font-medium">
          {label}
        </label>
        {zone.label && (
          <span
            className={cn(
              "text-xs font-medium",
              zone.tone === "good" && "text-positive",
              zone.tone === "bad" && "text-negative",
              zone.tone === "neutral" && "text-text-secondary",
            )}
          >
            {zone.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value[0]}
          min={min}
          max={value[1]}
          step={step}
          onChange={(e) => onChange([parseFloat(e.target.value), value[1]])}
          className="w-20 bg-background border border-border rounded-md px-2 py-1.5 text-sm font-mono tabular-nums"
        />
        <span className="text-text-muted text-xs">a</span>
        <input
          type="number"
          value={value[1]}
          min={value[0]}
          max={max}
          step={step}
          onChange={(e) => onChange([value[0], parseFloat(e.target.value)])}
          className="w-20 bg-background border border-border rounded-md px-2 py-1.5 text-sm font-mono tabular-nums"
        />
        {unit && <span className="text-text-muted text-xs">{unit}</span>}
      </div>
    </div>
  );
}
