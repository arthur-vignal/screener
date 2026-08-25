"use client";

/**
 * MarginTrendChart — multi-year line chart for profitability metrics.
 *
 * Renders up to 4 lines (gross / operating / profit / ebitda margin)
 * from `financialDataHistory` and/or `incomeStatementHistory`. Years
 * are computed from `endDate` so the chart adapts to whatever Brapi
 * returns (typically up to 16 yearly entries).
 */

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type HistEntry = {
  endDate: string;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  ebitdaMargins?: number | null;
  returnOnEquity?: number | null;
};

export function MarginTrendChart({
  history,
  hideOp = false,
}: {
  history: HistEntry[];
  hideOp?: boolean;
}) {
  const data = history
    .slice() // don't mutate
    .sort((a, b) => (a.endDate < b.endDate ? -1 : 1))
    .map((d) => ({
      year: d.endDate?.slice(0, 4) ?? "?",
      gross: pct(d.grossMargins),
      op: pct(d.operatingMargins),
      profit: pct(d.profitMargins),
      ebitda: pct(d.ebitdaMargins),
      roe: pct(d.returnOnEquity),
    }));

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        Histórico insuficiente para gerar tendência.
      </div>
    );
  }

  // Use raw fractions for the Y domain — Recharts auto-scales.
  const allSeries: Array<{ key: keyof typeof data[0]; label: string; color: string }> = [
    { key: "gross", label: "Gross", color: "#9ca3af" },
    { key: "op", label: "Operacional", color: "#06b6d4" },
    { key: "profit", label: "Líquida", color: "#10b981" },
    { key: "roe", label: "ROE", color: "#f59e0b" },
  ];
  const series = hideOp ? allSeries.filter((s) => s.key !== "op") : allSeries;

  return (
    <div className="h-[280px] w-full">
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
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.08)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              return (
                <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
                  <p className="text-muted-foreground mb-1">{label}</p>
                  {payload.map((p) => {
                    const key = String(p.dataKey ?? "");
                    const found = series.find((s) => (s.key as string) === key);
                    return (
                      <p
                        key={key}
                        className="font-medium tabular-nums"
                        style={{ color: p.color }}
                      >
                        {found?.label}:{" "}
                        {typeof p.value === "number"
                          ? `${(p.value * 100).toFixed(2)}%`
                          : "—"}
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Area
              key={s.key as string}
              type="monotone"
              dataKey={s.key as string}
              stroke={s.color}
              strokeWidth={1.5}
              fill="transparent"
              isAnimationActive={true}
              animationDuration={650}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        {series.map((s) => (
          <span key={s.key as string} className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function pct(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}