"use client";

import { useState } from "react";
import useSWR from "swr";
import { LineChart, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CvmQuarter = {
  endDate: string;
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

type CvmHistory = {
  ticker: string;
  cnpj?: string;
  cvm?: string;
  name?: string;
  populated: boolean;
  quarters: CvmQuarter[];
};

// ——— Value formatters ———

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

function fmtPp(n: number): string {
  // For margins displayed as pp deltas (e.g. +1.20pp)
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n * 100).toFixed(2)}pp`;
}

function toneGrowth(n: number): string {
  if (n > 0) return "text-positive";
  if (n < 0) return "text-negative";
  return "text-ink";
}

// ——— Metric registry ———

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
  /** Categories this metric belongs to (1+). */
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

function formatValue(def: MetricDef, v: number | null): string {
  if (v == null) return "—";
  if (def.format === "brl") return fmtBRL(v);
  if (def.format === "pct") return fmtPct(v);
  return fmtGrowth(v);
}

function latestValue(quarters: CvmQuarter[], key: MetricKey): number | null {
  // Annual data: pick the most recent quarter that has a value.
  for (let i = quarters.length - 1; i >= 0; i--) {
    const v = quarters[i][key];
    if (v != null) return v;
  }
  return null;
}

function seriesOf(quarters: CvmQuarter[], key: MetricKey): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  for (const q of quarters) {
    const v = q[key];
    if (v != null) out.push({ date: q.endDate, value: v });
  }
  return out;
}

// ——— History popup ———

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
              {/* y-axis labels */}
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
              {/* line */}
              <polyline
                points={points}
                fill="none"
                stroke="#a78bfa"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {/* dots */}
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

// ——— Row component ———

function MetricRow({
  metric,
  ticker,
  quarters,
  onOpenChart,
}: {
  metric: MetricDef;
  ticker: string;
  quarters: CvmQuarter[];
  onOpenChart: (key: MetricKey, label: string) => void;
}) {
  const value = latestValue(quarters, metric.key);
  const display = formatValue(metric, value);
  const useGrowthTone = metric.format === "growth";

  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center h-[34px] px-3 border-b border-hairline last:border-b-0">
      <span className="text-[12px] text-muted truncate pr-2">{metric.label}</span>
      <span
        className={cn(
          "num text-[12.5px] font-semibold text-right whitespace-nowrap tabular-nums",
          value == null && "text-faint",
          useGrowthTone && value != null && toneGrowth(value),
        )}
      >
        {display}
      </span>
      <button
        type="button"
        onClick={() => onOpenChart(metric.key, metric.label)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2 rounded hover:bg-canvas-soft text-muted hover:text-brand-bright"
        title="Ver histórico"
        aria-label={`Ver histórico de ${metric.label}`}
      >
        <LineChart className="w-3 h-3" />
      </button>
    </div>
  );
}

// ——— Public component ———

/**
 * CVM fundamentals panel — BR-only.
 * Renders a grid of categorized cards (Linear/Ledger style) with annual
 * fundamentals from CVM DFP. Each row has a chart icon that opens a popup
 * with the historical series line chart.
 *
 * Cards displayed: Resultado, Margens, Crescimento, Balanço.
 * No valuation/dividend cards (Tarefa B).
 */
export function CvmFundamentalsPanel({ ticker }: { ticker: string }) {
  const [historyOpen, setHistoryOpen] = useState<{
    metricKey: MetricKey;
    label: string;
  } | null>(null);

  const { data, error, isLoading } = useSWR<CvmHistory>(
    `/api/fundamentals/history/${ticker}`,
    fetcher,
  );

  if (error) {
    return (
      <div className="py-5 text-[12px] text-faint">
        Erro ao carregar histórico CVM.
      </div>
    );
  }

  if (isLoading || !data) {
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

  // Filter annual periods (DFP ends 12-31) and last 5 years.
  const annual = (data.quarters ?? []).filter((q) => q.endDate.endsWith("-12-31"));
  const annualYears = new Set(annual.map((q) => q.endDate.slice(0, 4)));
  const lastFiveYears = Array.from(annualYears).sort().slice(-5);
  const quarters = annual.filter((q) => lastFiveYears.includes(q.endDate.slice(0, 4)));

  if (!data || !data.populated || quarters.length === 0) {
    return (
      <div className="py-5 text-[12px] text-faint">
        Sem histórico CVM para este ticker (não consta no cadastro IBOV / CVM).
      </div>
    );
  }

  // Build category → metrics map.
  const categoryMap = new Map<string, MetricDef[]>();
  for (const cat of CATEGORIES) categoryMap.set(cat, []);
  for (const m of METRICS) {
    for (const cat of m.categories) {
      categoryMap.get(cat)?.push(m);
    }
  }

  // Most-recent year for the panel header note.
  const lastYear = quarters[quarters.length - 1]?.endDate.slice(0, 4);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => {
          const ms = categoryMap.get(cat) ?? [];
          if (ms.length === 0) return null;
          return (
            <div key={cat} className="border border-hairline-strong">
              <div className="px-3 py-2 bg-canvas-soft border-b border-hairline-strong label-s label-muted-2 uppercase tracking-wider">
                {cat}
              </div>
              <div>
                {ms.map((m) => (
                  <MetricRow
                    key={m.key}
                    metric={m}
                    ticker={ticker}
                    quarters={quarters}
                    onOpenChart={(key, label) => setHistoryOpen({ metricKey: key, label })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 label-s label-muted-2">
        Fonte: CVM DFP (DFP anual) · {quarters.length} períodos · último {lastYear}
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
