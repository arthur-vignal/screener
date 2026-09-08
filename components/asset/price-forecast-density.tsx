"use client";

/**
 * PriceForecastDensity — mini-histograma KDE dos 1000 paths MC finais.
 *
 * Mostra distribuição dos preços finais sorteados pelo GBM:
 * - Barras verdes: paths que ficaram ACIMA do preço atual
 * - Barras vermelhas: paths que ficaram ABAIXO
 * - Linha tracejada branca no preço atual
 * - Stats header: P(up), VaR95, CVaR95
 * - Footer: P10, P90 e legenda de cores
 *
 * ~100px altura, full width. Estilo Fey: dark glass, tabular-nums.
 *
 * Recebe `paths` (1000 preços finais sorted asc pelo endpoint).
 * Bins uniformes de 50 colunas entre min e max.
 */

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PACK, packTooltipStyle } from "@/lib/chart-pack";

type Props = {
  /** 1000 preços finais sorted ascending. */
  paths: number[];
  currentPrice: number;
  probUp: number;
  var95: number;
  cvar95: number;
};

type BinRow = {
  x: number;
  lo: number;
  hi: number;
  count: number;
  isUp: boolean;
};

export function PriceForecastDensity({
  paths,
  currentPrice,
  probUp,
  var95,
  cvar95,
}: Props) {
  if (paths.length === 0) return null;

  const min = paths[0];
  const max = paths[paths.length - 1];
  const nBins = 50;
  const binWidth = (max - min) / nBins;

  const bins: BinRow[] = [];
  if (binWidth > 0) {
    const counts = new Array<number>(nBins).fill(0);
    for (const p of paths) {
      let idx = Math.floor((p - min) / binWidth);
      if (idx >= nBins) idx = nBins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    }
    for (let i = 0; i < nBins; i++) {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      const mid = (lo + hi) / 2;
      bins.push({
        x: Math.round(mid),
        lo,
        hi,
        count: counts[i],
        isUp: mid > currentPrice,
      });
    }
  }

  const p10 = paths[Math.floor(paths.length * 0.1)] ?? paths[0];
  const p90 = paths[Math.floor(paths.length * 0.9)] ?? paths[paths.length - 1];
  const probUpPct = (probUp * 100).toFixed(1);

  return (
    <div className="rounded-xl bg-[#0d0d11] border border-white/[0.06] p-4 mt-3">
      <div className="flex items-baseline gap-4 mb-2 flex-wrap">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55 font-semibold">
          Distribuição MC (1000 paths)
        </div>
        <div className="text-[10px] text-muted-foreground/70 tabular-nums">
          P(up){" "}
          <span
            className={
              probUp >= 0.5 ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }
          >
            {probUpPct}%
          </span>
          <span className="mx-1.5 text-muted-foreground/30">·</span>
          VaR95 R$ {var95.toFixed(2)}
          <span className="mx-1.5 text-muted-foreground/30">·</span>
          CVaR95 R$ {cvar95.toFixed(2)}
        </div>
      </div>
      <div className="h-[100px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={bins}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            barCategoryGap={1}
          >
            <XAxis
              dataKey="x"
              type="number"
              domain={[min, max]}
              tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
              tick={{ fill: PACK.tick, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              minTickGap={60}
            />
            <YAxis hide />
            <Tooltip
              wrapperStyle={packTooltipStyle}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as BinRow | undefined;
                if (!p) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] tabular-nums text-foreground mb-0.5">
                      R$ {p.lo.toFixed(2)} — R$ {p.hi.toFixed(2)}
                    </div>
                    <div className="text-[11px] tabular-nums text-foreground">
                      {p.count} paths ({((p.count / paths.length) * 100).toFixed(1)}%)
                    </div>
                    <div
                      className="text-[9px] mt-0.5"
                      style={{
                        color: p.isUp
                          ? "var(--positive)"
                          : "var(--negative)",
                      }}
                    >
                      {p.isUp ? "acima do preço atual" : "abaixo do preço atual"}
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              x={currentPrice}
              stroke={PACK.foreground}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{
                value: "atual",
                position: "top",
                fill: PACK.tick,
                fontSize: 9,
              }}
            />
            <Bar dataKey="count" isAnimationActive={false}>
              {bins.map((bin, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={
                    bin.isUp
                      ? "rgba(77, 190, 149, 0.6)"
                      : "rgba(242, 85, 95, 0.6)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 flex-wrap mt-1">
        <span className="tabular-nums">
          P10: <span className="text-foreground font-semibold">R$ {p10.toFixed(2)}</span>
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span className="tabular-nums">
          P90: <span className="text-foreground font-semibold">R$ {p90.toFixed(2)}</span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: "rgba(77, 190, 149, 0.6)" }}
          />
          <span className="text-[var(--positive)]">acima</span>
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: "rgba(242, 85, 95, 0.6)" }}
          />
          <span className="text-[var(--negative)]">abaixo</span>
        </span>
      </div>
    </div>
  );
}
