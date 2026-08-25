"use client";

/**
 * DuPontChart — F3-1.
 *
 * Decomposes ROE into three drivers (margin × turnover × leverage)
 * for the latest year. Renders as a tree diagram with three boxes
 * feeding into a ROE summary, plus a multi-line chart showing each
 * driver over time.
 *
 * ROE = NetIncome / Revenue  (net margin)
 *    \u00d7 Revenue / Assets    (asset turnover)
 *    \u00d7 Assets / Equity     (equity multiplier)
 */

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export type DupontYear = {
  year: string;
  netMargin: number | null;
  assetTurnover: number | null;
  equityMultiplier: number | null;
  roe: number | null;
};

export function DuPontChart({ data }: { data: DupontYear[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        Sem dados para decompor ROE.
      </div>
    );
  }

  const latest = data[data.length - 1];

  return (
    <div>
      {/* Tree summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
        <DriverBox label="Margem líquida" value={latest.netMargin} suffix="%" color="#10b981" />
        <span className="hidden sm:flex items-center justify-center text-2xl text-muted-foreground/40">
          ×
        </span>
        <DriverBox
          label="Giro do ativo"
          value={latest.assetTurnover}
          decimals={2}
          color="#06b6d4"
        />
        <DriverBox
          label="Alavancagem"
          value={latest.equityMultiplier}
          decimals={2}
          color="#f59e0b"
        />
      </div>
      <div className="text-center mb-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          = ROE
        </p>
        <p className="mt-1 text-[26px] font-semibold tabular-nums text-emerald-300">
          {latest.roe != null ? `${latest.roe.toFixed(2)}%` : "—"}
        </p>
      </div>

      {/* Time series */}
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
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
              width={48}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.08)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as DupontYear;
                return (
                  <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
                    <p className="text-muted-foreground mb-1">{label}</p>
                    <p className="tabular-nums text-emerald-300">
                      ROE: {row.roe?.toFixed(2)}%
                    </p>
                    <p className="text-muted-foreground/70">
                      = {row.netMargin?.toFixed(2)}% × {row.assetTurnover?.toFixed(2)} ×{" "}
                      {row.equityMultiplier?.toFixed(2)}
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
            />
            <Area
              type="monotone"
              dataKey="roe"
              name="ROE (%)"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="rgba(16,185,129,0.15)"
              isAnimationActive={true}
              animationDuration={650}
            />
            <Area
              type="monotone"
              dataKey="netMargin"
              name="Margem (%)"
              stroke="#9ca3af"
              strokeWidth={1}
              fill="transparent"
              isAnimationActive={true}
              animationDuration={650}
            />
            <Area
              type="monotone"
              dataKey="assetTurnover"
              name="Giro"
              stroke="#06b6d4"
              strokeWidth={1}
              fill="transparent"
              isAnimationActive={true}
              animationDuration={650}
            />
            <Area
              type="monotone"
              dataKey="equityMultiplier"
              name="Alavancagem"
              stroke="#f59e0b"
              strokeWidth={1}
              fill="transparent"
              isAnimationActive={true}
              animationDuration={650}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DriverBox({
  label,
  value,
  suffix,
  decimals,
  color,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  decimals?: number;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border border-border/60 px-3 py-3"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </p>
      <p
        className="mt-1.5 text-[18px] font-semibold tabular-nums"
        style={{ color }}
      >
        {value == null ? "—" : value.toFixed(decimals ?? 2) + (suffix ?? "")}
      </p>
    </div>
  );
}