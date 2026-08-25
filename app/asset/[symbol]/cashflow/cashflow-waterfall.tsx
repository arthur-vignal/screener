"use client";

/**
 * CashFlowWaterfall — F2-4.
 *
 * Renders a bar chart showing the year's cash movements as a
 * waterfall: initial cash + operating + investing + financing = final
 * cash. We stack four bars per year (positive/negative) and let the
 * bar height visualize the magnitude.
 *
 * Data source: historicals.cashflow from the bundle (yearly entries
 * from cashflowHistory).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";

type CfRow = {
  endDate: string;
  operatingCashFlow?: number | null;
  investmentCashFlow?: number | null;
  financingCashFlow?: number | null;
  initialCashBalance?: number | null;
  finalCashBalance?: number | null;
  freeCashFlow?: number | null;
};

export function CashFlowWaterfall({ rows }: { rows: CfRow[] }) {
  // Filter yearly rows only; reverse so newest on left
  const data = rows
    .filter((r) => r.endDate)
    .slice()
    .reverse()
    .slice(0, 8)
    .reverse(); // newest year on the right again

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        Sem histórico de fluxo de caixa disponível.
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="endDate"
            tickFormatter={(v: string) => v.slice(0, 4)}
            tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v: number) => compactBRLShort(v)}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = (payload[0]?.payload ?? {}) as CfRow;
              return (
                <div className="px-3 py-2 rounded-lg bg-[#15151a]/80 backdrop-blur-md text-[11px] border border-white/5">
                  <p className="text-muted-foreground mb-1">{String(label).slice(0, 4)}</p>
                  <Row k="Operacional" v={row.operatingCashFlow} positive="text-emerald-300" negative="text-rose-300" />
                  <Row k="Investimento" v={row.investmentCashFlow} positive="text-emerald-300" negative="text-rose-300" />
                  <Row k="Financiamento" v={row.financingCashFlow} positive="text-emerald-300" negative="text-rose-300" />
                  <Row k="Caixa livre" v={row.freeCashFlow} positive="text-emerald-300" negative="text-rose-300" />
                </div>
              );
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 10, paddingTop: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}
            formatter={(v) => {
              const map: Record<string, string> = {
                op: "Operacional",
                inv: "Investimento",
                fin: "Financiamento",
              };
              return map[v] ?? v;
            }}
          />
          <Bar dataKey="operatingCashFlow" name="op" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={650}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={(row.operatingCashFlow ?? 0) >= 0 ? "#10b981" : "#f43f5e"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
          <Bar dataKey="investmentCashFlow" name="inv" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={650}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={(row.investmentCashFlow ?? 0) >= 0 ? "#10b981" : "#f43f5e"}
                fillOpacity={0.6}
              />
            ))}
          </Bar>
          <Bar dataKey="financingCashFlow" name="fin" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={650}>
            {data.map((row, i) => (
              <Cell
                key={i}
                fill={(row.financingCashFlow ?? 0) >= 0 ? "#10b981" : "#f43f5e"}
                fillOpacity={0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Row({
  k,
  v,
  positive,
  negative,
}: {
  k: string;
  v: number | null | undefined;
  positive: string;
  negative: string;
}) {
  if (v == null) {
    return (
      <p className="flex justify-between gap-3">
        <span className="text-muted-foreground">{k}</span>
        <span className="text-muted-foreground/60">—</span>
      </p>
    );
  }
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={`tabular-nums ${v >= 0 ? positive : negative}`}>
        {compactBRLShort(v)}
      </span>
    </p>
  );
}

function compactBRLShort(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}R$ ${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
}