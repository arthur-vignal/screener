"use client";

/**
 * /asset/[symbol]/dividends — dividend history drill-down (F2-5).
 *
 * Aggregates `cashDividends` from Brapi's dividendsData into yearly
 * sums (DIVIDENDO vs JCP) and renders a stacked-bar chart plus a
 * table of the last 24 events. Payout streak (consecutive years
 * paying) is computed client-side.
 */

import Link from "next/link";
import { use } from "react";
import useSWR from "swr";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { AllStatsButton } from "@/components/all-stats-button";
import { useAssetBackground } from "@/lib/use-asset-background";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type CashDividend = {
  paymentDate: string;
  rate: number | null;
  label: string | null;
};

type Selic = {
  date: string;
  value: number;
  epochDate: number;
} | null;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

export default function DividendsPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data: bundle } = useAssetBundle(symbol);
  const { data: divData } = useSWR<{ dividends: CashDividend[] }>(
    `/api/asset/${encodeURIComponent(symbol)}/dividends`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600_000 },
  );
  const { data: selicData } = useSWR<{ selic: Selic }>(
    `/api/macro/selic`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 24 * 3600 * 1000 },
  );

  const divs = divData?.dividends ?? [];
  const annualYield = (bundle?.metrics?.dividendYield as number | null | undefined) ?? null;

  // Aggregate by year, splitting DIVIDENDO and JCP.
  const byYear = new Map<string, { dividendo: number; jcp: number; total: number; count: number }>();
  for (const d of divs) {
    const year = (d.paymentDate ?? "").slice(0, 4);
    if (!year) continue;
    const isJcp = (d.label ?? "").toLowerCase().includes("jcp");
    const rate = d.rate ?? 0;
    const e = byYear.get(year) ?? { dividendo: 0, jcp: 0, total: 0, count: 0 };
    if (isJcp) e.jcp += rate;
    else e.dividendo += rate;
    e.total += rate;
    e.count += 1;
    byYear.set(year, e);
  }

  const series = Array.from(byYear.entries())
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => (a.year < b.year ? -1 : 1))
    .slice(-10); // last 10 years

  // Streak: count consecutive years from most recent backwards where
  // total > 0.
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].total > 0) streak++;
    else break;
  }

  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);

  return (
    <div
      className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-manrope)",
        ...bgStyle,
      }}
    >
      <div className="px-1 pt-5 pb-12 max-w-screen-2xl mx-auto w-full">
        <AssetSubheader
          symbol={symbol}
          longName={bundle?.longName ?? null}
          logoUrl={bundle?.logoUrl ?? null}
          currency={bundle?.currency ?? "BRL"}
          price={bundle?.quote?.price ?? null}
          change={bundle?.quote?.change ?? null}
          changePercent={bundle?.quote?.changePercent ?? null}
          section={{ slug: "dividends", label: "Dividendos" }}
        />

        {/* Top tiles */}
        <div className="mt-6 flex justify-end">
          <AllStatsButton href={`/asset/${symbol}/stats/earnings`} label="All earnings" />
        </div>

        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Proventos
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <Tile
                label="Dividend yield"
                value={annualYield != null ? `${(annualYield * 100).toFixed(2)}%` : "—"}
              />
              <Tile
                label="Anos pagando"
                value={streak > 0 ? `${streak}` : "—"}
              />
              <Tile
                label="Eventos totais"
                value={divs.length > 0 ? String(divs.length) : "—"}
              />
              <Tile
                label="Sinal"
                value={
                  streak === 0
                    ? "—"
                    : streak >= 10
                    ? "Sólido"
                    : streak >= 5
                    ? "Consistente"
                    : streak >= 1
                    ? "Recente"
                    : "—"
                }
              />
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Proventos por ano (soma das taxas)
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-4">
            {divs.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-muted-foreground/60">
                Sem histórico de proventos disponível.
              </div>
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={series}
                    margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
                    barCategoryGap="22%"
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const row = (payload[0]?.payload ?? {}) as {
                          year: string;
                          dividendo: number;
                          jcp: number;
                          total: number;
                          count: number;
                        };
                        return (
                          <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
                            <p className="text-muted-foreground mb-1">{label}</p>
                            <p className="flex justify-between gap-3 tabular-nums text-emerald-300">
                              <span className="text-muted-foreground">Dividendo</span>
                              <span>{(row.dividendo * 100).toFixed(2)}%</span>
                            </p>
                            <p className="flex justify-between gap-3 tabular-nums text-cyan-300">
                              <span className="text-muted-foreground">JCP</span>
                              <span>{(row.jcp * 100).toFixed(2)}%</span>
                            </p>
                            <p className="flex justify-between gap-3 tabular-nums mt-1 pt-1 border-t border-white/10">
                              <span className="text-muted-foreground">Total</span>
                              <span>{(row.total * 100).toFixed(2)}% ({row.count} ev.)</span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: 10,
                        paddingTop: 8,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                      formatter={(v) => (v === "dividendo" ? "Dividendo" : "JCP")}
                    />
                    <Bar
                      dataKey="dividendo"
                      stackId="a"
                      fill="#10b981"
                      fillOpacity={0.85}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={650}
                    />
                    <Bar
                      dataKey="jcp"
                      stackId="a"
                      fill="#06b6d4"
                      fillOpacity={0.7}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={650}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/40">
            Soma das taxas por ano (não é valor absoluto em BRL — multiplicar pelo preço no pagamento para valor real).
          </p>
        </section>

        {/* F4-3: DY vs Selic comparison */}
        {selicData?.selic && (
          <section className="mt-8">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
              Dividendo vs renda fixa
            </h2>
            <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    Dividend yield
                  </p>
                  <p className="mt-1 text-[24px] font-semibold tabular-nums">
                    {annualYield != null
                      ? `${(annualYield * 100).toFixed(2)}%`
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    Selic atual
                  </p>
                  <p className="mt-1 text-[24px] font-semibold tabular-nums">
                    {selicData.selic.value.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-foreground/10 overflow-hidden">
                {annualYield != null && (
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (annualYield * 100 / Math.max(selicData.selic.value, 0.01)) * 100)}%`,
                      background:
                        annualYield * 100 >= selicData.selic.value
                          ? "#10b981"
                          : "#f59e0b",
                    }}
                  />
                )}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {annualYield != null ? (
                  annualYield * 100 >= selicData.selic.value ? (
                    <span className="text-emerald-300">
                      ● DY supera a Selic — renda variável compensa contra a taxa básica.
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      ● DY abaixo da Selic — considerar o prêmio de risco da renda variável.
                    </span>
                  )
                ) : (
                  "Sem dividend yield para comparar."
                )}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/40">
                Selic meta: {selicData.selic.date}. DY é anualizado, taxa nominal sem IR.
              </p>
            </div>
          </section>
        )}

        {/* Recent events table */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Últimos eventos
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-muted-foreground/60 text-[10px] uppercase tracking-[0.14em]">
                  <th className="text-left px-4 py-2 font-normal">Pagamento</th>
                  <th className="text-left px-4 py-2 font-normal">Tipo</th>
                  <th className="text-right px-4 py-2 font-normal">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {divs
                  .slice()
                  .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1))
                  .slice(0, 24)
                  .map((d, i) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {d.paymentDate?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] " +
                            (d.label?.toLowerCase().includes("jcp")
                              ? "bg-cyan-500/10 text-cyan-300"
                              : "bg-emerald-500/10 text-emerald-300")
                          }
                        >
                          {d.label ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {d.rate != null ? `${(d.rate * 100).toFixed(2)}%` : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <Link
          href={`/asset/${symbol}`}
          className="inline-flex items-center gap-1.5 mt-8 text-[12px] tracking-[0.18em] uppercase text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar para o gráfico
        </Link>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 sm:py-5 border-t border-border/40 sm:border-t-0 sm:border-l sm:first:border-l-0 sm:first:border-t-0 border-border/40">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] md:text-[16px] font-medium tabular-nums">
        {value}
      </p>
    </div>
  );
}