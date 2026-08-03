"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Info,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  Sparkles,
  DollarSign,
  Brain,
  LineChart,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConcept } from "@/lib/concepts";
import type { Concept, ConceptCategory } from "@/lib/concepts";

export function ConceptTooltip({
  concept,
  children,
}: {
  concept: Concept;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1 group">
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="text-text-muted hover:text-accent transition-colors"
        aria-label={`Info sobre ${concept.label}`}
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 bottom-full mb-1 w-72 bg-surface border border-border rounded-md shadow-lg p-3 text-xs">
          <div className="font-medium text-foreground mb-1">{concept.label}</div>
          <div className="text-text-secondary mb-2 leading-relaxed">
            {concept.short}
          </div>
          {concept.formula && (
            <div className="font-mono text-[10px] text-text-muted mb-2 bg-background/50 rounded px-2 py-1">
              {concept.formula}
            </div>
          )}
          <div className="space-y-1">
            {concept.interpretation.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span
                  className={cn(
                    "shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full",
                    b.tone === "good" && "bg-positive",
                    b.tone === "bad" && "bg-negative",
                    b.tone === "neutral" && "bg-text-muted",
                  )}
                />
                <span className="text-text-secondary">
                  <span className="font-mono text-foreground">{b.range}:</span>{" "}
                  {b.meaning}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

const CATEGORY_META: Record<
  ConceptCategory,
  { label: string; icon: typeof TrendingUp; color: string; border: string }
> = {
  valuation: {
    label: "Valuation",
    icon: TrendingUp,
    color: "text-blue-400",
    border: "border-l-blue-500/40",
  },
  operating: {
    label: "Eficiência",
    icon: BarChart3,
    color: "text-purple-400",
    border: "border-l-purple-500/40",
  },
  risk: {
    label: "Risco",
    icon: Shield,
    color: "text-red-400",
    border: "border-l-red-500/40",
  },
  growth: {
    label: "Crescimento",
    icon: Activity,
    color: "text-green-400",
    border: "border-l-green-500/40",
  },
  quality: {
    label: "Qualidade",
    icon: Brain,
    color: "text-yellow-400",
    border: "border-l-yellow-500/40",
  },
  dividends: {
    label: "Dividendos",
    icon: DollarSign,
    color: "text-cyan-400",
    border: "border-l-cyan-500/40",
  },
  trading: {
    label: "Trading",
    icon: Sparkles,
    color: "text-pink-400",
    border: "border-l-pink-500/40",
  },
};

const KNOWN_CONCEPTS: Record<string, string> = {
  pe: "pe",
  pvp: "pvp",
  evEbitda: "ev_ebitda",
  evEbit: "ev_ebit",
  psr: "psr",
  peg: "peg",
  roe: "roe",
  roic: "roic",
  roa: "roa",
  grossMargin: "gross_margin",
  ebitdaMargin: "ebitda_margin",
  operatingMargin: "operating_margin",
  netMargin: "net_margin",
  debtEbitda: "debt_ebitda",
  debtEquity: "debt_equity",
  currentRatio: "current_ratio",
  beta: "beta",
  cagrRevenue: "cagr_revenue",
  cagrEarnings: "cagr_earnings",
  dividendYield: "dy",
  payout: "payout",
  piotroskiF: "piotroski",
  altmanZ: "altman",
};

export type MetricValue = {
  key: string;
  label: string;
  value: number | null;
  suffix?: string;
  prefix?: string;
};

type HistoryPoint = { date: string; value: number };

/**
 * Popup com chart histórico + toggle media setorial.
 */
function MetricHistoryPopup({
  ticker,
  metricKey,
  metricLabel,
  value,
  onClose,
}: {
  ticker: string;
  metricKey: string;
  metricLabel: string;
  value: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useSWR<{
    ticker: string;
    current: Record<string, number | null>;
    sparklines: Record<string, HistoryPoint[]>;
  }>(`/api/assets/fundamentals/${ticker}`, (url: string) =>
    fetch(url).then((r) => r.json()),
  );

  const series = data?.sparklines?.[metricKey] ?? [];

  // Build chart
  const w = 600;
  const h = 220;
  const vals = series.map((p) => p.value).filter((v) => isFinite(v));
  const min = vals.length > 0 ? Math.min(...vals) : 0;
  const max = vals.length > 0 ? Math.max(...vals) : 1;
  const range = max - min || 1;
  const points = vals
    .map(
      (v, i) =>
        `${(i / Math.max(1, vals.length - 1)) * w},${h - ((v - min) / range) * h}`,
    )
    .join(" ");

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
              {value != null
                ? `Atual: ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                : "Sem dado"}
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

        <div className="relative h-[220px] bg-background/50 rounded border border-border-subtle">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </div>
          ) : vals.length < 2 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted">
              Sem dados históricos suficientes
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${w} ${h}`}
              preserveAspectRatio="none"
            >
              <polyline
                points={points}
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
        </div>

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

function MetricRow({
  metric,
  ticker,
  onOpenChart,
}: {
  metric: MetricValue;
  ticker?: string;
  onOpenChart: (key: string, label: string, value: number | null) => void;
}) {
  const conceptKey = KNOWN_CONCEPTS[metric.key];
  const concept = conceptKey ? getConcept(conceptKey) : null;

  const display =
    metric.value != null
      ? `${metric.prefix ?? ""}${metric.value.toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}${metric.suffix ?? ""}`
      : "—";

  return (
    <div className="group flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-surface-elevated/60 transition-colors">
      {/* Label + info tooltip */}
      {concept ? (
        <ConceptTooltip concept={concept}>
          <span className="text-xs text-text-secondary flex-1 truncate">
            {metric.label}
          </span>
        </ConceptTooltip>
      ) : (
        <span className="text-xs text-text-secondary flex-1 truncate">
          {metric.label}
        </span>
      )}

      {/* Value */}
      <span
        className={cn(
          "font-mono text-xs tabular-nums min-w-[60px] text-right",
          metric.value == null && "text-text-muted",
        )}
      >
        {display}
      </span>

      {/* Chart button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChart(metric.key, metric.label, metric.value);
        }}
        disabled={!ticker}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background text-text-muted hover:text-accent disabled:opacity-0"
        title="Ver histórico"
        aria-label={`Ver histórico de ${metric.label}`}
      >
        <LineChart className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * Vertical compact panel grouped by category — styled like investidor10.
 * Each metric has a chart button that opens historical popup.
 */
export function FundamentalsPanel({
  metrics,
  ticker,
}: {
  metrics: MetricValue[];
  ticker?: string;
}) {
  const [historyOpen, setHistoryOpen] = useState<{
    metricKey: string;
    label: string;
    value: number | null;
  } | null>(null);

  // Filter out null values
  const valid = metrics.filter((m): m is MetricValue => m.value != null);

  // Group by category
  const grouped: Record<ConceptCategory, MetricValue[]> = {} as Record<
    ConceptCategory,
    MetricValue[]
  >;
  for (const m of valid) {
    const conceptKey = KNOWN_CONCEPTS[m.key];
    const cat = (conceptKey
      ? getConcept(conceptKey)?.category
      : "valuation") as ConceptCategory;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  }

  const present = Object.entries(grouped).filter(([, ms]) => ms.length > 0);

  return (
    <>
      <div className="rounded-lg border border-border bg-surface divide-y divide-border-subtle">
        {present.map(([catKey, ms]) => {
          const cat = CATEGORY_META[catKey as ConceptCategory];
          if (!cat) return null;
          const Icon = cat.icon;
          return (
            <div key={catKey} className={`p-2 border-l-2 ${cat.border}`}>
              <div className="flex items-center gap-1.5 mb-1 px-2">
                <Icon className={cn("w-3.5 h-3.5", cat.color)} />
                <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                  {cat.label}
                </h3>
              </div>
              <div className="space-y-0.5">
                {ms.map((m) => (
                  <MetricRow
                    key={m.key}
                    metric={m}
                    ticker={ticker}
                    onOpenChart={(key, label, value) =>
                      setHistoryOpen({ metricKey: key, label, value })
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {historyOpen && ticker && (
        <MetricHistoryPopup
          ticker={ticker}
          metricKey={historyOpen.metricKey}
          metricLabel={historyOpen.label}
          value={historyOpen.value}
          onClose={() => setHistoryOpen(null)}
        />
      )}
    </>
  );
}