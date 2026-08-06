"use client";

import { ArrowLeft, Loader2, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PortfolioHoldingsTable } from "@/components/portfolio-holdings-table";
import useSWR from "swr";
import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { getSeedPortfolio } from "@/lib/seed-data";

type Holding = { symbol: string; weight: number };

type PortfolioDetail = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initialValue: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  owner: string | null;
  ownerId: number | null;
  holdings: Holding[];
};

type Performance = {
  startValue: number;
  endValue: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  bestDay: number;
  worstDay: number;
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

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const seed = getSeedPortfolio(id);
  const isSeed = !!seed;

  const { data: portfolio, error: portfolioError } = useSWR<PortfolioDetail | { error: string }>(
    isSeed ? null : `/api/portfolios/${id}`,
    fetcher,
  );

  const perfUrl = isSeed
    ? `/api/seed/portfolio/${id}/performance`
    : portfolio && "id" in portfolio
      ? `/api/portfolios/${portfolio.slug}/performance`
      : null;

  const { data: perfData } = useSWR<{
    performance: Performance;
    currentQuotes: CurrentQuote[];
  }>(perfUrl, fetcher);

  const { data: memoData } = useSWR<{
    spec: {
      category: "growth" | "value" | "income" | "momentum" | "quality" | "blend" | "thematic";
      riskLevel: "conservative" | "moderate" | "aggressive";
      thesis: string;
      criteria: string[];
      risks?: string[];
      expectedBehavior?: string;
    };
    sectorExposure: Record<string, number>;
    perHoldingRationale: Record<string, { sector: string; rationale: string }>;
  }>(
    portfolio && "id" in portfolio
      ? `/api/portfolios/${portfolio.slug}/memo`
      : null,
    fetcher,
  );

  if (portfolioError && "error" in portfolioError && portfolioError.error === "private") {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <Link
          href="/portfolios"
          className="inline-flex items-center gap-1 label label-muted-2 hover:text-ink mb-4 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>
        <div className="border-t border-hairline-strong py-10 text-center animate-fade-up">
          <Lock className="w-8 h-8 text-muted mx-auto mb-3" />
          <h1 className="font-display text-xl text-ink mb-1">Private portfolio</h1>
          <p className="text-sm text-muted">Log in to view private portfolios.</p>
        </div>
      </div>
    );
  }

  const name = (portfolio && "name" in portfolio ? portfolio.name : seed?.name) ?? id;
  const description =
    (portfolio && "description" in portfolio ? portfolio.description : seed?.description) ?? "";
  const constituents =
    (portfolio && "holdings" in portfolio
      ? portfolio.holdings
      : seed?.constituents) ?? [];
  const createdAt =
    (portfolio && "createdAt" in portfolio ? portfolio.createdAt : seed?.createdAt) ?? 0;
  const owner = (portfolio && "owner" in portfolio ? portfolio.owner : seed?.author) ?? null;
  const isPublic = isSeed || (portfolio && "isPublic" in portfolio ? portfolio.isPublic : true);
  const initialValue = isSeed
    ? seed!.initialValue
    : portfolio && "initialValue" in portfolio
      ? portfolio.initialValue
      : 10000;

  const performance = perfData?.performance;
  const currentQuotes = perfData?.currentQuotes ?? [];
  const historyData = performance?.history ?? [];
  const totalReturn = performance?.totalReturn;
  const annualizedReturn = performance?.annualizedReturn;
  const maxDrawdown = performance?.maxDrawdown;
  const daysHeld = performance?.daysHeld ?? 0;
  const endValue = performance?.endValue;
  const bestDay = performance?.bestDay;

  const isLoading = !isSeed && !portfolio && !portfolioError;

  return (
    <div className="max-w-[1920px] mx-auto bg-canvas text-ink">
      {/* ============= BREADCRUMB BAR (42px) ============= */}
      <div className="h-[42px] bg-canvas-soft border-b border-hairline-strong px-8 flex items-center justify-between">
        <div className="label flex items-center gap-2">
          <Link href="/portfolios" className="text-brand-deep link-underline">
            Portfolios
          </Link>
          <span className="text-faint">›</span>
          <Link href="/portfolios/sulfur" className="text-brand-deep link-underline">
            {seed ? "Sulfur" : "Mine"}
          </Link>
          <span className="text-faint">›</span>
          <span className="text-ink">{name}</span>
        </div>
        <div className="label label-muted-2">
          {performance ? `${daysHeld} days held` : "—"}
        </div>
      </div>

      {/* ============= HERO (padding 30/32/26) ============= */}
      <div className="px-8 pt-[30px] pb-[26px] border-b border-hairline-strong">
        <Link
          href="/portfolios"
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
              {daysHeld > 0 && <span>· {daysHeld}d</span>}
            </div>
          </div>

          {performance && (
            <div className="border-l border-hairline-strong pl-[34px] pb-1">
              <div className="flex items-baseline gap-4">
                <span
                  className={cn(
                    "num num-xxl leading-none",
                    totalReturn! >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {totalReturn! >= 0 ? "+" : "−"}
                  {Math.abs(totalReturn! * 100).toFixed(2)}
                  <span className="text-[20px] ml-1">%</span>
                </span>
                <span className="num text-[17px] text-muted">
                  annualized{" "}
                  {annualizedReturn! >= 0 ? "+" : "−"}
                  {Math.abs(annualizedReturn! * 100).toFixed(2)}%
                </span>
              </div>
              <div className="label label-muted-2 mt-2">
                From ${initialValue.toLocaleString("en-US")} → $
                {endValue?.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn-ghost">
              ★ Watchlist
            </button>
            <button type="button" className="btn-primary">
              <Plus className="w-3 h-3" />
              Add to mine
            </button>
          </div>
        </div>

        {description && (
          <p className="text-[15.5px] text-body leading-relaxed mt-5 max-w-[68ch] text-pretty">
            {description}
          </p>
        )}

        {seed?.criterion && (
          <p className="text-[12.5px] text-muted mt-3 italic max-w-[68ch]">
            {seed.criterion}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading portfolio…
        </div>
      )}

      {!isLoading && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 340px" }}>
          {/* LEFT */}
          <div className="border-r border-hairline-strong">
            {/* Performance block */}
            {performance && historyData.length > 1 && (
              <div className="px-8 pt-6 pb-6 border-b border-hairline-strong">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-[18px] text-ink tracking-[-0.03em]">
                    Performance
                  </h2>
                  <span className="label-s label-muted-2">
                    Initial ${initialValue.toLocaleString("en-US")}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-6 mb-5">
                  <MetricCell
                    label="Total"
                    value={totalReturn!}
                    suffix={`+$${(endValue! - initialValue).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  />
                  <MetricCell
                    label="Annualized"
                    value={annualizedReturn!}
                    suffix={`(${daysHeld}d)`}
                  />
                  <MetricCell label="Max DD" value={-maxDrawdown!} color="negative" />
                  <MetricCell label="Best day" value={bestDay!} />
                </div>

                <div className="h-64 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={historyData}>
                      <defs>
                        <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#perfGrad)"
                        stroke="none"
                        style={{ color: totalReturn! >= 0 ? "var(--positive)" : "var(--negative)" }}
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={totalReturn! >= 0 ? "var(--positive)" : "var(--negative)"}
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

            {/* Holdings table */}
            <div className="px-8 py-6 border-b border-hairline-strong">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-display text-[18px] text-ink tracking-[-0.03em]">
                  Holdings <span className="label-s label-muted-2 ml-2">{constituents.length}</span>
                </h2>
                {currentQuotes.length > 0 && (
                  <span className="label-s label-muted-2">Live prices</span>
                )}
              </div>
              {currentQuotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="label-s label-muted-2 border-b border-hairline-strong h-8">
                        <th className="text-left py-2 font-medium">Ticker</th>
                        <th className="text-right py-2 font-medium">Weight</th>
                        <th className="text-right py-2 font-medium">Price</th>
                        <th className="text-right py-2 font-medium">24h</th>
                        <th className="text-right py-2 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuotes.map((q, i) => (
                        <tr
                          key={q.symbol}
                          className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <td className="py-2.5">
                            <Link
                              href={`/asset/${encodeURIComponent(q.symbol)}`}
                              className="num text-[12.5px] text-ink hover:text-brand-deep transition-colors duration-150"
                            >
                              {q.symbol}
                            </Link>
                          </td>
                          <td className="text-right py-2.5 num text-[12.5px] text-body">
                            {(q.weight * 100).toFixed(1)}%
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
                          <td className="text-right py-2.5 num text-[12.5px] text-ink">
                            {q.value != null
                              ? `$${q.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <PortfolioHoldingsTable
                  holdings={constituents.map((h) => ({ symbol: h.symbol, weight: h.weight }))}
                />
              )}
            </div>

            {/* Strategy memo */}
            {memoData && (
              <div className="px-8 py-6">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-[18px] text-ink tracking-[-0.03em]">
                    Strategy memo
                  </h2>
                  <span className="label-s label-muted-2">
                    {memoData.spec.category} · {memoData.spec.riskLevel}
                  </span>
                </div>

                <p className="text-[15.5px] text-body leading-[1.72] mb-5 max-w-[68ch] text-pretty">
                  {memoData.spec.thesis}
                </p>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <div>
                    <div className="label-s label-muted-2 mb-2">Criteria</div>
                    <ul className="space-y-1">
                      {memoData.spec.criteria.map((c, i) => (
                        <li key={i} className="text-[13px] text-body flex items-start gap-2">
                          <span className="text-brand-deep shrink-0">·</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {memoData.spec.risks && memoData.spec.risks.length > 0 && (
                    <div>
                      <div className="label-s label-muted-2 mb-2">Risks</div>
                      <ul className="space-y-1">
                        {memoData.spec.risks.map((r, i) => (
                          <li
                            key={i}
                            className="text-[13px] text-body flex items-start gap-2"
                          >
                            <span className="text-negative shrink-0">·</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — 340px rail */}
          <aside className="px-6 py-6 space-y-6">
            {/* Sector exposure */}
            {memoData?.sectorExposure && Object.keys(memoData.sectorExposure).length > 0 && (
              <section>
                <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em]">
                  Sector exposure
                </h3>
                <div className="border-t border-hairline-strong pt-3">
                  {Object.entries(memoData.sectorExposure)
                    .sort(([, a], [, b]) => b - a)
                    .map(([sector, pct]) => (
                      <div
                        key={sector}
                        className="grid grid-cols-[1fr_60px_44px] items-center h-8 border-b border-hairline"
                      >
                        <span className="label-s label-muted-2 truncate">{sector}</span>
                        <div className="relative h-1 bg-surface">
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-brand-deep"
                            style={{ width: `${Math.max(2, pct * 100)}%` }}
                          />
                        </div>
                        <span className="num text-[11px] text-ink text-right">
                          {(pct * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Top performers / detractors */}
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

            {/* Expected behaviour */}
            {memoData?.spec.expectedBehavior && (
              <section>
                <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em]">
                  Expected behavior
                </h3>
                <p className="text-[13px] text-body leading-relaxed border-t border-hairline-strong pt-3">
                  {memoData.spec.expectedBehavior}
                </p>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color?: "positive" | "negative";
}) {
  const tone = color ?? (value >= 0 ? "positive" : "negative");
  return (
    <div>
      <div className="label-s label-muted-2 mb-1.5">{label}</div>
      <div
        className={cn(
          "num text-[20px] font-medium tracking-[-0.02em]",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        <AnimatedNumber value={value * 100} signed decimals={2} suffix="%" />
      </div>
      {suffix && <div className="text-[11px] text-muted mt-0.5">{suffix}</div>}
    </div>
  );
}