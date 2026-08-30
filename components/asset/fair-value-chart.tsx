"use client";

/**
 * FairValueChart — preço vs valor justo implícito (preço vs fair value).
 *
 * Substitui o antigo PriceTargetChart (que mostrava mocks de target sell-side
 * — brapi não tem sell-side target pra BR).
 *
 * Cálculo:
 *   fair_value[t] = eps_ltm[t] × pe_medio_5a
 *   eps_ltm[t]    = netIncome / shares (do stats-history da brapi)
 *   pe_medio_5a   = média do trailingPE nos últimos 5 anos (5y × 4Q = 20Q)
 *
 * Quando o preço está consistentemente abaixo do fair value, o ativo está
 * descontado em relação ao múltiplo histórico.
 *
 * Diferença do PriceTargetChart: zero mock. Só dado real brapi. A "referência"
 * é a média histórica do próprio ativo, não a opinião de um analista.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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
} from "@/components/analysis/analysis-utils";
import type { EarningsYieldHistoryPoint } from "@/lib/analytics/earnings-yield-history";

type Props = {
  /** Série de 1/trailingPE history do endpoint /analysis. */
  earningsYieldHistory: EarningsYieldHistoryPoint[];
  /** P/L médio dos últimos N quarters pra calcular fair value. */
  windowQuarters?: number;
  className?: string;
};

export function FairValueChart({
  earningsYieldHistory,
  windowQuarters = 20, // 5 anos × 4 quarters
  className,
}: Props): JSX.Element | null {
  const { data, lastFairValue, lastPrice, percentile } = useMemo(() => {
    // P/L médio dos últimos N quarters (com PE válido e positivo).
    const validPE = earningsYieldHistory
      .filter(
        (r) =>
          r.trailingPE != null &&
          r.trailingPE > 0 &&
          r.trailingPE < 100 && // descarta outliers como antes (A8 spec B1)
          r.epsLtm != null &&
          r.epsLtm > 0 &&
          r.price != null &&
          r.price > 0,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-windowQuarters);

    if (validPE.length < 4) return { data: [], lastFairValue: null, lastPrice: null, percentile: null };

    const peMedio = validPE.reduce((s, r) => s + r.trailingPE!, 0) / validPE.length;

    const series = validPE
      .map((r) => {
        const eps = r.epsLtm!;
        const price = r.price!;
        const fairValue = eps * peMedio;
        return {
          endDate: r.endDate,
          ts: new Date(r.endDate + "T00:00:00Z").getTime(),
          price,
          fairValue,
          discount: price / fairValue - 1, // negativo = descontado
        };
      });

    const last = series[series.length - 1];
    return {
      data: series,
      lastFairValue: last.fairValue,
      lastPrice: last.price,
      percentile: null,
    };
  }, [earningsYieldHistory, windowQuarters]);

  if (data.length < 4) return null;

  const discount = lastPrice != null && lastFairValue != null
    ? (lastPrice / lastFairValue - 1) * 100
    : null;
  const undervalued = discount != null && discount < 0;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Preço vs valor justo"
        subtitle={
          discount != null
            ? `Fair value = EPS LTM × P/L médio 5a. ${undervalued ? "Descontado" : "Acima"} do preço atual.`
            : "Fair value = EPS LTM × P/L médio 5a"
        }
        rightSlot={
          discount != null ? (
            <div
              className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${undervalued ? "bg-[var(--positive)]/15 text-[var(--positive)]" : "bg-[var(--negative)]/15 text-[var(--negative)]"}`}
            >
              {discount >= 0 ? "+" : "−"}
              {Math.abs(discount).toFixed(1)}%
            </div>
          ) : null
        }
      />
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fv-fair" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--muted)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--muted)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
              vertical={false}
            />
            <TimeXAxis tickFontSize={10} />
            <YAxis
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              width={48}
              tickCount={4}
            />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  price: number;
                  fairValue: number;
                  discount: number;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-muted-foreground/70 mb-1">
                      {label}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      Preço: R$ {d.price.toFixed(2)}
                    </div>
                    <div className="text-[11px] tabular-nums text-muted-foreground/85">
                      Fair value: R$ {d.fairValue.toFixed(2)}
                    </div>
                    <div
                      className={`text-[10px] tabular-nums mt-1 font-semibold ${d.discount >= 0 ? "text-[var(--negative)]" : "text-[var(--positive)]"}`}
                    >
                      Desconto: {d.discount >= 0 ? "+" : "−"}
                      {Math.abs(d.discount * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="fairValue"
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              fill="url(#fv-fair)"
              isAnimationActive={true}
              animationDuration={1200}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--positive)"
              strokeWidth={2}
              strokeOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: "var(--positive)" }}
              isAnimationActive={true}
              animationDuration={1200}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px bg-[var(--positive)]" />
          <span>Preço</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--muted) 0 3px, transparent 3px 6px)",
            }}
          />
          <span>Fair value = EPS LTM × P/L médio 5a</span>
        </div>
      </div>
    </ChartCard>
  );
}