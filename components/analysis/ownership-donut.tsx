"use client";

/**
 * OwnershipDonut — distribuição de holders do ativo.
 *
 * Visual (donut com labels):
 *   ┌──────────────────────────┐
 *   │      ╱──────╲            │
 *   │    ╱ Insider  ╲          │
 *   │   │  25%      │          │
 *   │    ╲ Float   ╱           │
 *   │      ╲──────╱            │
 *   │                          │
 *   │ Insider 25%              │
 *   │ Institutional 40%         │
 *   │ Float 35%                │
 *   └──────────────────────────┘
 *
 * Cor:
 *   - Insider: roxo/azul accent (comprometidos com a empresa)
 *   - Institucional: var(--positive) (smart money)
 *   - Float: muted/cinza
 */

import { useMemo } from "react";
import type { JSX } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartCard, ChartCardHeader } from "./analysis-utils";

type Props = {
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
  className?: string;
};

export function OwnershipDonut({
  heldPercentInsiders,
  heldPercentInstitutions,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    const insider = heldPercentInsiders ?? 0;
    const institutional = heldPercentInstitutions ?? 0;
    const floatPct = Math.max(0, 1 - insider - institutional);
    return [
      {
        name: "Insider",
        value: insider * 100,
        color: "#7c5cff",
      },
      {
        name: "Institucional",
        value: institutional * 100,
        color: "var(--positive)",
      },
      {
        name: "Float",
        value: floatPct * 100,
        color: "rgba(155, 161, 168, 0.55)",
      },
    ].filter((d) => d.value > 0.05);
  }, [heldPercentInsiders, heldPercentInstitutions]);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Ownership"
        subtitle="Quem está segurando o ativo"
      />
      <div className="h-[180px] w-full relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              stroke="#070709"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1000}
            >
              {data.map((d, i) => (
                <Cell key={`cell-${i}`} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  name: string;
                  value: number;
                  color: string;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-muted-foreground/70">
                      {d.name}
                    </div>
                    <div
                      className="text-[12px] font-semibold tabular-nums"
                      style={{ color: d.color }}
                    >
                      {d.value.toFixed(2)}%
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
            Holders
          </div>
          <div className="text-[16px] font-bold tabular-nums text-foreground">
            {total.toFixed(0)}%
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: d.color }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-muted-foreground/70 truncate">{d.name}</span>
              <span className="text-foreground/85 font-semibold tabular-nums">
                {d.value.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
