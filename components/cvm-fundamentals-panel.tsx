"use client";

import { useState } from "react";
import useSWR from "swr";
import { LineChart, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CvmQuarter = {
  endDate: string;
  source?: string;
  revenue: number | null;
  grossProfit: number | null;
  ebit: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  revenueGrowthYoY: number | null;
  netIncomeGrowthYoY: number | null;
};

type TtmData = {
  ticker: string;
  populated: boolean;
  asOfQuarter?: string;
  quartersIncluded?: number;
  sourceQuarters?: string[];
  revenue?: number | null;
  grossProfit?: number | null;
  netIncome?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  epsYoYGrowth?: number | null;
  latestTotalEquity?: number | null;
  latestTotalAssets?: number | null;
};

type CvmHistory = {
  ticker: string;
  populated: boolean;
  quarters: CvmQuarter[];
};

function fmtBRL(n: number): string {
  if (Math.abs(n) >= 1e9) return `R$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `R$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `R$${(n / 1e3).toFixed(2)}K`;
  return `R$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtGrowth(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n * 100).toFixed(2)}%`;
}

function toneGrowth(n: number): string {
  if (n > 0) return "text-positive";
  if (n < 0) return "text-negative";
  return "text-ink";
}

type MetricKey =
  | "revenue"
  | "grossProfit"
  | "ebit"
  | "netIncome"
  | "grossMargin"
  | "operatingMargin"
  | "netMargin"
  | "totalAssets"
  | "totalLiabilities"
  | "totalEquity"
  | "revenueGrowthYoY"
  | "netIncomeGrowthYoY";

type MetricDef = {
  key: MetricKey;
  label: string;
  format: "brl" | "pct" | "growth";
  categories: ReadonlyArray<string>;
};

const METRICS: ReadonlyArray<MetricDef> = [
  { key: "revenue", label: "Receita", format: "brl", categories: ["Resultado"] },
  { key: "grossProfit", label: "Lucro Bruto", format: "brl", categories: ["Resultado"] },
  { key: "ebit", label: "EBIT", format: "brl", categories: ["Resultado"] },
  { key: "netIncome", label: "Lucro Líquido", format: "brl", categories: ["Resultado"] },
  { key: "grossMargin", label: "Margem Bruta", format: "pct", categories: ["Margens"] },
  { key: "operatingMargin", label: "Margem Operacional", format: "pct", categories: ["Margens"] },
  { key: "netMargin", label: "Margem Líquida", format: "pct", categories: ["Margens"] },
  { key: "revenueGrowthYoY", label: "Receita Y/Y", format: "growth", categories: ["Crescimento"] },
  { key: "netIncomeGrowthYoY", label: "Lucro Y/Y", format: "growth", categories: ["Crescimento"] },
  { key: "totalAssets", label: "Ativo Total", format: "brl", categories: ["Balanço"] },
  { key: "totalLiabilities", label: "Passivo Total", format: "brl", categories: ["Balanço"] },
  { key: "totalEquity", label: "Patrimônio Líquido", format: "brl", categories: ["Balanço"] },
];

const CATEGORIES = ["Resultado", "Margens", "Crescimento", "Balanço"] as const;

function formatValue(def: MetricDef, v: number | null | undefined): string {
  if (v == null) return "—";
  if (def.format === "brl") return fmtBRL(v);
  if (def.format === "pct") return fmtPct(v);
  return fmtGrowth(v);
}

function seriesOf(quarters: CvmQuarter[], key: MetricKey): Array<{ date: string; value: number; source?: string }> {
  const out: Array<{ date: string; value: number; source?: string }> = [];
  for (const q of quarters) {
    const v = q[key];
    if (v != null) out.push({ date: q.endDate, value: v, source: q.source });
  }
  return out;
}

function CvmHistoryPopup({
  ticker,
  metricKey,
  metricLabel,
  onClose,
}: {
  ticker: string;
  metricKey: MetricKey;
  metricLabel: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useSWR<CvmHistory>(
    `/api/fundamentals/history/${ticker}`,
    fetcher,
  );

  const series = data && data.quarters ? seriesOf(data.quarters, metricKey) : [];
  const w = 640;
  const h = 240;
  const vals = series.map((p) => p.value);
  const min = vals.length > 0 ? Math.min(...vals) : 0;
  const max = vals.length > 0 ? Math.max(...vals) : 1;
  const range = max - min || Math.abs(max) || 1;

  const points = vals
    .map((v, i) => {
      const x = (i / Math.max(1, vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 32) - 16;
      return `${x},${y}`;
    })
    .join(" ");

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => min + (range * i) / yTicks);

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-hairline rounded-lg p-6 max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {ticker} — {metricLabel}
            </h2>
            <p className="text-sm text-muted">
              {data?.populated
                ? `${series.length} períodos (anual)`
                : "Sem dado CVM"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-elevated/60"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative h-[240px] bg-background/50 rounded border border-hairline overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>
          ) : vals.length < 2 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
              Sem dados históricos suficientes
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${w} ${h}`}
              preserveAspectRatio="none"
            >
              {tickValues.map((tv, i) => {
                const y = h - ((tv - min) / range) * (h - 32) - 16;
                return (
                  <g key={i}>
                    <line
                      x1={40}
                      x2={w}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.08}
                      strokeWidth={1}
                    />
                    <text
                      x={4}
                      y={y + 3}
                      className="fill-muted"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {Math.abs(tv) >= 1e9
                        ? `${(tv / 1e9).toFixed(1)}B`
                        : Math.abs(tv) >= 1e6
                          ? `${(tv / 1e6).toFixed(1)}M`
                          : Math.abs(tv) >= 1e3
                            ? `${(tv / 1e3).toFixed(1)}K`
                            : tv.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <polyline
                points={points}
                fill="none"
                stroke="#a78bfa"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {series.map((p, i) => {
                const x = (i / Math.max(1, series.length - 1)) * w;
                const y = h - ((p.value - min) / range) * (h - 32) - 16;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={3}
                    fill="#a78bfa"
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </svg>
          )}
        </div>

        {series.length >= 2 && (
          <div className="flex justify-between text-xs text-muted mt-2 font-mono">
            <span>{series[0].date.slice(0, 4)}</span>
            <span>{series[series.length - 1].date.slice(0, 4)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricRow({
  metric,
  ticker,
  ttmValue,
  annualValues,
  onOpenChart,
}: {
  metric: MetricDef;
  ticker: string;
  ttmValue: number | null | undefined;
  annualValues: Array<{ year: string; value: number | null }>;
  onOpenChart: (key: MetricKey, label: string) => void;
}) {
  const display = formatValue(metric, ttmValue);
  const useGrowthTone = metric.format === "growth";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,90px)_repeat(5,minmax(0,75px))_auto] items-center h-[34px] px-3 border-b border-hairline last:border-b-0 gap-2 group hover:bg-canvas-soft/50">
      <span className="text-[12px] text-muted truncate pr-2">{metric.label}</span>
      <span
        className={cn(
          "num text-[12.5px] font-semibold text-right whitespace-nowrap tabular-nums",
          ttmValue == null && "text-faint",
          useGrowthTone && ttmValue != null && toneGrowth(ttmValue),
          "text-ink",
        )}
      >
        {display}
      </span>
      {annualValues.map((av) => (
        <span
          key={av.year}
          className={cn(
            "num text-[11px] text-muted text-right whitespace-nowrap tabular-nums",
            av.value == null && "text-faint",
          )}
        >
          {formatValue(metric, av.value)}
        </span>
      ))}
      <button
        type="button"
        onClick={() => onOpenChart(metric.key, metric.label)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-canvas-soft text-muted hover:text-brand-bright"
        title="Ver histórico"
        aria-label={`Ver histórico de ${metric.label}`}
      >
        <LineChart className="w-3 h-3" />
      </button>
    </div>
  );
}

export function CvmFundamentalsPanel({ ticker }: { ticker: string }) {
  const [historyOpen, setHistoryOpen] = useState<{
    metricKey: MetricKey;
    label: string;
  } | null>(null);

  const { data: ttmData } = useSWR<TtmData>(
    `/api/fundamentals/ttm/${ticker}`,
    fetcher,
  );
  const { data: historyData, isLoading } = useSWR<CvmHistory>(
    `/api/fundamentals/history/${ticker}`,
    fetcher,
  );

  if (isLoading && !historyData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-hairline-strong">
            <div className="h-8 shimmer border-b border-hairline-strong" />
            <div className="space-y-0">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-[34px] shimmer border-b border-hairline last:border-b-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!historyData || !historyData.populated || historyData.quarters.length === 0) {
    return (
      <div className="py-5 text-[12px] text-faint">
        Sem histórico CVM para este ticker (não consta no cadastro IBOV / CVM).
      </div>
    );
  }

  const annual = (historyData.quarters ?? []).filter((q) => q.endDate.endsWith("-12-31"));
  const annualYears = Array.from(new Set(annual.map((q) => q.endDate.slice(0, 4)))).sort();
  const lastFiveYears = annualYears.slice(-5);

  const annualByYear = new Map<string, CvmQuarter>();
  for (const q of annual) {
    const y = q.endDate.slice(0, 4);
    if (lastFiveYears.includes(y)) {
      annualByYear.set(y, q);
    }
  }

  const annualValuesByKey = (key: MetricKey) =>
    lastFiveYears.map((year) => {
      const v = annualByYear.get(year)?.[key];
      return { year, value: v ?? null };
    });

  const ttmValueFor = (key: MetricKey): number | null => {
    if (!ttmData?.populated) return null;
    switch (key) {
      case "revenue":
        return ttmData.revenue ?? null;
      case "grossProfit":
        return ttmData.grossProfit ?? null;
      case "netIncome":
        return ttmData.netIncome ?? null;
      case "grossMargin":
        return ttmData.grossMargin ?? null;
      case "operatingMargin":
        return ttmData.operatingMargin ?? null;
      case "netMargin":
        return ttmData.netMargin ?? null;
      case "totalAssets":
        return ttmData.latestTotalAssets ?? null;
      case "totalEquity":
        return ttmData.latestTotalEquity ?? null;
      default:
        return null;
    }
  };

  const categoryMap = new Map<string, MetricDef[]>();
  for (const cat of CATEGORIES) categoryMap.set(cat, []);
  for (const m of METRICS) {
    for (const cat of m.categories) {
      categoryMap.get(cat)?.push(m);
    }
  }

  const ttmAsOf = ttmData?.asOfQuarter ?? null;
  const latestYear = lastFiveYears[lastFiveYears.length - 1];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => {
          const ms = categoryMap.get(cat) ?? [];
          if (ms.length === 0) return null;
          return (
            <div key={cat} className="border border-hairline-strong">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,90px)_repeat(5,minmax(0,75px))_auto] items-center gap-2 px-3 py-2 bg-canvas-soft border-b border-hairline-strong label-s label-muted-2 uppercase tracking-wider">
                <span>{cat}</span>
                <span className="text-right">TTM{ttmAsOf ? ` · ${ttmAsOf.slice(0, 7)}` : ""}</span>
                {lastFiveYears.map((y) => (
                  <span key={y} className="text-right text-[10px]">{y}</span>
                ))}
                <span className="w-4" />
              </div>
              <div>
                {ms.map((m) => (
                  <MetricRow
                    key={m.key}
                    metric={m}
                    ticker={ticker}
                    ttmValue={ttmValueFor(m.key)}
                    annualValues={annualValuesByKey(m.key)}
                    onOpenChart={(key, label) => setHistoryOpen({ metricKey: key, label })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 label-s label-muted-2">
        TTM: CVM ITR + Brapi ({ttmData?.quartersIncluded ?? 0} trimestres · até {ttmData?.asOfQuarter ?? "n/a"}) ·
        {" "}Anual: CVM ITR + DFP ({lastFiveYears.length} anos · até {latestYear})
      </div>

      {historyOpen && (
        <CvmHistoryPopup
          ticker={ticker}
          metricKey={historyOpen.metricKey}
          metricLabel={historyOpen.label}
          onClose={() => setHistoryOpen(null)}
        />
      )}
    </>
  );
}
