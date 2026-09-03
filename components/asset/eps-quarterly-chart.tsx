"use client";

/**
 * EPSQuarterlyChart — gráfico de pontos de EPS por quarter (estilo Fey TSLA).
 *
 * Visual (replica o print Fey TSLA):
 *   Earnings per share
 *   EPS forecast down 28.60%
 *
 *   (▲ missed)   (▲ missed)   (▼ beat)   (▲ missed)   (▲ missed)
 *       0.60         0.52        0.72         0.73         0.52
 *   Q1 2024      Q2 2024      Q3 2024      Q4 2024      Q1 2025
 *
 * - 5 quarters mais recentes (reais) + 1 projected opcional (forwardEps)
 * - Marker circular por quarter (verde/vermelho/neutro)
 * - Seta ▲/▼ indicando variação vs quarter anterior
 * - Status heurístico: missed/beat/flat baseado em ±5% de variação
 * - Label "EPS forecast down X%" calculado (TTM vs year-ago TTM)
 *
 * Packs aplicados (sessão 2026-09-03):
 * - Pack 02 (fill sólido vs contorno vazio — forecast vs reported):
 *   quarrer real = fill sólido + stroke; quarter projected = fill
 *   transparente + stroke PACK.muted tracejado. Comunica 'ainda não
 *   reportado' sem legenda cognitiva.
 * - Pack 04 (linhas retas para medições discretas): type="linear" na
 *   linha de conexão entre pontos. EPS é calculado por quarter — não
 *   há interpolação honesta entre quarters, então monotone inventava
 *   curva onde não tem dado.
 * - Cores via lib/chart-pack.ts (PACK.asset beat, PACK.negative missed,
 *   PACK.foreground flat, PACK.muted projected stroke).
 *
 * Dados REAIS: brapi incomeStatementHistoryQuarterly.
 * Brapi NÃO retorna consenso pré-resultado, então "missed/beat" é
 * heurístico vs quarter anterior, não vs estimativa de Wall Street.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { PACK, packGrid } from "@/lib/chart-pack";

export type QuarterPoint = {
  /** Quarter end date (ISO "YYYY-MM-DD"). */
  endDate: string;
  /** EPS básico. */
  epsBasic: number | null;
  /** Revenue no quarter (BRL/USD). */
  revenue: number | null;
};

type Props = {
  /** Lista de quarters (já ordenada asc pelo endDate). */
  quarters: QuarterPoint[];
  /** Moeda pra formatar. */
  currency: "BRL" | "USD";
  /** Quantos quarters exibir (default: 5). */
  limit?: number;
  /**
   * EPS forward (próximo quarter projetado). Quando informado, adiciona
   * 1 ponto extra com pack 02 aplicado (contorno vazio tracejado).
   * Mesmo label da QuarterResults (quarter atual + próximo Q projetado).
   */
  forwardEps?: number | null;
  className?: string;
};

type RowStatus = "missed" | "beat" | "flat";

function statusFromChange(changePct: number | null): RowStatus {
  if (changePct == null) return "flat";
  if (changePct < -5) return "missed";
  if (changePct > 5) return "beat";
  return "flat";
}

const CHART_FONT_FAMILY =
  "var(--font-manrope), system-ui, sans-serif";

