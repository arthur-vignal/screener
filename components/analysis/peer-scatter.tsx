"use client";

/**
 * PeerScatter — scatter ROE × EV/EBITDA dos peers do subsetor (B4).
 *
 * Spec:
 *   - X: ROIC (fallback ROE se ROIC não computar). Brapi free tier não
 *     expõe NOPAT/equity granular, então usamos ROE de `/financial-data`.
 *   - Y: EV/EBITDA
 *   - Peers em muted, ativo em verde (label grande).
 *   - Reta de regressão OLS em JS puro (regressão linear Y = a + b·X).
 *   - Badge: distância vertical do ativo à reta = quanto ele negocia
 *     acima/abaixo do que a qualidade dele justifica.
 *   - Mínimo 5 peers: abaixo disso, só scatter + mediana (sem OLS).
 *   - Empty state: 0 peers.
 *
 * Resposta do OLS:
 *   Se Y_peers ≈ a + b·X_peers, então o valor "justo" de Y pro ativo
 *   é `a + b·X_ativo`. Distância = Y_ativo - (a + b·X_ativo).
 *   Positivo: negocia acima do que a qualidade justifica (caro).
 *   Negativo: negocia abaixo (barato).
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  ChartCard,
  ChartCardHeader,
  tooltipWrapperStyle,
} from "./analysis-utils";

type Peer = {
  symbol: string;
  name: string;
  evEbitda: number | null;
  roe: number | null;
  pe: number | null;
};

type Props = {
  peers: Peer[];
  asset: { evEbitda: number | null; roe: number | null; pe: number | null };
  subSector: string | null;
  medians: { evEbitda: number | null; roe: number | null; pe: number | null };
  sectorFallback: boolean;
  className?: string;
};

/**
 * Regressão linear simples (OLS): Y = a + b·X.
 * Retorna slope (b) e intercept (a). Se <2 pontos ou variância zero,
 * retorna null.
 */
