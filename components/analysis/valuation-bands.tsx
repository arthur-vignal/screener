"use client";

/**
 * ValuationBands — múltiplo histórico com bandas ±1σ e ±2σ (B1 da spec
 * 2026-08-29).
 *
 * Mostra a evolução do múltiplo (P/L | EV/EBITDA | P/VP) ao longo dos
 * últimos 5 anos (10 quando houver dado), sobreposto a:
 *   - banda ±1σ (10% opacity)
 *   - banda ±2σ (6% opacity)
 *   - linha média (muted, tracejada — média histórica é outra
 *     categoria, diferente da regra "sem tracejado" entre ativo×macro)
 *   - ponto atual destacado
 *
 * Diferença do A8 anterior:
 *   - Corte hardcoded (P/L > 100 ou negativo → descarta) →
 *     winsorização p1/p99 (clip nos percentis 1 e 99). Mantém o ponto
 *     mas protege mean e std de outliers legítimos.
 *
 * B1.b — segundo sub-gráfico do mesmo card: preço vs fair value
 * implícito (= EPS LTM × P/L médio 5a).
 *
 * Badge no header: `pXX · ±Yσ`, com cor semântica
 * (verde abaixo de p25, vermelho acima de p75).
 */

import { useMemo, useState } from "react";
import type { JSX } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

import {
  ChartCard,
  ChartCardHeader,
  TimeXAxis,
  tooltipWrapperStyle,
  attachTimestamps,
} from "./analysis-utils";
import type { EarningsYieldHistoryPoint } from "@/lib/analytics/earnings-yield-history";
import type { BandStats, MultiplesBands } from "@/lib/analytics/valuation-bands";

type MultipleKey = "pe" | "evebitda" | "pbv";
type Tab = { key: MultipleKey; label: string };

const TABS: Tab[] = [
  { key: "pe", label: "P/L" },
  { key: "evebitda", label: "EV/EBITDA" },
  { key: "pbv", label: "P/VP" },
];

type Props = {
  valuationBands: MultiplesBands;
  earningsYieldHistory: EarningsYieldHistoryPoint[];
  className?: string;
};

type BandPoint = {
  ts: number;
  endDate: string;
  value: number;
  /** base da banda ±1σ (vai pro eixo Y; empilhada com band1Range). */
  band1Low: number;
  /** altura da banda ±1σ (= band1High - band1Low). */
  band1Range: number;
  band2Low: number;
  band2Range: number;
  /** linha média. */
  mean: number;
};

function buildBandSeries(current: BandStats): BandPoint[] {
  if (current.mean == null || current.std == null) return [];
  const meanVal = current.mean;
  const stdVal = current.std;
  return current.series.map((r) => {
    const band1Low = meanVal - stdVal;
    const band1High = meanVal + stdVal;
    const band2Low = meanVal - 2 * stdVal;
    const band2High = meanVal + 2 * stdVal;
    return {
      ts: new Date(r.endDate + "T00:00:00Z").getTime(),
      endDate: r.endDate,
      value: r.value,
      band1Low,
      band1Range: band1High - band1Low,
      band2Low,
      band2Range: band2High - band2Low,
      mean: meanVal,
    };
  });
}

