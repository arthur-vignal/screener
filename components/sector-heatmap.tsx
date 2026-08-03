"use client";

import useSWR from "swr";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Activity } from "lucide-react";
import { SectionHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SectorAgg = {
  sector: string;
  count: number;
  avgChange: number;
  gainers: number;
  losers: number;
  topMovers: { symbol: string; changePercent: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function colorFromChange(change: number): string {
  // Map -3% to +3% onto a color gradient
  const clamped = Math.max(-3, Math.min(3, change));
  if (clamped >= 0) {
    // green: brand-deep → mint
    const intensity = clamped / 3;
    const r = Math.round(58 + (5 - 58) * intensity);
    const g = Math.round(64 + (177 - 64) * intensity);
    const b = Math.round(196 + (105 - 196) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // red: deep red → coral
    const intensity = -clamped / 3;
    const r = Math.round(181 + (207 - 181) * intensity);
    const g = Math.round(25 + (32 - 25) * intensity);
    const b = Math.round(42 + (47 - 42) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

type TreemapItem = SectorAgg & { name: string; size: number; fill: string };

export function SectorHeatmap() {
  const { data, isLoading } = useSWR<{ sectors: SectorAgg[] }>(
    "/api/market/sectors",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const sectors = data?.sectors ?? [];

  const treemapData: TreemapItem[] = sectors.map((s) => ({
    ...s,
    name: s.sector,
    size: s.count,
    fill: colorFromChange(s.avgChange),
  }));

  return (
    <Card className="animate-fade-up">
      <SectionHeader
        icon={Activity}
        title="Heatmap setorial"
        action={
          sectors.length > 0 && (
            <span className="text-xs text-muted">
              {sectors.length} setores · S&P 500
            </span>
          )
        }
      />
      {isLoading ? (
        <Skeleton className="h-72" />
      ) : sectors.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-muted">
          Sem dados setoriais agora. Tente novamente em alguns minutos.
        </div>
      ) : (
        <>
          <div className="h-72 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="var(--canvas)"
                content={<TreemapCell />}
                isAnimationActive={true}
                animationDuration={400}
              >
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as TreemapItem;
                    return (
                      <div className="bg-surface-elevated border border-hairline-strong rounded-md px-3 py-2 text-xs shadow-xl">
                        <div className="font-medium text-ink mb-1">{d.sector}</div>
                        <div className="text-muted">
                          {d.count} ações · {d.gainers}↑ {d.losers}↓
                        </div>
                        <div
                          className={cn(
                            "font-tabular font-semibold mt-1",
                            d.avgChange >= 0 ? "text-positive" : "text-negative",
                          )}
                        >
                          {d.avgChange >= 0 ? "+" : ""}
                          {d.avgChange.toFixed(2)}%
                        </div>
                        {d.topMovers[0] && (
                          <div className="text-muted mt-1.5 text-[11px]">
                            Top: <span className="font-mono">{d.topMovers[0].symbol}</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-hairline">
            <span className="text-xs text-muted">−3%</span>
            <div className="flex-1 mx-3 h-1.5 rounded-full" style={{
              background: "linear-gradient(to right, rgb(181,25,42), rgb(120,28,44), rgb(60,30,40), rgb(40,28,38), rgb(60,30,40), rgb(120,28,44), rgb(58,64,196))",
            }} />
            <span className="text-xs text-muted">+3%</span>
          </div>
        </>
      )}
    </Card>
  );
}

function TreemapCell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: TreemapItem;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;

  const showLabel = width > 70 && height > 40;
  const showSub = width > 90 && height > 60;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.fill}
        stroke="var(--canvas)"
        strokeWidth={1}
        style={{ transition: "fill 0.2s" }}
        className="cursor-pointer"
      >
        <title>{`${payload.sector}: ${payload.avgChange.toFixed(2)}% (${payload.count} ações)`}</title>
      </rect>
      {showLabel && (
        <text
          x={x + 8}
          y={y + 18}
          fill="white"
          fontSize={12}
          fontWeight={500}
          style={{ pointerEvents: "none" }}
        >
          {payload.sector}
        </text>
      )}
      {showSub && (
        <text
          x={x + 8}
          y={y + 34}
          fill="rgba(255,255,255,0.85)"
          fontSize={11}
          fontFamily="var(--font-mono-font)"
          fontWeight={500}
          style={{ pointerEvents: "none" }}
        >
          {payload.avgChange >= 0 ? "+" : ""}
          {payload.avgChange.toFixed(2)}%
        </text>
      )}
    </g>
  );
}
