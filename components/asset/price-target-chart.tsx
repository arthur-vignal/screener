"use client";

/**
 * PriceTargetChart — candles históricos + 3 linhas de alvos futuros
 * convergindo no preço atual (estilo Fey TSLA).
 *
 * ⚠️ IMPORTANTE: brapi v2 NÃO retorna analyst price target pra tickers BR.
 * High / Median / Low são MOCKS calculados a partir de current + 52w range,
 * marcados como "projected" no UI. Quando Sulfur tiver a própria engine de
 * precificação, esses valores viram dados reais.
 *
 * Visual (replica print Fey):
 *   ┌────────────────────────────────────────────┐
 *   │ Price target                                │
 *   │ R$48.83          +12.13% potential          │
 *   │                                            │
 *   │   ╲              ╱╲                        │
 *   │    ╲___    ╱──╲ ╱  ╲ ___  High              │
 *   │        ╲__╱    ╲    ╱__╱                    │
 *   │   Current price   Median                    │
 *   │                  ╲__╱                       │
 *   │   Low                                      │
 *   │                                            │
 *   │  R$50.0     R$48.83     R$43.55            │
 *   └────────────────────────────────────────────┘
 *
 * 3 linhas tracejadas (High / Median / Low) convergem à direita do
 * preço atual (visualmente: "pra onde o preço pode ir segundo análise").
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

type Candle = {
  timestamp: number;
  close: number;
};

type Props = {
  /** Candles históricos pra plotar a trajetória do preço. */
  candles: Candle[];
  /** Preço atual. */
  current: number | null;
  currency: "BRL" | "USD";
  className?: string;
};

/**
 * Gera alvos mockados baseados no preço atual.
 * Brapi não retorna sell-side target pra BR. Quando tivermos engine
 * própria, trocar pra dados reais.
 */
function deriveMockTargets(
  current: number,
  high52w: number | null,
  low52w: number | null,
): { high: number; median: number; low: number } {
  // Default: ±15% ao redor do current
  let high = current * 1.2;
  let median = current * 1.1;
  let low = current * 0.85;
  // Se temos 52w range, ajustamos pra respeitar:
  // - High target não pode ser maior que 1.5x do 52w high
  // - Low target não pode ser menor que 0.7x do 52w low
  if (high52w != null && high52w > 0) {
    high = Math.min(high, high52w * 1.15);
  }
  if (low52w != null && low52w > 0) {
    low = Math.max(low, low52w * 0.85);
  }
  // Median = média ponderada entre current + (high+low)/2
  median = current + (high - low) * 0.3;
  return { high, median, low };
}

