"use client";

/**
 * PeBandChart — historical P/E band (F2-3).
 *
 * Plots trailingPE per year from `defaultKeyStatisticsHistory`. The
 * current P/E is shown as a horizontal marker; the band fills the
 * min–max range with a faint fill so the user can see where the
 * current value falls within its own history.
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

export function PeBandChart({
  history,
  currentPe,
  currency,
}: {
  history: Array<{ endDate: string; trailingPE?: number | null; price?: number | null }>;
  currentPe: number | null;
  currency: string;
}) {
  const data = history
    .slice()
    .sort((a, b) => (a.endDate < b.endDate ? -1 : 1))
    .map((d) => ({
      year: d.endDate?.slice(0, 4) ?? "?",
      pe: d.trailingPE ?? null,
    }))
    .filter((d) => d.pe != null && d.pe > 0 && d.pe < 200); // skip outliers / negatives

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        Histórico insuficiente para calcular banda de P/L.
      </div>
    );
  }

  const values = data.map((d) => d.pe as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  // Percentile of current Pe vs history
  const percentile =
    currentPe != null && currentPe > 0
      ? (values.filter((v) => v <= currentPe).length / values.length) * 100
      : null;

  return (
    <div>
      <div className="h-[240px] w-full">
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
              dataKey="year"
              tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.08)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const v = payload[0].value;
                return (
                  <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
                    <p className="text-muted-foreground mb-1">{label}</p>
                    <p className="font-medium tabular-nums">
                      P/L: {typeof v === "number" ? v.toFixed(2) : "—"}
                    </p>
                  </div>
                );
              }}
            />
            {currentPe != null && currentPe > 0 && currentPe < 200 && (
              <ReferenceLine
                y={currentPe}
                stroke="rgba(16,185,129,0.6)"
                strokeDasharray="3 3"
                label={{
                  value: `Hoje ${currentPe.toFixed(2)}`,
                  position: "insideTopRight",
                  fill: "rgba(16,185,129,0.8)",
                  fontSize: 10,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="pe"
              stroke="#9ca3af"
              strokeWidth={1.5}
              fill="rgba(156,163,175,0.10)"
              isAnimationActive={true}
              animationDuration={650}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        <div>
          <p className="text-muted-foreground/40">Mínimo</p>
          <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
            {min.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground/40">Média</p>
          <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
            {avg.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground/40">Percentil atual</p>
          <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
            {percentile != null ? `${percentile.toFixed(0)}º` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}