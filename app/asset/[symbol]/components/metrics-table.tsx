"use client";

/**
 * MetricsTable — Notion-style metric explorer.
 *
 * Layout (matches the spec sketched in 2026-08-27):
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ [search input]                          [1y|3y|5y|max] [YoY|PoP]  │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │ ▾  Valuation                                                       │
 *   │    ▶  P/L          4.01    +0.23% vs 1y ago          ↗ green-700   │
 *   │    ▾  P/VP         0.94    −5.6% vs 5y ago           ↘ red-700     │
 *   │       ┌─────────────────────────────────────────────────────────┐  │
 *   │       │  2025  0.94  −2.1%                                       │  │
 *   │       │  2024  0.96  +4.5%                                       │  │
 *   │       │  2023  0.92  −1.8%                                       │  │
 *   │       │  ...                                                     │  │
 *   │       └─────────────────────────────────────────────────────────┘  │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Each row has a chevron at the left. Click it to expand the historical
 * series as a compact table (year | value | Δ% YoY) with motion-animated
 * height + staggered opacity.
 *
 * Colors are low-saturation per spec (green-700/red-700, not the bright
 * green/red Tailwind defaults).
 *
 * Spec: <MetricsTable> goes below the chart+news grid on /asset/[symbol].
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildMetricRows,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PERIOD_LABELS,
  type ComparisonMode,
  type MetricRow,
  type Period,
  withYoYDelta,
} from "@/lib/analytics/metrics-table";

// ─── Format helpers ────────────────────────────────────────────────

function formatValue(row: MetricRow): string {
  if (row.current == null) return "—";
  const d = row.decimals ?? 2;
  switch (row.format) {
    case "currency":
      // large numbers → abbreviate
      if (Math.abs(row.current) >= 1e12)
        return `R$ ${(row.current / 1e12).toFixed(d)}T`;
      if (Math.abs(row.current) >= 1e9)
        return `R$ ${(row.current / 1e9).toFixed(d)}B`;
      if (Math.abs(row.current) >= 1e6)
        return `R$ ${(row.current / 1e6).toFixed(d)}M`;
      if (Math.abs(row.current) >= 1e3)
        return `R$ ${(row.current / 1e3).toFixed(d)}k`;
      return `R$ ${row.current.toFixed(d)}`;
    case "percent":
      return `${row.current.toFixed(d)}%`;
    case "multiple":
      return `${row.current.toFixed(d)}x`;
    case "number":
    default:
      return row.current.toFixed(d);
  }
}

function formatVariation(v: number | null): string {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function formatSeriesValue(row: MetricRow, v: number | null): string {
  if (v == null) return "—";
  // reuse formatValue but on a synthetic row (to avoid duplicating logic)
  const synth: MetricRow = { ...row, current: v };
  return formatValue(synth);
}

// ─── Colors ─────────────────────────────────────────────────────────

const COLORS = {
  upText: "#5c8a6e", // muted green (low sat)
  upBg: "rgba(92, 138, 110, 0.12)",
  downText: "#a85a5a", // muted red
  downBg: "rgba(168, 90, 90, 0.12)",
  neutralText: "var(--muted-foreground, #888)",
  neutralBg: "transparent",
};

function variationClasses(direction: MetricRow["direction"]) {
  if (direction === "up") {
    return { color: COLORS.upText, bg: COLORS.upBg, Icon: TrendingUp };
  }
  if (direction === "down") {
    return { color: COLORS.downText, bg: COLORS.downBg, Icon: TrendingDown };
  }
  return { color: COLORS.neutralText, bg: COLORS.neutralBg, Icon: Minus };
}

// ─── Period + comparison selectors ─────────────────────────────────

function PeriodToggle({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  const periods: Period[] = ["1y", "3y", "5y", "max"];
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full border border-border/60 bg-background/40">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "px-3 h-6 rounded-full text-[10.5px] tracking-wide transition-colors",
            p === period
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function ComparisonToggle({
  mode,
  onChange,
}: {
  mode: ComparisonMode;
  onChange: (m: ComparisonMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full border border-border/60 bg-background/40">
      <button
        onClick={() => onChange("yoy")}
        className={cn(
          "px-3 h-6 rounded-full text-[10.5px] tracking-wide transition-colors",
          mode === "yoy"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        vs YoY
      </button>
      <button
        onClick={() => onChange("period")}
        className={cn(
          "px-3 h-6 rounded-full text-[10.5px] tracking-wide transition-colors",
          mode === "period"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        vs Período
      </button>
    </div>
  );
}

// ─── Search bar ─────────────────────────────────────────────────────

function SearchBar({
  query,
  onChange,
}: {
  query: string;
  onChange: (q: string) => void;
}) {
  return (
    <div className="relative flex items-center flex-1 max-w-[320px]">
      <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
      <input
        type="text"
        placeholder="Buscar métrica…"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full pl-8 pr-3 h-8 rounded-full",
          "bg-foreground/[0.03] border border-border/60",
          "text-[12px] placeholder:text-muted-foreground/40",
          "focus:outline-none focus:border-border focus:bg-foreground/[0.05]",
          "transition-colors",
        )}
      />
    </div>
  );
}

// ─── Expanded series ────────────────────────────────────────────────

function ExpandedSeries({ row }: { row: MetricRow }) {
  const series = withYoYDelta(row.history);

  if (series.length === 0) {
    return (
      <div className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">
        Sem série histórica (snapshot atual).
      </div>
    );
  }

  // Closure captures the parent row so formatSeriesValue knows how to
  // render each value (currency / percent / multiple / raw number).
  const fmtValue = (v: number | null) => formatSeriesValue(row, v);

  return (
    <div className="px-4 py-3">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-muted-foreground/60 uppercase tracking-[0.14em] text-[9.5px]">
            <th className="text-left font-normal pb-1.5 w-[80px]">Ano</th>
            <th className="text-right font-normal pb-1.5">Valor</th>
            <th className="text-right font-normal pb-1.5">Δ YoY</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point, i) => {
            const dir =
              point.deltaPercent == null
                ? "neutral"
                : point.deltaPercent > 0.01
                  ? "up"
                  : point.deltaPercent < -0.01
                    ? "down"
                    : "neutral";
            const c = variationClasses(dir);
            return (
              <motion.tr
                key={point.endDate}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: i * 0.012 }}
                className="border-t border-border/40"
              >
                <td className="py-1 text-muted-foreground tabular-nums">
                  {point.endDate.slice(0, 4)}
                </td>
                <td className="py-1 text-right tabular-nums font-medium">
                  {fmtValue(point.value)}
                </td>
                <td
                  className="py-1 text-right tabular-nums font-medium"
                  style={{ color: c.color }}
                >
                  {point.deltaPercent != null
                    ? `${point.deltaPercent >= 0 ? "+" : ""}${point.deltaPercent.toFixed(2)}%`
                    : "—"}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────

function MetricRowView({
  row,
  expanded,
  onToggle,
}: {
  row: MetricRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { color, bg, Icon } = variationClasses(row.direction);
  const showVariation = row.variationPercent != null;

  return (
    <motion.div
      layout
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="border-t border-border/30"
    >
      <button
        onClick={onToggle}
        className={cn(
          "w-full grid grid-cols-[24px_1fr_120px_120px] items-center gap-3 px-3 py-2.5",
          "text-left hover:bg-foreground/[0.025] transition-colors",
          "group",
        )}
      >
        {/* Chevron */}
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-muted-foreground/60 group-hover:text-muted-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </motion.div>

        {/* Label */}
        <div className="min-w-0">
          <span className="text-[12.5px] font-medium text-foreground/90 tracking-tight">
            {row.label}
          </span>
          <span className="ml-2 text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em]">
            {row.unit}
          </span>
        </div>

        {/* Current value */}
        <div className="text-right tabular-nums font-medium text-[12.5px]">
          {formatValue(row)}
        </div>

        {/* Variation */}
        <div className="flex justify-end">
          {showVariation ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium tabular-nums"
              style={{ color, background: bg }}
            >
              <Icon className="h-2.5 w-2.5" />
              {formatVariation(row.variationPercent)}
            </span>
          ) : (
            <span className="text-[10.5px] text-muted-foreground/40">—</span>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden bg-foreground/[0.015]"
          >
            <ExpandedSeries row={row} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────

// Re-export the source-of-truth MetricsBundleInput as MetricsBundle so
// consumers don't have to reach into lib/analytics.
import { type MetricsBundleInput } from "@/lib/analytics/metrics-table";
export type MetricsBundle = MetricsBundleInput;


export function MetricsTable({ bundle }: { bundle: MetricsBundleInput }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("1y");
  const [comparison, setComparison] = useState<ComparisonMode>("yoy");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allRows = useMemo(
    () => buildMetricRows(bundle, period, comparison),
    [bundle, period, comparison],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
    );
  }, [allRows, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, MetricRow[]> = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    for (const r of filtered) groups[r.category]?.push(r);
    return groups;
  }, [filtered]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="mt-8">
      <header className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60">
          Métricas
        </h2>
        <div className="flex items-center gap-2">
          <SearchBar query={search} onChange={setSearch} />
          <ComparisonToggle mode={comparison} onChange={setComparison} />
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </header>

      <div className="rounded-2xl border border-border/40 overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[24px_1fr_120px_120px] items-center gap-3 px-3 py-2 bg-foreground/[0.02] border-b border-border/40">
          <div />
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60 font-normal">
            Métrica
          </div>
          <div className="text-right text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60 font-normal">
            Atual
          </div>
          <div className="text-right text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60 font-normal">
            {comparison === "yoy" ? "vs YoY" : `vs ${PERIOD_LABELS[period]}`}
          </div>
        </div>

        {CATEGORY_ORDER.map((cat) => {
          const rows = grouped[cat];
          if (!rows || rows.length === 0) return null;
          return (
            <div key={cat}>
              <div className="px-3 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 font-medium">
                {CATEGORY_LABELS[cat]}
              </div>
              {rows.map((r) => (
                <MetricRowView
                  key={r.key}
                  row={r}
                  expanded={expanded.has(r.key)}
                  onToggle={() => toggle(r.key)}
                />
              ))}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground/60">
            Nenhuma métrica encontrada pra "{search}".
          </div>
        )}
      </div>
    </section>
  );
}
