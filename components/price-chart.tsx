"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatCompact } from "@/lib/utils";

type Candle = {
  date: string;
  timestamp: number;
  close: number;
};

type Range = "1M" | "3M" | "6M" | "1Y" | "2Y";
const RANGES: Range[] = ["1M", "3M", "6M", "1Y", "2Y"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PriceChart({ ticker }: { ticker: string }) {
  const [range, setRange] = useState<Range>("1Y");

  const { data, isLoading } = useSWR<{ points: Candle[] }>(
    `/api/chart/${ticker}?range=${range}`,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 },
  );

  const points = data?.points ?? [];

  // Calculo de min/max para o eixo Y
  const prices = points.map((p) => p.close);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const padding = (max - min) * 0.05 || 1;
  const isPositive =
    points.length >= 2 && points[points.length - 1].close >= points[0].close;

  const color = isPositive ? "var(--positive)" : "var(--negative)";

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">Preço</h3>
        <div className="flex items-center gap-1 bg-surface-elevated rounded-md p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                range === r
                  ? "bg-foreground text-background"
                  : "text-text-secondary hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 h-72 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-text-muted">Carregando…</div>
          </div>
        )}
        {!isLoading && points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-text-muted">Sem dados</div>
          </div>
        )}
        {points.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                minTickGap={40}
              />
              <YAxis
                domain={[min - padding, max + padding]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickFormatter={(v) => formatCompact(v)}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "var(--text-secondary)", marginBottom: 4 }}
                itemStyle={{ color: "var(--foreground)", fontFamily: "var(--font-inter)" }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Preço"]}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${ticker})`}
                isAnimationActive={true}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
