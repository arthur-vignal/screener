"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Fundamentals = {
  ticker: string;
  current: {
    marketCap: number | null;
    trailingPE: number | null;
    forwardPE: number | null;
    priceToBook: number | null;
    priceToSales: number | null;
    enterpriseValue: number | null;
    evToRevenue: number | null;
    evToEBITDA: number | null;
    profitMargin: number | null;
    operatingMargin: number | null;
    grossMargin: number | null;
    roe: number | null;
    roa: number | null;
    earningsGrowth: number | null;
    revenueGrowth: number | null;
    dividendRate: number | null;
    dividendYield: number | null;
    payoutRatio: number | null;
    targetMeanPrice: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
  };
  sparklines: Record<string, { date: string; value: number }[]>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());


/**
 * Popup with full chart + sector average overlay.
 */
function MetricPopup({
  ticker,
  metricKey,
  metricLabel,
  currentValue,
  onClose,
  sector,
}: {
  ticker: string;
  metricKey: string;
  metricLabel: string;
  currentValue: number | null;
  onClose: () => void;
  sector?: string;
}) {
  const { data } = useSWR<Fundamentals>(
    `/api/assets/fundamentals/${ticker}`,
    fetcher,
  );
  const { data: sectorData } = useSWR(
    sector ? `/api/sector/averages?sector=${encodeURIComponent(sector)}` : null,
    fetcher,
  );

  const [showAvg, setShowAvg] = useState(true);

  const series = data?.sparklines?.[metricKey] ?? [];
  const sectorAvg = sectorData?.metrics?.[metricKey as keyof typeof sectorData.metrics]?.mean;

  // Normalize series for chart
  const max = Math.max(...series.map((p) => p.value), 1);
  const min = Math.min(...series.map((p) => p.value), 0);
  const range = max - min || 1;
  const w = 600;
  const h = 200;
  const points = series
    .map(
      (p, i) =>
        `${(i / Math.max(1, series.length - 1)) * w},${h - ((p.value - min) / range) * h}`,
    )
    .join(" ");

  const sectorLineY = sectorAvg != null && isFinite(sectorAvg)
    ? h - ((sectorAvg - min) / range) * h
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-lg p-6 max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {ticker} — {metricLabel}
            </h2>
            <p className="text-sm text-text-muted">
              {currentValue != null ? `Atual: ${currentValue.toFixed(2)}` : "Sem dado"}
              {sectorAvg != null && (
                <> · Média setor ({sector}): {sectorAvg.toFixed(2)}</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-elevated"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle sector average */}
        {sectorAvg != null && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowAvg(!showAvg)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 text-xs rounded border transition-colors",
                showAvg
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-text-muted",
              )}
            >
              <div className="w-3 h-px bg-current" />
              Média do setor ({showAvg ? "ON" : "OFF"})
            </button>
          </div>
        )}

        {/* Chart */}
        <div className="relative h-[200px] bg-background/50 rounded">
          {data == null ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </div>
          ) : series.length < 2 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted">
              Sem dados históricos suficientes
            </div>
          ) : (
            <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
              <polyline
                points={points}
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              {showAvg && sectorLineY != null && (
                <line
                  x1="0"
                  y1={sectorLineY}
                  x2={w}
                  y2={sectorLineY}
                  stroke="#f97316"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          )}
        </div>

        {/* Axis labels */}
        {series.length >= 2 && (
          <div className="flex justify-between text-xs text-text-muted mt-2 font-mono">
            <span>{series[0].date}</span>
            <span>{series[series.length - 1].date}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const SECTOR_BY_TICKER: Record<string, string> = {};
import("@/lib/snp500").then((m) => {
  for (const s of m.SP500 ?? []) {
    SECTOR_BY_TICKER[s.symbol] = s.sector;
  }
});

type Row = {
  symbol: string;
  weight: number;
};

const METRIC_DEFS = [
  { key: "price", label: "Preço", fmt: (v: number) => `$${v.toFixed(2)}` },
  {
    key: "trailingPE",
    label: "P/L",
    fmt: (v: number) => v.toFixed(2),
    concept: "pe",
  },
  {
    key: "priceToBook",
    label: "P/VP",
    fmt: (v: number) => v.toFixed(2),
    concept: "pvp",
  },
  {
    key: "evToEBITDA",
    label: "EV/EBITDA",
    fmt: (v: number) => v.toFixed(2),
    concept: "ev_ebitda",
  },
  {
    key: "profitMargin",
    label: "Margem Líq.",
    fmt: (v: number) => `${(v * 100).toFixed(1)}%`,
    concept: "net_margin",
  },
  {
    key: "grossMargin",
    label: "Margem Bruta",
    fmt: (v: number) => `${(v * 100).toFixed(1)}%`,
    concept: "gross_margin",
  },
  { key: "roe", label: "ROE", fmt: (v: number) => `${(v * 100).toFixed(1)}%`, concept: "roe" },
  { key: "roa", label: "ROA", fmt: (v: number) => `${(v * 100).toFixed(1)}%`, concept: "roa" },
  {
    key: "revenueGrowth",
    label: "Rev Growth YoY",
    fmt: (v: number) => `${(v * 100).toFixed(1)}%`,
    concept: "cagr_revenue",
  },
  {
    key: "earningsGrowth",
    label: "Earn Growth YoY",
    fmt: (v: number) => `${(v * 100).toFixed(1)}%`,
    concept: "cagr_earnings",
  },
  {
    key: "dividendYield",
    label: "DY",
    fmt: (v: number) => `${(v * 100).toFixed(1)}%`,
    concept: "dy",
  },
] as const;

export function RichFundamentalsTable({ rows }: { rows: Row[] }) {
  const [popup, setPopup] = useState<{
    ticker: string;
    metricKey: string;
    metricLabel: string;
    currentValue: number | null;
    sector?: string;
  } | null>(null);

  // Fetch fundamentals for all symbols in parallel
  const { data: fundamentalsMap, isLoading } = useSWR<Record<string, Fundamentals>>(
    rows.length > 0 ? `/api/fundamentals/batch?symbols=${rows.map((r) => r.symbol).join(",")}` : null,
    fetcher,
  );

  if (rows.length === 0) {
    return <div className="text-sm text-text-muted py-8 text-center">Sem ativos.</div>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-background/30">
              <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider text-text-muted font-medium">
                Ativo
              </th>
              <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-text-muted font-medium">
                Peso
              </th>
              {METRIC_DEFS.map((m) => (
                <th
                  key={m.key}
                  className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-text-muted font-medium"
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fund = fundamentalsMap?.[row.symbol]?.current;
              return (
                <tr
                  key={row.symbol}
                  className="border-b border-border-subtle/50 hover:bg-surface-elevated/40 transition-colors"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/asset/${row.symbol}`}
                      className="flex items-center gap-2 hover:text-accent"
                    >
                      <span className="font-mono font-semibold">{row.symbol}</span>
                      {fund?.targetMeanPrice && (
                        <span className="text-[10px] text-text-muted">
                          →
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="text-right px-3 py-2 font-mono tabular-nums text-text-secondary">
                    {(row.weight * 100).toFixed(1)}%
                  </td>
                  {METRIC_DEFS.map((m) => {
                    const value = fund?.[m.key as keyof typeof fund] as number | null;
                    const isGood = value != null && isPositiveMetric(m.key, value);
                    return (
                      <td
                        key={m.key}
                        className="text-right px-3 py-2 font-mono tabular-nums text-xs cursor-pointer hover:bg-surface-elevated"
                        onClick={() =>
                          setPopup({
                            ticker: row.symbol,
                            metricKey: m.key,
                            metricLabel: m.label,
                            currentValue: value,
                            sector: SECTOR_BY_TICKER[row.symbol],
                          })
                        }
                        title="Clique para ver histórico"
                      >
                        {isLoading ? (
                          <span className="text-text-muted">…</span>
                        ) : value != null ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              isGood === true && "text-positive",
                              isGood === false && "text-negative",
                            )}
                          >
                            {m.fmt(value)}
                            {isGood === true && <ArrowUpRight className="w-3 h-3" />}
                            {isGood === false && <ArrowDownRight className="w-3 h-3" />}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {popup && (
        <MetricPopup
          ticker={popup.ticker}
          metricKey={popup.metricKey}
          metricLabel={popup.metricLabel}
          currentValue={popup.currentValue}
          sector={popup.sector}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  );
}

/**
 * Heuristic: is this metric value "good" for the company?
 * Returns true (good) / false (bad) / null (neutral)
 */
function isPositiveMetric(key: string, value: number): boolean | null {
  // Higher is better
  const HIGHER_IS_BETTER: Record<string, [number, number]> = {
    roe: [0.10, 0.20],
    roa: [0.05, 0.15],
    profitMargin: [0.05, 0.20],
    grossMargin: [0.30, 0.60],
    revenueGrowth: [0.05, 0.15],
    earningsGrowth: [0.05, 0.15],
    dividendYield: [0.02, 0.06],
  };
  // Lower is better
  const LOWER_IS_BETTER: Record<string, [number, number]> = {
    trailingPE: [10, 25],
    priceToBook: [1, 3],
    evToEBITDA: [8, 18],
  };

  if (key in HIGHER_IS_BETTER) {
    const [min, max] = HIGHER_IS_BETTER[key];
    if (value >= max) return true;
    if (value < min) return false;
    return null;
  }
  if (key in LOWER_IS_BETTER) {
    const [min, max] = LOWER_IS_BETTER[key];
    if (value <= min) return true;
    if (value > max) return false;
    return null;
  }
  return null;
}