"use client";

/**
 * DrawdownChart — F2-2.
 *
 * Calculates the running drawdown from a series of close prices.
 * Drawdown = (current - running_max) / running_max (≤ 0).
 *
 * Renders as a red area chart below zero with a faint zero reference
 * line. The deepest drawdown and the date it bottomed are called
 * out below the chart.
 */

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type Candle = { date: string; close: number };

export function DrawdownChart({ candles }: { candles: Candle[] }) {
  if (candles.length < 5) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        Histórico insuficiente para calcular drawdown.
      </div>
    );
  }

  let runningMax = candles[0].close;
  let deepest = 0;
  let deepestDate = candles[0].date;

  const data = candles.map((c) => {
    if (c.close > runningMax) runningMax = c.close;
    const dd = (c.close - runningMax) / runningMax;
    if (dd < deepest) {
      deepest = dd;
      deepestDate = c.date;
    }
    return {
      date: c.date,
      dd,
    };
  });

  return (
    <div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="rgba(255,255,255,0.05)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              tickFormatter={(v) => String(v).slice(0, 7)}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              domain={["auto", 0]}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.08)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const v = payload[0].value as number;
                return (
                  <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
                    <p className="text-muted-foreground mb-1">{String(label).slice(0, 10)}</p>
                    <p className="font-medium tabular-nums text-rose-300">
                      {typeof v === "number" ? `${(v * 100).toFixed(2)}%` : "—"}
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
            <Area
              type="monotone"
              dataKey="dd"
              stroke="rgba(244,63,94,0.8)"
              strokeWidth={1.2}
              fill="rgba(244,63,94,0.20)"
              isAnimationActive={true}
              animationDuration={650}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        <div>
          <p className="text-muted-foreground/40">Drawdown máximo</p>
          <p className="mt-0.5 text-rose-300 text-[13px] tabular-nums">
            {(deepest * 100).toFixed(2)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground/40">Data do fundo</p>
          <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
            {deepestDate}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground/40">Atual</p>
          <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
            {(data[data.length - 1].dd * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}