export function ValuationBands({
  valuationBands,
  earningsYieldHistory,
  className,
}: Props): JSX.Element | null {
  const [tab, setTab] = useState<MultipleKey>("pe");
  const current = valuationBands[tab];

  const percentileColor = useMemo(() => {
    if (current.percentile == null) return "text-foreground/70";
    if (current.percentile < 25) return "text-[var(--positive)]";
    if (current.percentile > 75) return "text-[var(--negative)]";
    return "text-foreground/85";
  }, [current.percentile]);

  const sigmaZ = useMemo(() => {
    if (
      current.current == null ||
      current.mean == null ||
      current.std == null ||
      current.std === 0
    )
      return null;
    return (current.current - current.mean) / current.std;
  }, [current]);

  // B1.b — fair value implícito (preço vs EPS LTM × P/L médio 5a)
  const fairValueData = useMemo(() => {
    if (valuationBands.peMean5a == null) return [];
    return attachTimestamps(
      earningsYieldHistory
        .filter((r) => r.epsLtm != null && r.price != null && r.epsLtm > 0)
        .map((r) => ({
          endDate: r.endDate,
          price: r.price!,
          fairValue: r.epsLtm! * valuationBands.peMean5a!,
        })),
    );
  }, [earningsYieldHistory, valuationBands.peMean5a]);

  const data = useMemo(() => buildBandSeries(current), [current]);

  if (current.insufficient || data.length === 0) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Bandas de múltiplo"
          subtitle={`Histórico insuficiente (${current.count} obs · mínimo 12)`}
        />
        <div className="h-[200px] flex items-center justify-center text-[10px] text-foreground/60">
          Sem histórico suficiente pra calcular bandas.
        </div>
      </ChartCard>
    );
  }

  const lastFair = fairValueData.length > 0 ? fairValueData[fairValueData.length - 1] : null;
  const discountPct = lastFair
    ? (lastFair.price / lastFair.fairValue - 1) * 100
    : null;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Bandas de múltiplo"
        subtitle={`${current.count} quarters · janela ${valuationBands.windowYears}a · winsorizado p1/p99`}
        rightSlot={
          <div className="text-right">
            <div className={`text-[14px] font-semibold tabular-nums ${percentileColor}`}>
              {current.current != null ? `${current.current.toFixed(2)}×` : "—"}
            </div>
            <div className="text-[9px] text-foreground/60">
              {current.percentile != null
                ? `p${Math.round(current.percentile)} · ${
                    sigmaZ != null ? `${sigmaZ >= 0 ? "+" : "−"}${Math.abs(sigmaZ).toFixed(1)}σ` : ""
                  }`
                : "—"}
            </div>
          </div>
        }
      />
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3">
        {TABS.map((t) => {
          const stats = valuationBands[t.key];
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
                active
                  ? "bg-white/[0.06] text-foreground"
                  : "text-foreground/60 hover:text-foreground/85"
              }`}
            >
              {t.label}
              {stats.insufficient ? (
                <span className="ml-1 text-[var(--negative)]/70">·</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Gráfico de múltiplo com bandas empilhadas */}
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="vb-2sigma" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.06} />
                <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="vb-1sigma" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.10} />
                <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
              vertical={false}
            />
            <TimeXAxis tickFontSize={9} />
            <YAxis
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              axisLine={false}
              tickLine={false}
              width={40}
              tickCount={5}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as { value: number; mean: number };
                if (!d) return null;
                const raw = current.rawSeries.find((r) => r.endDate === label);
                const isClipped =
                  raw != null && Math.abs(raw.value - d.value) > 0.001;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      Múltiplo: {d.value.toFixed(2)}×
                    </div>
                    {isClipped && raw && (
                      <div className="text-[9px] text-foreground/60 mt-0.5">
                        raw: {raw.value.toFixed(2)}× (winsorizado)
                      </div>
                    )}
                    <div className="text-[10px] tabular-nums text-foreground/85 mt-1">
                      Média 5a: {d.mean.toFixed(2)}×
                    </div>
                  </div>
                );
              }}
            />
            {/* Banda ±2σ: empilhada (band2Low + band2Range forma [2Low, 2High]). */}
            <Area
              type="monotone"
              dataKey="band2Low"
              stackId="vb2"
              stroke="none"
              fill="url(#vb-2sigma)"
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="band2Range"
              stackId="vb2"
              stroke="none"
              fill="url(#vb-2sigma)"
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
            {/* Banda ±1σ: empilhada em outro stack pra ficar em cima. */}
            <Area
              type="monotone"
              dataKey="band1Low"
              stackId="vb1"
              stroke="none"
              fill="url(#vb-1sigma)"
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="band1Range"
              stackId="vb1"
              stroke="none"
              fill="url(#vb-1sigma)"
              fillOpacity={1}
              isAnimationActive={false}
              legendType="none"
            />
            {/* Linha média (tracejada) */}
            {current.mean != null && (
              <ReferenceLine
                y={current.mean}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
            )}
            {/* Série do múltiplo (sólida, verde) */}
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--positive)"
              strokeWidth={2}
              strokeOpacity={1}
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: "var(--positive)" }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* B1.b — preço vs fair value (sub-gráfico do mesmo card) */}
      {fairValueData.length >= 4 && lastFair && (
        <>
          <div className="mt-4 mb-2 flex items-center justify-between">
            <div className="text-[10px] text-foreground/70">
              Preço vs valor justo (EPS LTM × P/L médio 5a = {valuationBands.peMean5a?.toFixed(1)}×)
            </div>
            <div
              className={`text-[10px] tabular-nums font-semibold px-2 py-0.5 rounded ${
                discountPct != null && discountPct < 0
                  ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                  : "bg-[var(--negative)]/15 text-[var(--negative)]"
              }`}
            >
              {discountPct != null && discountPct >= 0 ? "+" : "−"}
              {discountPct != null ? Math.abs(discountPct).toFixed(1) : "—"}%
            </div>
          </div>
          <div className="h-[140px] w-full">
            <ResponsiveContainer>
              <ComposedChart
                data={fairValueData}
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fv-b1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--muted)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--muted)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={1}
                  vertical={false}
                />
                <TimeXAxis tickFontSize={9} />
                <YAxis
                  tick={{
                    fill: "rgba(200, 210, 230, 0.55)",
                    fontSize: 9,
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  }}
                  tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickCount={4}
                />
                <Tooltip
                  wrapperStyle={tooltipWrapperStyle}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0]?.payload as {
                      price: number;
                      fairValue: number;
                    };
                    if (!d) return null;
                    return (
                      <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                        <div className="text-[10px] text-foreground/70 mb-1">{label}</div>
                        <div className="text-[11px] tabular-nums text-[var(--positive)]">
                          Preço: R$ {d.price.toFixed(2)}
                        </div>
                        <div className="text-[11px] tabular-nums text-foreground/85">
                          Fair value: R$ {d.fairValue.toFixed(2)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="fairValue"
                  stroke="var(--muted)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="url(#fv-b1)"
                  isAnimationActive={true}
                  animationDuration={1200}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--positive)"
                  strokeWidth={1.5}
                  strokeOpacity={1}
                  fill="none"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--positive)" }}
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>{TABS.find((t) => t.key === tab)?.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--muted) 0 3px, transparent 3px 6px)",
            }}
          />
          <span>Média 5a</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[var(--foreground)]/10" />
          <span>±1σ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[var(--foreground)]/5" />
          <span>±2σ</span>
        </div>
      </div>
    </ChartCard>
  );
}