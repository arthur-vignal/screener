"use client";

import { ArrowLeft, Loader2, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { RichFundamentalsTable } from "@/components/rich-fundamentals-table";
import useSWR from "swr";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { getSeedIndex } from "@/lib/seed-data";
import { NewsForTickers } from "@/components/news-for-tickers";
import { B3_INDICES, getB3IndexByCode } from "@/lib/b3-indices";

type Constituent = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  rank: number;
};

type IndexDetail = {
  id: number;
  slug: string;
  name: string;
  description: string;
  universe: string;
  topN: number;
  isPublic: boolean;
  createdAt: number;
  owner: string | null;
};

type Performance = {
  startValue: number;
  endValue: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  daysHeld: number;
  history: { date: string; value: number }[];
};

type CurrentQuote = {
  symbol: string;
  weight: number;
  price: number | null;
  changePercent: number | null;
  value: number | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function IndexDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const seed = getSeedIndex(id);
  const isSeed = !!seed;
  // B3 official index lookup (slug like "ibov", "ibrx-100", "smll", "idiv")
  const b3Index = !isSeed ? getB3IndexByCode(id.toUpperCase()) : undefined;
  const isB3 = !!b3Index;

  const { data: index, error: indexError } = useSWR<IndexDetail | { error: string }>(
    isSeed ? null : `/api/indices/${id}`,
    fetcher,
  );

  const perfUrl = isSeed
    ? `/api/seed/index/${id}/performance`
    : index && "id" in index
      ? `/api/indices/${index.slug}/performance`
      : null;

  const { data: perfData } = useSWR<{
    performance: Performance;
    constituents?: Constituent[];
    currentQuotes?: CurrentQuote[];
  }>(perfUrl, fetcher);

  if (indexError && "error" in indexError && indexError.error === "private") {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <Link
          href="/indices"
          className="inline-flex items-center gap-1 label label-muted-2 hover:text-ink mb-4 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>
        <div className="border-t border-hairline-strong py-10 text-center animate-fade-up">
          <Lock className="w-8 h-8 text-muted mx-auto mb-3" />
          <h1 className="font-display text-xl text-ink mb-1">Private index</h1>
          <p className="text-sm text-muted">Log in to view private indices.</p>
        </div>
      </div>
    );
  }

  const name = (index && "name" in index ? index.name : seed?.name) ?? id;
  const description =
    (index && "description" in index ? index.description : seed?.description) ?? "";
  const methodology =
    (index && "description" in index ? index.description : seed?.methodology) ?? "";
  const owner = (index && "owner" in index ? index.owner : seed?.author) ?? null;
  const isPublic = isSeed || (index && "isPublic" in index ? index.isPublic : true);
  const createdAt =
    (index && "createdAt" in index ? index.createdAt : seed?.createdAt) ?? 0;
  const universe =
      index && "universe" in index
        ? index.universe
        : seed
          ? "S&P 500"
          : "—";
    const topN =
      index && "topN" in index
        ? index.topN
        : seed
          ? 50
          : 0;

  const constituents =
    perfData?.constituents ??
    (seed?.constituents.map((s, i) => ({
      symbol: s,
      name: s,
      sector: "—",
      price: 0,
      changePercent: 0,
      rank: i + 1,
    })) ?? []);

  const currentQuotes = perfData?.currentQuotes ?? [];
  const performance = perfData?.performance;
  const isLoading = !isSeed && !index && !indexError;

  return (
    <div className="max-w-[1920px] mx-auto bg-canvas text-ink">
      {/* ============= BREADCRUMB BAR (42px) ============= */}
      <div className="h-[42px] bg-canvas-soft border-b border-hairline-strong px-8 flex items-center justify-between">
        <div className="label flex items-center gap-2">
          <Link href="/indices" className="text-brand-deep link-underline">
            Indices
          </Link>
          <span className="text-faint">›</span>
          <Link href="/indices" className="text-brand-deep link-underline">
            {seed ? "Platform" : "Mine"}
          </Link>
          <span className="text-faint">›</span>
          <span className="text-ink">{name}</span>
        </div>
        <div className="label label-muted-2">
          Universe: {universe} · Top {topN}
        </div>
      </div>

      {/* ============= HERO ============= */}
      <div className="px-8 pt-[30px] pb-[26px] border-b border-hairline-strong">
        <Link
          href="/indices"
          className="inline-flex items-center gap-1.5 label label-muted-2 hover:text-ink mb-3 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>

        <div className="flex items-end gap-6">
          <div className="pb-1">
            <h1 className="font-display text-[30px] text-ink tracking-[-0.03em] leading-none mb-2">
              {name}
            </h1>
            <div className="label label-muted-2 flex items-center gap-2">
              {owner && <span>@{owner}</span>}
              {seed && (
                <span className="border border-hairline-strong px-1.5 py-0.5 text-brand-deep">
                  Platform
                </span>
              )}
              {!isPublic && (
                <span className="border border-hairline-strong px-1.5 py-0.5 text-faint">
                  Private
                </span>
              )}
              {createdAt > 0 && (
                <span>· created {new Date(createdAt * 1000).toLocaleDateString("en-US")}</span>
              )}
              {performance && <span>· {performance.daysHeld}d held</span>}
            </div>
          </div>

          {performance && (
            <div className="border-l border-hairline-strong pl-[34px] pb-1">
              <div className="flex items-baseline gap-4">
                <span
                  className={cn(
                    "num num-xxl leading-none",
                    performance.totalReturn >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {performance.totalReturn >= 0 ? "+" : "−"}
                  {Math.abs(performance.totalReturn * 100).toFixed(2)}
                  <span className="text-[20px] ml-1">%</span>
                </span>
                <span className="num text-[17px] text-muted">
                  annualized{" "}
                  {performance.annualizedReturn >= 0 ? "+" : "−"}
                  {Math.abs(performance.annualizedReturn * 100).toFixed(2)}%
                </span>
              </div>
              <div className="label label-muted-2 mt-2">
                {constituents.length} constituents · rebalance monthly
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn-ghost">
              ★ Watchlist
            </button>
            <button type="button" className="btn-primary">
              <Plus className="w-3 h-3" />
              Clone index
            </button>
          </div>
        </div>

        {description && (
          <p className="text-[15.5px] text-body leading-relaxed mt-5 max-w-[68ch] text-pretty">
            {description}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading index…
        </div>
      )}

      {!isLoading && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 340px" }}>
          {/* LEFT */}
          <div className="border-r border-hairline-strong">
            {/* Performance block */}
            {performance && performance.history.length > 1 && (
              <div className="px-8 py-6 border-b border-hairline-strong">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-[18px] text-ink tracking-[-0.03em]">
                    Performance
                  </h2>
                  <span className="label-s label-muted-2">
                    ${performance.startValue.toLocaleString("en-US")} → $
                    {performance.endValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-5">
                  <MetricCell label="Total" value={performance.totalReturn} />
                  <MetricCell label="Annualized" value={performance.annualizedReturn} />
                  <MetricCell label="Max DD" value={-performance.maxDrawdown} />
                </div>

                <div className="h-64 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={performance.history}>
                      <defs>
                        <linearGradient id="idxGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--hairline-strong)"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 10,
                          fill: "var(--faint)",
                          fontFamily: "var(--font-mono)",
                        }}
                        minTickGap={50}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 10,
                          fill: "var(--faint)",
                          fontFamily: "var(--font-mono)",
                        }}
                        tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--surface-elevated)",
                          border: "1px solid var(--hairline-strong)",
                          borderRadius: 0,
                          fontSize: 12,
                          fontFamily: "var(--font-mono)",
                        }}
                        formatter={(v) =>
                          `$${Math.round(Number(v)).toLocaleString()}`
                        }
                        labelFormatter={(v) =>
                          new Date(v as string).toLocaleDateString("en-US")
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        fill="url(#idxGrad)"
                        stroke="none"
                        style={{
                          color:
                            performance.totalReturn >= 0
                              ? "var(--positive)"
                              : "var(--negative)",
                        }}
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={
                          performance.totalReturn >= 0
                            ? "var(--positive)"
                            : "var(--negative)"
                        }
                        strokeWidth={1.7}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Methodology */}
            {methodology && (
              <div className="px-8 py-6 border-b border-hairline-strong">
                <h2 className="font-display text-[18px] text-ink tracking-[-0.03em] mb-3">
                  Methodology
                </h2>
                <p className="text-[15.5px] text-body leading-[1.72] max-w-[68ch] text-pretty">
                  {methodology}
                </p>
              </div>
            )}

            {/* B3 index chart — variation in points */}
            {isB3 && b3Index && (
              <div className="px-8 py-6 border-b border-hairline-strong">
                <IndexPointChart b3Index={b3Index} />
              </div>
            )}

            {/* Constituents */}
            <div className="px-8 py-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-display text-[18px] text-ink tracking-[-0.03em]">
                  Constituents{" "}
                  <span className="label-s label-muted-2 ml-2">{constituents.length}</span>
                </h2>
                {currentQuotes.length > 0 && (
                  <span className="label-s label-muted-2">Live prices</span>
                )}
              </div>
              {isB3 && b3Index ? (
                <B3ConstituentsTable b3Index={b3Index} />
              ) : currentQuotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="label-s label-muted-2 border-b border-hairline-strong h-8">
                        <th className="text-left py-2 font-medium w-12">#</th>
                        <th className="text-left py-2 font-medium">Ticker</th>
                        <th className="text-left py-2 font-medium">Sector</th>
                        <th className="text-right py-2 font-medium">Price</th>
                        <th className="text-right py-2 font-medium">24h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuotes.map((q, i) => (
                        <tr
                          key={q.symbol}
                          className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <td className="py-2.5 num text-faint text-[10.5px]">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="py-2.5">
                            <Link
                              href={`/asset/${encodeURIComponent(q.symbol)}`}
                              className="num text-[12.5px] text-ink hover:text-brand-deep transition-colors duration-150"
                            >
                              {q.symbol}
                            </Link>
                          </td>
                          <td className="py-2.5 text-[11.5px] text-muted">
                            {/* sector not in quote payload; derive from constituent if available */}
                            {constituents.find((c) => c.symbol === q.symbol)?.sector ?? "—"}
                          </td>
                          <td className="text-right py-2.5 num text-[12.5px] text-ink">
                            {q.price != null ? `$${q.price.toFixed(2)}` : "—"}
                          </td>
                          <td
                            className={cn(
                              "text-right py-2.5 num text-[12.5px] font-medium",
                              q.changePercent == null
                                ? "text-muted"
                                : q.changePercent >= 0
                                  ? "text-positive"
                                  : "text-negative",
                            )}
                          >
                            {q.changePercent != null
                              ? `${q.changePercent >= 0 ? "+" : "−"}${Math.abs(q.changePercent).toFixed(2)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <RichFundamentalsTable
                  rows={constituents.map((c) => ({
                    symbol: c.symbol,
                    weight: 1 / constituents.length,
                  }))}
                />
              )}
            </div>
          </div>

          {/* RIGHT — 340px rail */}
          <aside className="px-6 py-6 space-y-6">
            {/* Quick stats */}
            <section>
              <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em]">
                Index at a glance
              </h3>
              <div className="border-t border-hairline-strong">
                <RailRow label="Universe" value={universe} />
                <RailRow label="Top N" value={String(topN)} />
                <RailRow label="Rebalance" value="Monthly" />
                <RailRow
                  label="Constituents"
                  value={String(constituents.length)}
                />
                {performance && (
                  <>
                    <RailRow
                      label="Days held"
                      value={String(performance.daysHeld)}
                    />
                    <RailRow
                      label="Annualized"
                      value={`${performance.annualizedReturn >= 0 ? "+" : "−"}${Math.abs(performance.annualizedReturn * 100).toFixed(2)}%`}
                    />
                  </>
                )}
              </div>
            </section>

            {/* Top / bottom constituents */}
            {currentQuotes.length > 0 && (
              <section>
                <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em]">
                  Movers today
                </h3>
                <div className="border-t border-hairline-strong">
                  {[...currentQuotes]
                    .filter((q) => q.changePercent != null)
                    .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!))
                    .slice(0, 4)
                    .map((q) => (
                      <Link
                        key={q.symbol}
                        href={`/asset/${encodeURIComponent(q.symbol)}`}
                        className="flex items-center justify-between h-[42px] px-3 border-b border-hairline hover-row press"
                      >
                        <span className="num text-[12px] text-ink">{q.symbol}</span>
                        <span
                          className={cn(
                            "num text-[12px] font-medium",
                            q.changePercent! >= 0 ? "text-positive" : "text-negative",
                          )}
                        >
                          {q.changePercent! >= 0 ? "+" : "−"}
                          {Math.abs(q.changePercent!).toFixed(2)}%
                        </span>
                      </Link>
                    ))}
                </div>
              </section>
            )}

            {/* News — aggregated across all constituents */}
            <NewsForTickers
              tickers={constituents.map((c) => c.symbol)}
              title="News"
              showAllHref="/news"
              limit={8}
            />
                                    </aside>
        </div>
      )}
    </div>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between h-8 px-3 border-b border-hairline">
      <span className="label-s label-muted-2">{label}</span>
      <span className="num text-[12.5px] text-ink">{value}</span>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="label-s label-muted-2 mb-1.5">{label}</div>
      <div
        className={cn(
          "num text-[20px] font-medium tracking-[-0.02em]",
          value >= 0 ? "text-positive" : "text-negative",
        )}
      >
        <AnimatedNumber value={value * 100} signed decimals={2} suffix="%" />
      </div>
    </div>
  );
}

/**
 * B3ConstituentsTable — renders the B3 official index composition with each
 * holding's allocation weight + live quote (price, 24h change).
 */
function B3ConstituentsTable({ b3Index }: { b3Index: any }) {
  const [quotes, setQuotes] = useState<Record<string, { price: number; changePercent: number }>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const symbols = b3Index.holdings.map((h: any) => h.symbol).join(",");
    fetch(`/api/assets/quote?symbols=${encodeURIComponent(symbols)}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, { price: number; changePercent: number }> = {};
        for (const row of d.rows ?? []) {
          if (row.quote) {
            map[row.symbol] = {
              price: row.quote.price,
              changePercent: row.quote.changePercent,
            };
          }
        }
        setQuotes(map);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [b3Index]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="label-s label-muted-2 border-b border-hairline-strong h-8">
            <th className="text-left py-2 font-medium w-12">#</th>
            <th className="text-left py-2 font-medium">Ticker</th>
            <th className="text-right py-2 font-medium w-24">Alocação</th>
            <th className="text-right py-2 font-medium w-24">Preço</th>
            <th className="text-right py-2 font-medium w-20">24h</th>
            <th className="text-right py-2 font-medium w-20">Aloc. × Var</th>
          </tr>
        </thead>
        <tbody>
          {b3Index.holdings.map((h: any, i: number) => {
            const q = quotes[h.symbol];
            const allocVar = q ? (h.weight / 100) * q.changePercent : null;
            return (
              <tr
                key={h.symbol}
                className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <td className="py-2.5 num text-faint text-[10.5px]">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="py-2.5">
                  <Link
                    href={`/asset/${encodeURIComponent(h.symbol)}`}
                    className="num text-[12.5px] text-ink hover:text-brand-deep transition-colors duration-150"
                  >
                    {h.symbol}
                  </Link>
                </td>
                <td className="py-2.5 num text-[12.5px] text-ink text-right font-medium">
                  {h.weight.toFixed(2)}%
                </td>
                <td className="py-2.5 num text-[12.5px] text-ink text-right">
                  {!loaded ? "—" : q ? `R$${q.price.toFixed(2)}` : "—"}
                </td>
                <td
                  className={cn(
                    "py-2.5 num text-[12px] text-right font-medium",
                    !q
                      ? "text-faint"
                      : q.changePercent >= 0
                        ? "text-positive"
                        : "text-negative",
                  )}
                >
                  {!q
                    ? "—"
                    : `${q.changePercent >= 0 ? "+" : "−"}${Math.abs(q.changePercent).toFixed(2)}%`}
                </td>
                <td
                  className={cn(
                    "py-2.5 num text-[12px] text-right font-medium",
                    allocVar == null
                      ? "text-faint"
                      : allocVar >= 0
                        ? "text-positive"
                        : "text-negative",
                  )}
                  title="Contribuição ponderada: weight × 24h change"
                >
                  {allocVar == null
                    ? "—"
                    : `${allocVar >= 0 ? "+" : "−"}${Math.abs(allocVar).toFixed(3)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-hairline-strong h-9">
            <td colSpan={2} className="py-2 text-[11px] text-muted font-medium uppercase tracking-wider">
              Total
            </td>
            <td className="py-2 num text-[12.5px] text-ink text-right font-semibold">
              {b3Index.holdings.reduce((s: number, h: any) => s + h.weight, 0).toFixed(2)}%
            </td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * IndexPointChart — line chart of an index's value over time, with X/Y
 * axes and gridlines (recharts).
 *
 * Data source: /api/indices/[id]/chart (Brapi ETF as index proxy).
 */
function IndexPointChart({ b3Index }: { b3Index: any }) {
  const [range, setRange] = useState<string>("6M");
  const [points, setPoints] = useState<Array<{ date: string; close: number }> | null>(null);
  const [summary, setSummary] = useState<{ first: number; last: number; change: number; changePercent: number } | null>(null);

  useEffect(() => {
    setPoints(null);
    fetch(`/api/indices/${b3Index.code.toLowerCase()}/chart?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setPoints(d.points ?? []);
        setSummary(d.summary ?? null);
      })
      .catch(() => setPoints([]));
  }, [b3Index.code, range]);

  const positive = (summary?.change ?? 0) >= 0;
  const color = positive ? "var(--positive)" : "var(--negative)";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-[18px] text-ink tracking-[-0.03em]">
          Variação em pontos
        </h2>
        <div className="flex gap-1.5">
          {["1M", "3M", "6M", "1Y", "5Y"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "label-s px-2 py-0.5 border press " +
                (range === r
                  ? "border-ink text-ink bg-surface-elevated"
                  : "border-hairline-strong text-muted hover:text-ink")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="flex items-baseline gap-4 mb-3">
          <div className="num num-lg text-ink">
            {summary.last.toLocaleString("pt-BR")}
          </div>
          <div
            className={
              "num text-[13px] font-medium " +
              (positive ? "text-positive" : "text-negative")
            }
          >
            {positive ? "+" : "−"}
            {Math.abs(summary.change).toLocaleString("pt-BR")} pts
            <span className="ml-2 text-faint">
              ({positive ? "+" : "−"}
              {Math.abs(summary.changePercent).toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      <div className="h-48 border border-hairline bg-canvas-soft">
        {!points ? (
          <div className="h-full flex items-center justify-center label-s text-muted">
            Carregando…
          </div>
        ) : points.length < 2 ? (
          <div className="h-full flex items-center justify-center label-s text-muted">
            Sem dados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--hairline)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={{ stroke: "var(--hairline-strong)" }}
                tickLine={false}
                tick={{ fontSize: 9, fill: "var(--faint)", fontFamily: "var(--font-mono)" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                minTickGap={32}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "var(--faint)", fontFamily: "var(--font-mono)" }}
                tickFormatter={(v: number) => v.toLocaleString("pt-BR")}
                width={64}
                orientation="right"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--hairline-strong)",
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
                labelStyle={{ color: "var(--muted)" }}
                formatter={(v: any) => Number(v).toLocaleString("pt-BR")}
                labelFormatter={(v: any) =>
                  new Date(v).toLocaleDateString("pt-BR")
                }
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={true}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
