"use client";

/**
 * MarginWaterfall — F3-2.
 *
 * Renders the DRE as a cascade: starting revenue, then subtracting
 * cost of revenue → gross profit, then operating expenses →
 * operating income, then taxes → net income. Each step is shown
 * as a bar whose height represents the absolute BRL amount.
 *
 * Implementation: we use a ComposedChart with explicit positive/
 * negative stacked bars so the waterfall shape emerges. Recharts
 * doesn't have a native waterfall type, but this approach gives a
 * clean visual that's easy to read.
 */

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type IncomeRow = {
  year: string;
  totalRevenue?: number | null;
  costOfRevenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  incomeTaxExpense?: number | null;
  netIncome?: number | null;
};

export function MarginWaterfall({ row }: { row: IncomeRow | null }) {
  if (!row) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        Sem dados de DRE disponíveis.
      </div>
    );
  }

  // Build the waterfall as 7 bars with explicit start positions
  // for the floating segments.
  const rev = row.totalRevenue ?? 0;
  const cor = Math.abs(row.costOfRevenue ?? 0);
  const gross = row.grossProfit ?? (rev - cor);
  const opInc = row.operatingIncome ?? null;
  // Tax: brapi returns incomeTaxExpense as a positive number;
  // treat it as negative for the waterfall.
  const tax = row.incomeTaxExpense ?? null;
  const netInc = row.netIncome ?? null;

  // For visual floating bars we compute start/end positions.
  // Each step has: value (positive or negative contribution), start
  // (cumulative running total before this step), and label.
  type Step = {
    name: string;
    value: number;
    start: number;
    end: number;
    isFloating: boolean;
    color: string;
  };

  const steps: Step[] = [];
  let running = 0;

  // Revenue (positive starting block)
  steps.push({
    name: "Receita",
    value: rev,
    start: 0,
    end: rev,
    isFloating: false,
    color: "#10b981",
  });
  running = rev;

  // Cost of revenue (negative floating from running)
  if (row.costOfRevenue != null) {
    steps.push({
      name: "Custo",
      value: -cor,
      start: running - cor,
      end: running,
      isFloating: true,
      color: "#f43f5e",
    });
    running -= cor;
  }

  // Gross profit (positive starting block from running)
  steps.push({
    name: "Lucro Bruto",
    value: gross,
    start: 0,
    end: gross,
    isFloating: false,
    color: "#10b981",
  });
  running = gross;

  // Operating expenses (negative floating from running)
  if (opInc != null && opInc !== gross) {
    const opex = gross - opInc;
    steps.push({
      name: "Despesas Op.",
      value: -opex,
      start: running - opex,
      end: running,
      isFloating: true,
      color: "#f43f5e",
    });
    running = opInc;
  }

  // Operating income (positive block)
  if (opInc != null) {
    steps.push({
      name: "EBIT",
      value: opInc,
      start: 0,
      end: opInc,
      isFloating: false,
      color: "#10b981",
    });
    running = opInc;
  }

  // Tax
  if (tax != null) {
    const taxAbs = Math.abs(tax);
    steps.push({
      name: "Impostos",
      value: -taxAbs,
      start: running - taxAbs,
      end: running,
      isFloating: true,
      color: "#f43f5e",
    });
    running -= taxAbs;
  }

  // Net income (final block)
  const finalVal = netInc ?? running;
  steps.push({
    name: "Lucro Líquido",
    value: finalVal,
    start: 0,
    end: finalVal,
    isFloating: false,
    color: "#10b981",
  });

  // For a Recharts waterfall approximation we render positive and
  // negative bars side by side and use transparent "spacer" bars
  // to align them visually. We use two Bar series: pos (start..end)
  // and neg.
  const data = steps.map((s) => ({
    name: s.name,
    start: Math.min(s.start, s.end),
    end: Math.max(s.start, s.end),
    height: Math.abs(s.end - s.start),
    value: s.value,
    color: s.value >= 0 ? "#10b981" : "#f43f5e",
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
          barCategoryGap="18%"
        >
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v: number) => compactBRL(v)}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = (payload[0]?.payload ?? {}) as { name: string; value: number; height: number };
              return (
                <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
                  <p className="text-muted-foreground mb-1">{row.name}</p>
                  <p
                    className={
                      "font-medium tabular-nums " +
                      (row.value >= 0 ? "text-emerald-300" : "text-rose-300")
                    }
                  >
                    {row.value >= 0 ? "+" : ""}
                    {compactBRL(row.value)}
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
          {/* Transparent spacer bar for cumulative start */}
          <Bar dataKey="start" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          {/* The actual value bar */}
          <Bar dataKey="height" stackId="waterfall" fill="#10b981" isAnimationActive={true} animationDuration={650}>
            {data.map((d, i) => (
              <Bar key={i} dataKey="height" fill={d.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function compactBRL(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}R$ ${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
}