function olsRegression(
  points: Array<{ x: number; y: number }>,
): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function PeerScatter({
  peers,
  asset,
  subSector,
  medians,
  sectorFallback,
  className,
}: Props): JSX.Element | null {
  // Prepara dados: peers com ROE × EV/EBITDA, + ativo no final
  const data = useMemo(() => {
    const peerPoints = peers
      .filter((p) => p.roe != null && p.evEbitda != null)
      .map((p) => ({
        roe: p.roe! * 100, // converte decimal → %
        evebitda: p.evEbitda!,
        symbol: p.symbol,
        isAsset: false,
      }));
    const assetPoint =
      asset.roe != null && asset.evEbitda != null
        ? [
            {
              roe: asset.roe * 100,
              evebitda: asset.evEbitda,
              symbol: "ATIVO",
              isAsset: true,
            },
          ]
        : [];
    return [...peerPoints, ...assetPoint];
  }, [peers, asset]);

  // OLS: regressão só dos peers (não inclui o ativo — seria leak)
  const ols = useMemo(() => {
    const peerPoints = data.filter((d) => !d.isAsset);
    return olsRegression(
      peerPoints.map((d) => ({ x: d.roe, y: d.evebitda })),
    );
  }, [data]);

  // Spread: quanto o ativo negocia acima/abaixo da reta
  const spread = useMemo(() => {
    if (
      !ols ||
      asset.roe == null ||
      asset.evEbitda == null
    ) {
      return null;
    }
    const expectedY = ols.intercept + ols.slope * (asset.roe * 100);
    return asset.evEbitda - expectedY;
  }, [ols, asset]);

  const canDrawRegression = peers.length >= 5 && ols != null;

  if (data.length < 2) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Qualidade × Múltiplo (peers)"
          subtitle="Sem peers com dados suficientes"
        />
        <div className="h-[200px] flex items-center justify-center text-[10px] text-foreground/60">
          Nenhum peer com ROE e EV/EBITDA conhecidos.
        </div>
      </ChartCard>
    );
  }

  // Domínio X: range dos peers + ativo, com padding
  const xValues = data.map((d) => d.roe);
  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues);
  const xRange = xMax - xMin;
  const xDomain: [number, number] = [
    Math.max(0, xMin - xRange * 0.1),
    xMax + xRange * 0.1,
  ];

  // Domínio Y
  const yValues = data.map((d) => d.evebitda);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin;
  const yDomain: [number, number] = [
    Math.max(0, yMin - yRange * 0.15),
    yMax + yRange * 0.15,
  ];

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Qualidade × Múltiplo (peers)"
        subtitle={
          subSector
            ? `ROE × EV/EBITDA · ${peers.length} peers de "${subSector}"${sectorFallback ? " (fallback setor)" : ""}`
            : `ROE × EV/EBITDA · ${peers.length} peers`
        }
        rightSlot={
          spread != null ? (
            <div
              className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ${
                spread > 0
                  ? "bg-[var(--negative)]/15 text-[var(--negative)]"
                  : "bg-[var(--positive)]/15 text-[var(--positive)]"
              }`}
            >
              {spread >= 0 ? "+" : "−"}
              {Math.abs(spread).toFixed(1)}× vs regressão
            </div>
          ) : null
        }
      />
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <XAxis
              type="number"
              dataKey="roe"
              name="ROE"
              unit="%"
              domain={xDomain}
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              axisLine={false}
              tickLine={false}
              label={{
                value: "ROE",
                position: "insideBottom",
                offset: -2,
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
              }}
            />
            <YAxis
              type="number"
              dataKey="evebitda"
              name="EV/EBITDA"
              unit="×"
              domain={yDomain}
              tick={{
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              axisLine={false}
              tickLine={false}
              width={42}
              label={{
                value: "EV/EBITDA",
                position: "insideLeft",
                offset: 8,
                fill: "rgba(200, 210, 230, 0.55)",
                fontSize: 9,
                angle: -90,
              }}
            />
            <ZAxis range={[40, 200]} />
            <Tooltip
              wrapperStyle={tooltipWrapperStyle}
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  roe: number;
                  evebitda: number;
                  symbol: string;
                  isAsset: boolean;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {d.isAsset ? "★ Ativo" : d.symbol}
                    </div>
                    <div className="text-[11px] tabular-nums text-[var(--positive)]">
                      ROE: {d.roe.toFixed(1)}%
                    </div>
                    <div className="text-[11px] tabular-nums text-[#489ffa]">
                      EV/EBITDA: {d.evebitda.toFixed(2)}×
                    </div>
                  </div>
                );
              }}
            />
            {/* Reta de regressão OLS — se ≥5 peers */}
            {canDrawRegression && ols && (
              <ReferenceLine
                segment={[
                  { x: xDomain[0], y: ols.intercept + ols.slope * xDomain[0] },
                  { x: xDomain[1], y: ols.intercept + ols.slope * xDomain[1] },
                ]}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}
            {/* Peers (muted, pequenos) */}
            <Scatter
              name="Peers"
              data={data.filter((d) => !d.isAsset)}
              fill="var(--muted)"
              fillOpacity={0.55}
              line={false}
              shape="circle"
            />
            {/* Ativo (verde, maior, com label) */}
            <Scatter
              name="Ativo"
              data={data.filter((d) => d.isAsset)}
              fill="var(--positive)"
              fillOpacity={0.9}
              line={false}
              shape="circle"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--muted)]" />
          <span>Peers (n={peers.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--positive)]" />
          <span>Ativo</span>
        </div>
        {canDrawRegression ? (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-px"
              style={{
                background:
                  "repeating-linear-gradient(90deg, var(--muted) 0 3px, transparent 3px 6px)",
              }}
            />
            <span>OLS (regressão linear)</span>
          </div>
        ) : (
          <div className="text-foreground/60">
            Mínimo 5 peers pra OLS (atual: {peers.length})
          </div>
        )}
        {medians.roe != null && medians.evEbitda != null && (
          <div className="text-foreground/60">
            Mediana subsetor: ROE {(medians.roe * 100).toFixed(1)}% · EV/EBITDA{" "}
            {medians.evEbitda.toFixed(1)}×
          </div>
        )}
      </div>
    </ChartCard>
  );
}