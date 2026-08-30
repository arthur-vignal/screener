"use client";

/**
 * PESelicScatter — scatter plot: ativo atual vs subsetor.
 *
 * Eixo X: P/L (mais alto = mais caro)
 * Eixo Y: SELIC real (%)
 *
 * Visual:
 *   SELIC (%)
 *    ^
 *  16│
 *  14│              ● ITUB4
 *  12│
 *  10│
 *   8│     ● PETR4 ● VALE3
 *   6│ ● WEGE3
 *   4│                          ● ELET3
 *   2│
 *   0└────────────────────────────────> P/L
 *        5    10    15    20    25    30
 *
 * Quadrante barato + SELIC alto = canto superior esquerdo (verde)
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { ChartCard, ChartCardHeader } from "./analysis-utils";

type Peer = { symbol: string; pe: number | null };

type Props = {
  /** P/L do ativo principal. */
  mainPe: number | null;
  /** Lista de peers do subsetor com P/E. */
  peers: Peer[];
  /** SELIC anual atual (proxy de taxa livre de risco). */
  selic: number | null;
  /** Se o ativo principal é o foco destacado. */
  highlightSymbol?: string;
  className?: string;
};

export function PESelicScatter({
  mainPe,
  peers,
  selic,
  highlightSymbol,
  className,
}: Props): JSX.Element | null {
  const data = useMemo(() => {
    const pts: Array<{ symbol: string; pe: number; selic: number; isMain: boolean }> = [];
    if (mainPe != null && selic != null) {
      pts.push({
        symbol: highlightSymbol ?? "Ativo",
        pe: mainPe,
        selic,
        isMain: true,
      });
    }
    if (selic != null) {
      for (const p of peers) {
        if (p.pe != null && p.pe > 0 && p.pe < 100) {
          pts.push({ symbol: p.symbol, pe: p.pe, selic, isMain: false });
        }
      }
    }
    return pts;
  }, [mainPe, peers, selic, highlightSymbol]);

  if (data.length === 0 || selic == null) return null;

  // X domain
  const pes = data.map((d) => d.pe);
  const xMax = Math.max(...pes) * 1.15;
  const xMin = 0;

  // Selic line (horizontal reference)
  const selicY = selic;

  // Median P/E dos peers
  const peerPes = data.filter((d) => !d.isMain).map((d) => d.pe);
  const medianPe =
    peerPes.length > 0
      ? peerPes.sort((a, b) => a - b)[Math.floor(peerPes.length / 2)]
      : null;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="P/L vs taxa livre de risco"
        subtitle={
          medianPe != null
            ? `Mediana do subsetor: ${medianPe.toFixed(1)}x · SELIC ${selic.toFixed(2)}%`
            : `SELIC ${selic.toFixed(2)}%`
        }
      />
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <ScatterChart
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              dataKey="pe"
              domain={[xMin, xMax]}
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 10,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(0)}x`}
              axisLine={false}
              tickLine={false}
              label={{
                value: "P/L (menor = mais barato)",
                fill: "rgba(200, 210, 230, 0.45)",
                fontSize: 9,
                position: "insideBottom",
                offset: -2,
              }}
            />
            <YAxis
              type="number"
              dataKey="selic"
              domain={[0, Math.max(selic * 1.4, 18)]}
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 10,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              axisLine={false}
              tickLine={false}
              width={36}
              label={{
                value: "SELIC %",
                fill: "rgba(200, 210, 230, 0.45)",
                fontSize: 9,
                position: "insideLeft",
                angle: -90,
                offset: 10,
              }}
            />
            <ZAxis range={[60, 60]} />

            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  symbol: string;
                  pe: number;
                  selic: number;
                  isMain: boolean;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div
                      className={
                        d.isMain
                          ? "text-[11px] font-bold text-foreground"
                          : "text-[11px] font-semibold text-foreground/85"
                      }
                    >
                      {d.symbol}
                    </div>
                    <div className="text-[12px] font-semibold tabular-nums text-foreground">
                      P/L: {d.pe.toFixed(2)}x
                    </div>
                    <div className="text-[10px] text-foreground/70 tabular-nums">
                      SELIC: {d.selic.toFixed(2)}%
                    </div>
                  </div>
                );
              }}
            />

            {/* Peers (azul muted) */}
            <Scatter
              data={data.filter((d) => !d.isMain)}
              fill="rgba(72, 159, 250, 0.55)"
              shape={(props: {
                cx?: number;
                cy?: number;
                payload?: { symbol: string };
              }) => (
                <g>
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill="rgba(72, 159, 250, 0.4)"
                    stroke="rgba(72, 159, 250, 0.8)"
                    strokeWidth={1}
                  />
                  <text
                    x={(props.cx ?? 0) + 8}
                    y={(props.cy ?? 0) + 3}
                    fill="rgba(200, 210, 230, 0.65)"
                    fontSize={9}
                    fontFamily="var(--font-manrope), system-ui, sans-serif"
                  >
                    {props.payload?.symbol}
                  </text>
                </g>
              )}
            />

            {/* Ativo principal (verde, maior) */}
            {data.filter((d) => d.isMain).map((d, i) => (
              <Scatter
                key={`main-${i}`}
                data={[d]}
                shape={(props: {
                  cx?: number;
                  cy?: number;
                  payload?: { symbol: string };
                }) => (
                  <g>
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={10}
                      fill="rgba(77, 190, 149, 0.95)"
                      stroke="#070709"
                      strokeWidth={2}
                    />
                    <text
                      x={(props.cx ?? 0) + 12}
                      y={(props.cy ?? 0) + 4}
                      fill="rgba(77, 190, 149, 1)"
                      fontSize={10}
                      fontWeight={700}
                      fontFamily="var(--font-manrope), system-ui, sans-serif"
                    >
                      {props.payload?.symbol}
                    </text>
                  </g>
                )}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