export function EPSQuarterlyChart({
  quarters,
  currency,
  limit = 5,
  forwardEps,
  className,
}: Props): JSX.Element | null {
  // Pega últimos N quarters com EPS válido
  const realData = useMemo(() => {
    const valid = quarters
      .filter((q): q is QuarterPoint & { epsBasic: number } => q.epsBasic != null)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(-limit);
    return valid.map((q, i, arr) => {
      const prev = i > 0 ? arr[i - 1] : null;
      const changePct =
        prev && prev.epsBasic !== 0
          ? ((q.epsBasic - prev.epsBasic) / Math.abs(prev.epsBasic)) * 100
          : null;
      const status = statusFromChange(changePct);
      return {
        ...q,
        index: i,
        changePct,
        status,
        isPositive: q.epsBasic >= 0,
        // Pack 02: "reported" — solid fill
        isProjected: false,
      };
    });
  }, [quarters, limit]);

  // Pack 02: ponto projected extra (forwardEps) — recebe fill transparente
  // + stroke tracejado. Mesmo valor que o ponto real anterior × (1+growth)
  // se forwardEps não for passado, deixa sem projected.
  const data = useMemo(() => {
    if (forwardEps == null || realData.length === 0) return realData;
    const lastReal = realData[realData.length - 1];
    const projected = {
      endDate: `${lastReal.endDate}_proj`,
      epsBasic: forwardEps,
      revenue: null,
      index: realData.length,
      changePct:
        lastReal.epsBasic !== 0
          ? ((forwardEps - lastReal.epsBasic) / Math.abs(lastReal.epsBasic)) * 100
          : null,
      status: "flat" as const,
      isPositive: forwardEps >= 0,
      isProjected: true,
    };
    return [...realData, projected];
  }, [realData, forwardEps]);

  // Texto descritivo: "EPS forecast down X%"
  const forecastText = useMemo(() => {
    if (data.length < 2) return null;
    const realPoints = data.filter((d) => !d.isProjected);
    if (realPoints.length < 2) return null;
    const ttmNow = realPoints.slice(-4).reduce((s, d) => s + d.epsBasic, 0);
    const ttmPrev = realPoints
      .slice(-8, -4)
      .reduce((s, d) => s + d.epsBasic, 0);
    if (ttmPrev === 0) return null;
    const changePct = ((ttmNow - ttmPrev) / Math.abs(ttmPrev)) * 100;
    return {
      pct: Math.abs(changePct),
      sign: changePct >= 0 ? "up" : "down",
    };
  }, [data]);

  if (data.length === 0) return null;

  // Domain do Y: do menor ao maior valor (incluindo projected)
  const values: number[] = data.map((d) => d.epsBasic);
  const yMin = values.length > 0 ? Math.min(...values, 0) : 0;
  const yMax = values.length > 0 ? Math.max(...values, 0) : 0;
  const yPad = Math.max(Math.abs(yMax - yMin) * 0.15, 0.05);

  const fmtCurrency = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-semibold text-foreground">
          Earnings per share
        </div>
      </div>

      {forecastText && (
        <p
          className={cn(
            "text-[11px] mb-3",
            forecastText.sign === "down"
              ? "text-[var(--negative)]"
              : "text-[var(--positive)]"
          )}
        >
          EPS forecast {forecastText.sign}{" "}
          {forecastText.pct.toFixed(2)}%
        </p>
      )}

      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ScatterChart
            data={data}
            margin={{ top: 24, right: 16, left: 0, bottom: 24 }}
          >
            <CartesianGrid {...packGrid} />
            <XAxis
              dataKey="index"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{
                fill: PACK.tick,
                fontSize: 10,
                fontFamily: CHART_FONT_FAMILY,
              }}
              tickFormatter={(idx: number) => {
                const row = data[idx];
                if (!row) return "";
                return formatQuarterLabel(row.endDate);
              }}
              axisLine={false}
              tickLine={false}
              height={20}
            />
            <YAxis
              dataKey="epsBasic"
              type="number"
              domain={[yMin - yPad, yMax + yPad]}
              tick={{
                fill: PACK.tick,
                fontSize: 10,
                fontFamily: CHART_FONT_FAMILY,
              }}
              tickFormatter={(v: number) => v.toFixed(2)}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <ZAxis dataKey="epsBasic" range={[40, 40]} />

            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as
                  | (QuarterPoint & {
                      epsBasic: number;
                      index: number;
                      changePct: number | null;
                      status: RowStatus;
                      isPositive: boolean;
                      isProjected: boolean;
                    })
                  | undefined;
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <p className="text-[10px] text-foreground/70 mb-1">
                      {formatQuarterLabel(d.endDate)}
                      {d.isProjected && (
                        <span className="ml-1.5 text-foreground/60">
                          (projetado)
                        </span>
                      )}
                    </p>
                    <p className="text-[13px] font-semibold tabular-nums text-foreground">
                      EPS: {fmtCurrency(d.epsBasic)}
                    </p>
                    {d.revenue != null && (
                      <p className="text-[10px] tabular-nums text-foreground/70 mt-0.5">
                        Revenue:{" "}
                        {d.revenue.toLocaleString("en-US", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        })}
                      </p>
                    )}
                    {d.changePct != null && (
                      <p className="text-[10px] tabular-nums mt-1 pt-1 border-t border-white/[0.05] text-foreground/70">
                        {d.isProjected
                          ? `${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(1)}% vs Q anterior (real)`
                          : `${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(1)}% vs Q anterior`}
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {/* Pack 04: linha de conexão entre pontos, type="linear".
                type="monotone" inventava interpolação onde não tem dado. */}
            <Line
              type="linear"
              dataKey="epsBasic"
              stroke={PACK.foreground}
              strokeWidth={1}
              strokeOpacity={0.45}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />

            {/* Pontos coloridos por status. Pack 02 aplicado aqui: real =
                fill sólido, projected = fill transparente + stroke tracejado. */}
            <Scatter
              data={data}
              dataKey="epsBasic"
              shape={(props: {
                cx?: number;
                cy?: number;
                payload?: {
                  isPositive: boolean;
                  status: RowStatus;
                  isProjected: boolean;
                };
              }) => {
                const p = props.payload;
                if (p?.isProjected) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill="rgba(0,0,0,0)"
                      stroke={PACK.muted}
                      strokeWidth={1.5}
                      strokeDasharray="3 2"
                    />
                  );
                }
                const fill =
                  p?.status === "beat"
                    ? PACK.asset
                    : p?.status === "missed"
                      ? PACK.negative
                      : PACK.foreground;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill={fill}
                    stroke="#070709"
                    strokeWidth={1.5}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Labels embaixo: seta + status + EPS value por quarter */}
      <div
        className="mt-3 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((d, idx) => (
          <div
            key={`${d.endDate}-${idx}`}
            className="flex flex-col items-center text-center"
          >
            {/* Seta */}
            <div
              className={cn(
                "flex items-center gap-0.5 text-[10px] tabular-nums",
                d.isProjected
                  ? "text-foreground/60"
                  : d.status === "beat"
                    ? "text-[var(--positive)]"
                    : d.status === "missed"
                      ? "text-[var(--negative)]"
                      : "text-foreground/70"
              )}
            >
              {d.changePct == null ? (
                <span>—</span>
              ) : d.changePct >= 0 ? (
                <ArrowUp className="h-3 w-3" strokeWidth={2.25} />
              ) : (
                <ArrowDown className="h-3 w-3" strokeWidth={2.25} />
              )}
              <span>{d.isProjected ? "proj" : d.status}</span>
            </div>
            {/* Valor */}
            <div
              className={cn(
                "mt-1 text-[13px] tabular-nums font-medium",
                d.isProjected
                  ? "text-foreground/60"
                  : "text-foreground"
              )}
            >
              {d.epsBasic.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: formata endDate (ISO "YYYY-MM-DD") pra "Q1 2024".
// Sufixo "_proj" vira "Q1 2024 · proj" pra distinguir quarter real do projected.
function formatQuarterLabel(endDate: string): string {
  if (endDate === "TTM") return "TTM";
  if (endDate.endsWith("_proj")) {
    return `${formatQuarterLabel(endDate.replace("_proj", ""))} · proj`;
  }
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}