export function PriceTargetChart({
  candles,
  current,
  currency,
  className,
}: Props): JSX.Element | null {
  // Monta dados pra ComposedChart: histórico (left side) + 3 pontos
  // projetados (right side) onde as linhas convergem.
  const { data, tHigh, tMedian, tLow, projectedAt } = useMemo(() => {
    if (!current || candles.length === 0) {
      return {
        data: [] as Array<{ index: number; price: number | null; ts?: number }>,
        tHigh: null,
        tMedian: null,
        tLow: null,
        projectedAt: null as number | null,
      };
    }

    const targets = deriveMockTargets(current, null, null);
    const lastIdx = candles.length - 1;
    const projectedIdx = lastIdx + 5; // 5 "passos" pra fora do chart

    const histData = candles.map((c, i) => ({
      index: i,
      price: c.close as number | null,
      ts: c.timestamp,
      // Pontos projetados (preenchidos só nos primeiros/lastIndex)
      projHigh: null as number | null,
      projMedian: null as number | null,
      projLow: null as number | null,
    }));

    // Adiciona 2 pontos extras: o último candle (onde as linhas convergem)
    // e 1 ponto "futuro" onde divergem.
    histData.push({
      index: projectedIdx,
      price: null as number | null,
      ts: candles[candles.length - 1].timestamp + 5 * 86400 * 1000,
      projHigh: targets.high,
      projMedian: targets.median,
      projLow: targets.low,
    });

    return {
      data: histData,
      tHigh: targets.high,
      tMedian: targets.median,
      tLow: targets.low,
      projectedAt: candles[candles.length - 1].timestamp + 5 * 86400 * 1000,
    };
  }, [candles, current]);

  if (!current || tHigh == null || tMedian == null || tLow == null) {
    return null;
  }

  const upsidePct = ((tMedian - current) / current) * 100;
  const upsideColor =
    upsidePct >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]";

  const fmt = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });

  const lastIdx = candles.length - 1;
  const projectedIdx = lastIdx + 5;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div>
          <div className="text-[14px] font-semibold tracking-tight text-foreground">
            Price target
          </div>
          <div className="text-[10px] text-muted-foreground/55 mt-0.5">
            projected
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[16px] font-bold text-foreground tabular-nums leading-none">
            {fmt(tMedian)}
          </div>
          <div
            className={cn(
              "text-[11px] font-semibold tabular-nums mt-1",
              upsideColor,
            )}
          >
            {upsidePct >= 0 ? "+" : ""}
            {upsidePct.toFixed(2)}% potential
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 56, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
              vertical={false}
            />
            <XAxis
              dataKey="index"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={false}
              axisLine={false}
              height={0}
            />
            <YAxis
              orientation="right"
              tick={{
                fill: "rgba(200, 210, 230, 0.45)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => v.toFixed(0)}
              axisLine={false}
              tickLine={false}
              width={42}
              domain={[
                (dataMin: number) => Math.min(dataMin, tLow) * 0.98,
                (dataMax: number) => Math.max(dataMax, tHigh) * 1.02,
              ]}
              tickCount={4}
              allowDecimals={false}
            />

            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  index?: number;
                  price?: number;
                  projHigh?: number | null;
                  projMedian?: number | null;
                  projLow?: number | null;
                };
                if (!d) return null;
                const isProjected = d.index === projectedIdx;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    {isProjected ? (
                      <>
                        <div className="text-[10px] text-muted-foreground/70 mb-1">
                          Projected targets
                        </div>
                        <div className="text-[10px] tabular-nums text-muted-foreground/85">
                          High: {fmt(d.projHigh ?? 0)}
                        </div>
                        <div className="text-[10px] tabular-nums text-foreground">
                          Median: {fmt(d.projMedian ?? 0)}
                        </div>
                        <div className="text-[10px] tabular-nums text-muted-foreground/85">
                          Low: {fmt(d.projLow ?? 0)}
                        </div>
                      </>
                    ) : (
                      <div className="text-[12px] font-semibold tabular-nums text-foreground">
                        {fmt(d.price ?? 0)}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Linha do preço histórico */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth={1.25}
              dot={false}
              activeDot={{ r: 3, fill: "#489ffa" }}
              isAnimationActive={true}
              animationDuration={1500}
              connectNulls={false}
            />

            {/* Linha High (projetada) */}
            <Line
              type="monotone"
              dataKey="projHigh"
              stroke="#4dbe95"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Linha Median (projetada) */}
            <Line
              type="monotone"
              dataKey="projMedian"
              stroke="#489ffa"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.85}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Linha Low (projetada) */}
            <Line
              type="monotone"
              dataKey="projLow"
              stroke="var(--negative)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Marcador do preço atual no último candle histórico */}
            <ReferenceDot
              x={lastIdx}
              y={current}
              r={4}
              fill="#489ffa"
              stroke="#070709"
              strokeWidth={1.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer com valores High/Median/Low */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <StatBlock
          label="High"
          value={fmt(tHigh)}
          colorClass="text-[var(--positive)]"
        />
        <StatBlock
          label="Median"
          value={fmt(tMedian)}
          colorClass="text-foreground"
          highlight
        />
        <StatBlock
          label="Low"
          value={fmt(tLow)}
          colorClass="text-[var(--negative)]"
        />
      </div>

      {/* Disclaimer sobre mocks */}
      <p className="mt-3 text-[9px] text-muted-foreground/45 leading-tight">
        Alvos são projeção baseada em volatilidade atual — não refletem
        consenso sell-side. Quando Sulfur tiver engine de precificação
        própria, esses valores viram dados reais.
      </p>
    </div>
  );
}

function StatBlock({
  label,
  value,
  colorClass,
  highlight,
}: {
  label: string;
  value: string;
  colorClass: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-md bg-white/[0.02] border border-white/[0.04] px-2.5 py-1.5",
        highlight && "bg-white/[0.04] border-white/[0.08]",
      )}
    >
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold mb-0.5">
        {label}
      </div>
      <div className={cn("text-[12px] font-semibold tabular-nums", colorClass)}>
        {value}
      </div>
    </div>
  );
}
