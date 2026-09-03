"use client";

/**
 * PriceChart — gráfico de preço estilo Fey TSLA.
 *
 * Mudanças aplicadas:
 *   - Eixo X usa escala por ÍNDICE (não tempo), pra evitar linhas
 *     conectando fim de um dia ao início do próximo. Labels mostram
 *     data formatada do row, mas a escala é discreta.
 *   - Animação fluida: isAnimationActive + duration 1500ms ease-in-out.
 *   - Altura maior: h-[560px] (2/3 confortável da tela).
 *   - cursor-pointer nas tabs.
 *
 * Visual:
 *   - linha fina + dots em pontos importantes
 *   - prevClose como ReferenceLine tracejada com label "Previous Close XXX.XX"
 *   - volume embaixo em barras sutis
 *   - tabs: 1D | 1W | 1M | 3M | YTD | 1Y | 5Y | All (estilo Fey)
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/foundation/skeleton";
import { PACK, packGrid, packTooltipStyle } from "@/lib/chart-pack";
import { cn } from "@/lib/utils";

export type RangeKey = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "5Y" | "All";

type Candle = {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

type Props = {
  candles: Candle[];
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  prevClose?: number | null;
  loading?: boolean;
  className?: string;
};

const RANGES: RangeKey[] = ["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y", "All"];

export function PriceChart({
  candles,
  range,
  onRangeChange,
  prevClose,
  loading,
  className,
}: Props): JSX.Element {
  if (loading) return <LoadingChart className={className} />;

  return (
    <div className={cn("relative", className)}>
      {/* Previous Close label (estilo Fey) */}
      {prevClose != null && candles.length > 0 && (
        <div className="absolute top-0 right-2 text-[10px] text-muted-foreground/70 pointer-events-none z-10">
          <div>Previous Close</div>
          <div className="tabular-nums text-foreground/85 font-medium">
            {prevClose.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      )}

      <div className="h-[560px] w-full">
        {candles.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer>
            <ChartInner candles={candles} prevClose={prevClose ?? null} />
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabs embaixo (estilo Fey) */}
      <div className="mt-4 flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-colors",
              range === r
                ? "bg-white/[0.04] text-foreground border border-white/10"
                : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.02]"
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Inner chart ────────────────────────────────────────────────────────────

function ChartInner({
  candles,
  prevClose,
}: {
  candles: Candle[];
  prevClose: number | null;
}) {
  // Adiciona índice discreto (0,1,2,...) em cada candle. A escala do
  // eixo X vira categórica, então gaps (mercado fechado, fins de semana)
  // NÃO são desenhados — a linha quebra entre candles adjacentes.
  const data = useMemo(
    () =>
      candles.map((c, i) => ({
        index: i,
        timestamp: c.timestamp,
        date: c.date,
        close: c.close,
        volume: c.volume,
      })),
    [candles]
  );

  return (
    <ComposedChart
      data={data}
      margin={{ top: 24, right: 16, left: 0, bottom: 0 }}
    >
      <CartesianGrid {...packGrid} />

      {/* Eixo X categórico — quebra visual entre candles (sem conectar
          pregões consecutivos) */}
      <XAxis
        dataKey="index"
        type="number"
        domain={["dataMin", "dataMax"]}
        tickFormatter={(idx: number) =>
          formatXByIdx(data, idx)
        }
        interval="preserveStartEnd"
        minTickGap={48}
        tick={{
          fill: PACK.tick,
          fontSize: 10,
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
        }}
        axisLine={{ stroke: PACK.axisLine, strokeWidth: 1 }}
        tickLine={false}
        height={24}
      />
      <YAxis
        yAxisId="price"
        orientation="right"
        tick={{
          fill: PACK.tick,
          fontSize: 10,
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
        }}
        tickFormatter={(v: number) => v.toFixed(0)}
        axisLine={{ stroke: PACK.axisLine, strokeWidth: 1 }}
        tickLine={false}
        width={48}
        domain={["auto", "auto"]}
      />
      <YAxis
        yAxisId="volume"
        orientation="left"
        tick={false}
        axisLine={false}
        tickLine={false}
        width={0}
        domain={[0, (dataMax: number) => dataMax * 4]}
      />

      <Tooltip
        content={<PriceTooltip />}
        cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
        wrapperStyle={{ outline: "none" }}
      />

      {prevClose != null && (
        <ReferenceLine
          y={prevClose}
          yAxisId="price"
          stroke="rgba(255,255,255,0.16)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
      )}

      {/* Volume embaixo (barras sutis) */}
      <Bar
        yAxisId="volume"
        dataKey="volume"
        fill={PACK.foreground}
        fillOpacity={0.12}
        isAnimationActive={true}
        animationDuration={1500}
        animationEasing="ease-out"
      />

      {/* Linha de preço — branco off (PACK.foreground), animação fluida */}
      <Line
        yAxisId="price"
        type="monotone"
        dataKey="close"
        stroke={PACK.foreground}
        strokeWidth={1.5}
        dot={false}
        activeDot={{ r: 4, fill: PACK.foreground }}
        isAnimationActive={true}
        animationBegin={0}
        animationDuration={1800}
        animationEasing="ease-out"
        connectNulls={false}
      />
    </ComposedChart>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function PriceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    dataKey?: string;
    payload?: { timestamp: number; close: number; volume: number; date: string };
  }>;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  // Filtra: pega só a entry do "close" (ignora volume/linhas extras).
  const closeEntry = payload.find(
    (e) => e.dataKey === "close" || e.name === "close"
  );
  if (!closeEntry || !closeEntry.payload) return null;

  const p = closeEntry.payload;
  const date = new Date(p.timestamp);
  return (
    <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
      <p className="text-[10px] text-foreground/70 mb-1">
        {date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>
      <p className="text-[13px] font-semibold tabular-nums text-foreground">
        R$ {p.close.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </p>
      {p.volume > 0 && (
        <p className="text-[10px] tabular-nums text-foreground/70 mt-1">
          Vol {p.volume.toLocaleString("pt-BR", { notation: "compact" })}
        </p>
      )}
    </div>
  );
}

// ─── Skeleton / Empty ───────────────────────────────────────────────────────

function LoadingChart({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn(className)}>
      <Skeleton className="h-[560px] w-full" roundedMd />
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-12" />
        ))}
      </div>
    </div>
  );
}

function EmptyChart(): JSX.Element {
  return (
    <div className="h-[560px] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[14px] text-foreground">
          Sem dados de preço.
        </p>
        <p className="mt-1.5 text-[12px] text-muted-foreground/70">
          Pode ser IPO recente ou indisponibilidade na Brapi.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type DataRow = {
  index: number;
  timestamp: number;
  date: string;
  close: number;
  volume: number;
};

/**
 * Formata o tick do eixo X com base na posição do candle no array.
 * - Intraday (1D, 1W): mostra hora "HH:MM"
 * - Outros: mostra data "DD MMM"
 */
function formatXByIdx(data: DataRow[], idx: number): string {
  const row = data[idx];
  if (!row) return "";
  const d = new Date(row.timestamp);
  const isIntraday = row.timestamp > Date.now() - 7 * 24 * 3600 * 1000;
  if (isIntraday) {
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
