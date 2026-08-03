"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Search as SearchIcon,
  Loader2,
  Filter,
  Settings2,
  X,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { cn, formatCompact, formatPercent } from "@/lib/utils";
import { RichFundamentalsTable } from "@/components/rich-fundamentals-table";

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
  atrPct: number | null;
  mfi: number | null;
  bbWidth: number | null;
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

// Columns the user can toggle. Only render if value exists.
type ColumnDef = {
  key: string;
  label: string;
  align: "left" | "right";
  defaultOn: boolean;
  // Returns true if column has a meaningful value for this row
  hasValue: (row: Row) => boolean;
  render: (row: Row) => React.ReactNode;
};

const COLUMNS: ColumnDef[] = [
  {
    key: "setor",
    label: "Setor",
    align: "left",
    defaultOn: true,
    hasValue: (r) => !!r.sector && r.sector !== "—",
    render: (r) => <span className="text-text-muted text-xs">{r.sector || "—"}</span>,
  },
  {
    key: "preco",
    label: "Preço",
    align: "right",
    defaultOn: true,
    hasValue: (r) => r.quote != null,
    render: (r) =>
      r.quote ? <span>${r.quote.price.toFixed(2)}</span> : <span className="text-text-muted">—</span>,
  },
  {
    key: "24h",
    label: "24h",
    align: "right",
    defaultOn: true,
    hasValue: (r) => r.quote != null,
    render: (r) =>
      r.quote ? (
        <span className={cn(r.quote.changePercent >= 0 ? "text-positive" : "text-negative")}>
          {formatPercent(r.quote.changePercent)}
        </span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "volume",
    label: "Vol 24h",
    align: "right",
    defaultOn: false,
    hasValue: (r) => r.quote != null && r.quote.volume > 0,
    render: (r) =>
      r.quote && r.quote.volume > 0 ? (
        <span className="text-text-muted">{formatCompact(r.quote.volume)}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "dayRange",
    label: "Range 24h",
    align: "right",
    defaultOn: false,
    hasValue: (r) =>
      r.quote != null && r.quote.dayLow > 0 && r.quote.dayHigh > r.quote.dayLow,
    render: (r) =>
      r.quote && r.quote.dayLow > 0 ? (
        <span className="text-text-muted text-xs tabular-nums">
          ${r.quote.dayLow.toFixed(2)} – ${r.quote.dayHigh.toFixed(2)}
        </span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "adx",
    label: "ADX",
    align: "right",
    defaultOn: false,
    hasValue: (r) => r.analysis?.adx != null,
    render: (r) =>
      r.analysis?.adx != null ? (
        <span className="text-text-muted">{r.analysis.adx.toFixed(0)}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "rsi",
    label: "RSI",
    align: "right",
    defaultOn: false,
    hasValue: (r) => r.analysis?.rsi != null,
    render: (r) =>
      r.analysis?.rsi != null ? (
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
      ),
  },
  {
    key: "vol",
    label: "Vol %",
    align: "right",
    defaultOn: false,
    hasValue: (r) => r.analysis?.volatility != null,
    render: (r) =>
      r.analysis?.volatility != null ? (
        <span className="text-text-muted">{r.analysis.volatility.toFixed(0)}%</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "atr",
    label: "ATR %",
    align: "right",
    defaultOn: false,
    hasValue: (r) => r.analysis?.atrPct != null,
    render: (r) =>
      r.analysis?.atrPct != null ? (
        <span className="text-text-muted">{r.analysis.atrPct.toFixed(1)}%</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "mfi",
    label: "MFI",
    align: "right",
    defaultOn: false,
    hasValue: (r) => r.analysis?.mfi != null,
    render: (r) =>
      r.analysis?.mfi != null ? (
        <span
          className={cn(
            r.analysis.mfi < 20
              ? "text-positive"
              : r.analysis.mfi > 80
                ? "text-negative"
                : "text-text-muted",
          )}
        >
          {r.analysis.mfi.toFixed(0)}
        </span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "sharpe",
    label: "Sharpe",
    align: "right",
    defaultOn: false,
    hasValue: (r) => r.analysis?.sharpe != null,
    render: (r) =>
      r.analysis?.sharpe != null ? (
        <span className="text-text-muted tabular-nums">{r.analysis.sharpe.toFixed(2)}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
];

const DEFAULT_COLS = new Set(COLUMNS.filter((c) => c.defaultOn).map((c) => c.key));
const COLS_KEY = "screener:assets:cols";

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
  { min: null, max: 30, label: "Sobrevendido", tone: "good" },
  { min: 30, max: 70, label: "Neutro", tone: "neutral" },
  { min: 70, max: null, label: "Sobrecomprado", tone: "bad" },
];

const ADX_BANDS: Band[] = [
  { min: null, max: 20, label: "Sem tendência", tone: "neutral" },
  { min: 20, max: 25, label: "Fraca", tone: "neutral" },
  { min: 25, max: 50, label: "Forte", tone: "good" },
  { min: 50, max: null, label: "Muito forte", tone: "bad" },
];

const SHARPE_BANDS: Band[] = [
  { min: null, max: 0, label: "Negativo", tone: "bad" },
  { min: 0, max: 1, label: "Aceitável", tone: "neutral" },
  { min: 1, max: 2, label: "Bom", tone: "good" },
  { min: 2, max: null, label: "Excelente", tone: "good" },
];

export default function AssetsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [richTable, setRichTable] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("screener:assets:rich") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("screener:assets:rich", richTable ? "1" : "0");
    } catch {}
  }, [richTable]);

  // Filters
  const [exchangeFilter, setExchangeFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [trendFilter, setTrendFilter] = useState<"bullish" | "bearish" | "neutral" | "all">("all");
  const [volRange, setVolRange] = useState<[number, number]>([0, 100]);
  const [rsiRange, setRsiRange] = useState<[number, number]>([0, 100]);
  const [sharpeRange, setSharpeRange] = useState<[number, number]>([-5, 5]);
  const [adxRange, setAdxRange] = useState<[number, number]>([0, 100]);

  // Column visibility (persisted to localStorage) — lazy init to avoid SSR mismatch
  const [activeCols, setActiveCols] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return DEFAULT_COLS;
    try {
      const stored = localStorage.getItem(COLS_KEY);
      if (stored) {
        const arr = JSON.parse(stored) as string[];
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return DEFAULT_COLS;
  });

  // Sincroniza com localStorage depois da hidratacao
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLS_KEY);
      if (stored) {
        const arr = JSON.parse(stored) as string[];
        if (Array.isArray(arr)) {
          const newSet = new Set(arr);
          // So atualiza se mudou
          if (newSet.size !== activeCols.size || ![...newSet].every(k => activeCols.has(k))) {
            setActiveCols(newSet);
          }
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCol = (key: string) => {
    setActiveCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(COLS_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Pagination
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [debouncedQuery, query]);useEffect(() => {
    setPage(1);
  }, [exchangeFilter, sectorFilter, debouncedQuery]);const offset = (page - 1) * PAGE_SIZE;
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

  const allItems = useMemo(() => listData?.items ?? [], [listData?.items]);
  const totalPages = Math.max(1, Math.ceil((listData?.total ?? 0) / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = (listData?.hasMore ?? false) || page < totalPages;

  const pageNumbers = useMemo(() => {
    const cur = page;
    const last = totalPages;
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const set = new Set<number>([1, 2, last - 1, last, cur - 1, cur, cur + 1]);
    const sorted = Array.from(set).filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
    const result: (number | "...")[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) result.push("...");
      result.push(p);
      prev = p;
    }
    return result;
  }, [page, totalPages]);

  const symbols = useMemo(() => allItems.map((it) => it.symbol), [allItems]);
  const quotes = useSWR<{ rows: Row[] }>(
    symbols.length > 0 ? `/api/assets/quote?symbols=${symbols.join(",")}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const sectors = useMemo(() => listData?.sectors ?? [], [listData?.sectors]);

  const [analysisMap, setAnalysisMap] = useState<Record<string, Analysis | null>>({});

  const filtersActive =
    trendFilter !== "all" ||
    volRange[0] !== 0 || volRange[1] !== 100 ||
    rsiRange[0] !== 0 || rsiRange[1] !== 100 ||
    sharpeRange[0] !== -5 || sharpeRange[1] !== 5 ||
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
              atrPct: a.atrPct ?? null,
              mfi: a.mfi ?? null,
              bbWidth: a.bbWidth ?? null,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersActive, symbolsKey, symbols.length]);

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

  // Only show columns that have values in any visible row
  // Visible cols: todas as colunas ativas pelo usuario.
  // Colunas sem valor nas rows filtradas mostram placeholder "—".
  const visibleCols = useMemo(
    () => COLUMNS.filter((c) => activeCols.has(c.key)),
    [activeCols],
  );

  const volZone = classifyValue((volRange[0] + volRange[1]) / 2, VOL_BANDS);
  const rsiZone = classifyValue((rsiRange[0] + rsiRange[1]) / 2, RSI_BANDS);
  const sharpeZone = classifyValue((sharpeRange[0] + sharpeRange[1]) / 2, SHARPE_BANDS);
  const adxZone = classifyValue((adxRange[0] + adxRange[1]) / 2, ADX_BANDS);

  const analysisLoading =
    filtersActive && symbols.length > 0 && Object.keys(analysisMap).length === 0 && !loadingList;

  const total = listData?.total ?? 0;

  // Foundation batch for rich mode
  const symbolsForBatch = filteredRows.map((r) => r.symbol);
  const { data: richData } = useSWR<Record<string, unknown>>(
    richTable && symbolsForBatch.length > 0
      ? `/api/fundamentals/batch?symbols=${symbolsForBatch.join(",")}`
      : null,
    fetcher,
    { dedupingInterval: 60_000 },
  );

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Assets</h1>
          <p className="text-sm text-text-secondary">
            <span className="font-mono text-foreground">{total}</span> ativos · {filteredRows.length} mostrados · {visibleCols.length} colunas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRichTable(!richTable)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border transition-colors",
              richTable
                ? "bg-foreground text-background border-foreground"
                : "border-border text-text-secondary hover:text-foreground",
            )}
          >
            {richTable ? <Sparkles className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
            {richTable ? "Modo rico" : "Modo rico"}
          </button>
          <button
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border transition-colors",
              showColumnPicker
                ? "bg-foreground text-background border-foreground"
                : "border-border text-text-secondary hover:text-foreground",
            )}
          >
            <Settings2 className="w-3 h-3" />
            Colunas
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border transition-colors",
              showFilters
                ? "bg-foreground text-background border-foreground"
                : "border-border text-text-secondary hover:text-foreground",
            )}
          >
            <Filter className="w-3 h-3" />
            Filtros
          </button>
        </div>
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

      {showColumnPicker && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Colunas visíveis</h3>
            <button
              onClick={() => setShowColumnPicker(false)}
              className="p-1 hover:bg-surface-elevated rounded"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLUMNS.map((c) => (
              <button
                key={c.key}
                onClick={() => toggleCol(c.key)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded border transition-colors",
                  activeCols.has(c.key)
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-text-muted hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3">
            Colunas ativas ficam visíveis mesmo sem valor (mostram —). Use os filtros pra gerar dados de análise.
          </p>
        </div>
      )}

      {showFilters && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RangeSlider
              label="Volatilidade %"
              value={volRange}
              onChange={setVolRange}
              min={0}
              max={100}
              step={1}
              zone={volZone}
            />
            <RangeSlider
              label="RSI"
              value={rsiRange}
              onChange={setRsiRange}
              min={0}
              max={100}
              step={1}
              zone={rsiZone}
            />
            <RangeSlider
              label="ADX"
              value={adxRange}
              onChange={setAdxRange}
              min={0}
              max={100}
              step={1}
              zone={adxZone}
            />
            <RangeSlider
              label="Sharpe"
              value={sharpeRange}
              onChange={setSharpeRange}
              min={-5}
              max={5}
              step={0.1}
              zone={sharpeZone}
            />
          </div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-text-muted">Tendência:</span>
            <div className="flex gap-1">
              {[
                { value: "all" as const, label: "Qualquer" },
                { value: "bullish" as const, label: "↑ Alta" },
                { value: "bearish" as const, label: "↓ Baixa" },
                { value: "neutral" as const, label: "→ Lateral" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrendFilter(opt.value)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded transition-colors",
                    trendFilter === opt.value
                      ? "bg-foreground text-background"
                      : "border border-border text-text-secondary hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {filtersActive && (
            <div className="mt-3 text-xs text-text-muted">
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

      {filteredRows.length === 0 && !loadingList && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary text-sm">
            Nenhum resultado. Tente outro ticker ou nome.
          </p>
        </div>
      )}

      {visibleCols.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium sticky left-0 bg-surface">
                    Ativo
                  </th>
                  {visibleCols.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "px-4 py-3 font-medium",
                        c.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              {richTable && richData ? (
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.symbol} className="border-b border-border-subtle hover:bg-surface-elevated transition-colors">
                      <td colSpan={visibleCols.length + 1} className="p-2">
                        <RichFundamentalsTable
                          rows={[{ symbol: r.symbol, weight: 1 / filteredRows.length }]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : (
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr
                    key={`${r.symbol}-${r.type}`}
                    className={cn(
                      "border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors",
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-elevated/30",
                    )}
                  >
                    <td className="px-4 py-3 sticky left-0 bg-inherit">
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
                    {visibleCols.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3 font-mono tabular-nums",
                          c.align === "right" ? "text-right" : "text-left",
                        )}
                      >
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      {(totalPages > 1 || hasPrev) && (
        <div className="mt-6 flex items-center justify-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrev || loadingList}
            className="px-3 py-1.5 text-sm rounded-md border border-border text-text-secondary hover:text-foreground hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-text-muted text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                disabled={loadingList}
                className={cn(
                  "min-w-[36px] px-2 py-1.5 text-sm font-mono tabular-nums rounded-md border transition-colors disabled:opacity-50",
                  p === page
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-text-secondary hover:text-foreground hover:bg-surface-elevated",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext || loadingList}
            className="px-3 py-1.5 text-sm rounded-md border border-border text-text-secondary hover:text-foreground hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
      <div className="mt-2 text-center text-xs text-text-muted">
        Página {page} de {totalPages} · {total} ativos
      </div>
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
  zone,
}: {
  label: string;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  min: number;
  max: number;
  step: number;
  zone: { label: string; tone: "good" | "bad" | "neutral" };
}) {
  const [lo, hi] = value;
  const clampedLo = Math.max(min, Math.min(lo, max));
  const clampedHi = Math.max(min, Math.min(hi, max));
  const span = max - min || 1;
  const loPct = ((clampedLo - min) / span) * 100;
  const hiPct = ((clampedHi - min) / span) * 100;

  return (
    <div className="rounded-lg bg-surface-elevated/40 border border-border-subtle p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
          {label}
        </label>
        <span
          className={cn(
            "text-[11px] font-medium px-1.5 py-0.5 rounded",
            zone.tone === "good" && "bg-positive/10 text-positive",
            zone.tone === "bad" && "bg-negative/10 text-negative",
            zone.tone === "neutral" && "bg-surface text-text-secondary",
          )}
        >
          {zone.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1 mb-2 font-mono tabular-nums text-sm">
        <span className="text-foreground font-medium">{lo}</span>
        <span className="text-text-muted">–</span>
        <span className="text-foreground font-medium">{hi}</span>
      </div>
      {/* Dual range */}
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-surface rounded-full" />
        <div
          className="absolute h-1.5 bg-foreground/60 rounded-full"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange([Math.min(v, hi), hi]);
          }}
          className="absolute inset-x-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:cursor-grab"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange([lo, Math.max(v, lo)]);
          }}
          className="absolute inset-x-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:cursor-grab"
        />
      </div>
    </div>
  );
}
