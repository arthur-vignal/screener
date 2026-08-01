"use client";

import useSWR from "swr";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

type Sector = {
  sector: string;
  count: number;
  avgChangePct: number;
  bestTicker: string;
  bestChangePct: number;
  worstTicker: string;
  worstChangePct: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RANGES = [
  { key: "1mo", label: "1M" },
  { key: "3mo", label: "3M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1Y" },
] as const;

export default function SectorsPage() {
  const [range, setRange] = useState<typeof RANGES[number]["key"]>("1mo");
  const { data, isLoading } = useSWR<{ sectors: Sector[] }>(
    `/api/sectors?range=${range}`,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 },
  );

  const sectors = data?.sectors ?? [];

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Setores</h1>
          <p className="text-sm text-text-secondary">
            Performance média por setor (S&P 500 top 100)
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                range === r.key
                  ? "bg-foreground text-background"
                  : "text-text-secondary hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg shimmer" />
          ))}
        </div>
      )}

      {!isLoading && sectors.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">
            Sem dados de setor ainda. Tente novamente em alguns minutos.
          </p>
        </div>
      )}

      {!isLoading && sectors.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sectors.map((s) => {
            const intensity = Math.min(Math.abs(s.avgChangePct) / 5, 1);
            const isPositive = s.avgChangePct >= 0;
            return (
              <Link
                key={s.sector}
                href={`/search?sector=${encodeURIComponent(s.sector)}`}
                className={cn(
                  "rounded-lg border p-4 transition-colors group",
                  isPositive
                    ? "border-positive/20 hover:border-positive/40"
                    : "border-negative/20 hover:border-negative/40",
                )}
                style={{
                  backgroundColor: isPositive
                    ? `color-mix(in srgb, var(--positive) ${intensity * 12}%, var(--surface))`
                    : `color-mix(in srgb, var(--negative) ${intensity * 12}%, var(--surface))`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs text-text-muted uppercase tracking-wider font-medium">
                    {s.sector}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div
                  className={cn(
                    "text-2xl font-mono font-semibold tabular-nums",
                    isPositive ? "text-positive" : "text-negative",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {s.avgChangePct.toFixed(2)}%
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {s.count} ativos
                </div>
                <div className="mt-3 pt-3 border-t border-border-subtle space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-positive" />
                    <span className="font-mono">{s.bestTicker}</span>
                    <span className="text-positive font-mono tabular-nums">
                      +{s.bestChangePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-3 h-3 text-negative" />
                    <span className="font-mono">{s.worstTicker}</span>
                    <span className={cn(
                      "font-mono tabular-nums",
                      s.worstChangePct >= 0 ? "text-positive" : "text-negative",
                    )}>
                      {s.worstChangePct >= 0 ? "+" : ""}{s.worstChangePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
