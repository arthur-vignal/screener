"use client";

/**
 * PriceForecastChart — card de forecast de preço 6m à frente.
 *
 * Substitui o FairValueChart em /asset/[symbol] (raiz). Mostra:
 *   1. Histórico de preço (linha branca fina) até "agora"
 *   2. Triângulo verde no preço atual (as_of)
 *   3. Três cenários saindo de agora até as_of+6m:
 *      - high (P75 dos paths MC)  — otimista
 *      - base (P50 / mediana MC)  — esperado
 *      - low  (P25 dos paths MC)  — pessimista
 *   4. Banda P10-P90 sombreada (z=1.28 × 0.45) entre high e low expandida
 *
 * Cor condicional pelo direction (up=positivo, down=negativo). Token
 * `var(--positive)` / `var(--negative)`. Texto do chart é branco puro
 * (sulfur-ui-rules §13.1). Sem labels dentro da área (§13.4) — só no
 * header e legenda embaixo.
 *
 * NOVO 2026-09-08 — Monte Carlo GBM real:
 *   - σ empírica por ativo (vol realizada 252d via brapi)
 *   - P(up), VaR95, CVaR95 mostrados no header
 *   - Mini-histograma dos 1000 paths MC abaixo do chart principal
 *   - Cenários (high/base/low) derivados dos percentis MC (P75/P50/P25)
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartCard,
  ChartCardHeader,
  TimeXAxis,
  tooltipWrapperStyle,
} from "@/components/analysis/analysis-utils";
import {
  PACK,
  packGrid,
  packLineProps,
  packTooltipStyle,
} from "@/lib/chart-pack";
import { Skeleton } from "@/components/ui/skeleton";

type HistoryPoint = { date: string; close: number };

type ForecastBand = {
  low_6m_price: number;
  base_6m_price: number;
  high_6m_price: number;
  p10_price: number;
  p90_price: number;
};

type MonteCarlo = {
  paths: number[];
  prob_up: number;
  prob_double: number;
  var_95: number;
  cvar_95: number;
  sigma_annualized: number;
  sigma_6m_log: number;
  n_sims: number;
  n_days: number;
  vol_source: "brapi_1y" | "model_fallback";
};

type Forecast = {
  current_price: number;
  as_of: string;
  predicted_price_6m: number;
  predicted_pct_return: number;
  direction: "up" | "down";
  confidence: number;
  band: ForecastBand;
  /** Opcional — presente quando a API devolve MC GBM. */
  monte_carlo?: MonteCarlo;
};

type Props = {
  symbol: string;
  historicalPrices: HistoryPoint[];
  forecast: Forecast | null;
  loading?: boolean;
  /** Quando true, mostra empty state (ex: ticker fora do painel). */
  unavailable?: boolean;
  className?: string;
};

type ChartRow = {
  ts: number;
  date: string;
  historical?: number;
  high?: number;
  base?: number;
  low?: number;
  bandLow?: number;
  bandHigh?: number;
};

function ymdToTs(ymd: string): number {
  // brapi candles vêm como "YYYY-MM-DD".
  return new Date(ymd + "T00:00:00Z").getTime();
}

export function PriceForecastChart({
  symbol,
  historicalPrices,
  forecast,
  loading,
  unavailable,
  className,
}: Props): JSX.Element {
  const data = useMemo<{
    rows: ChartRow[];
    asOfTs: number;
    futureTs: number;
    color: string;
    gradientId: string;
  } | null>(() => {
    if (!forecast) return null;

    const asOfDate = forecast.as_of.slice(0, 10);
    const asOfTs = ymdToTs(asOfDate);
    const futureTs = asOfTs + 1000 * 60 * 60 * 24 * 30 * 6; // +6 meses

    // Filtra candles históricos até as_of (inclusive).
    const hist = historicalPrices
      .filter((p) => p.close > 0 && Number.isFinite(p.close))
      .map((p) => ({ ts: ymdToTs(p.date), date: p.date, close: p.close }))
      .filter((p) => p.ts <= asOfTs);

    // Linha histórica termina em as_of com close = current_price.
    const histRows: ChartRow[] = hist.map((p) => ({
      ts: p.ts,
      date: p.date,
      historical: p.close,
    }));
    if (
      histRows.length === 0 ||
      histRows[histRows.length - 1].ts !== asOfTs
    ) {
      histRows.push({
        ts: asOfTs,
        date: asOfDate,
        historical: forecast.current_price,
      });
    }

    // Forecast rows: 3 pontos por cenário (as_of → as_of+6m, dobra no
    // meio pra dar ligeira curvatura visual). Sem histórico.
    const midTs = asOfTs + (futureTs - asOfTs) / 2;
    const fRows: ChartRow[] = [
      { ts: asOfTs, date: asOfDate },
      { ts: midTs, date: "" },
      { ts: futureTs, date: "" },
    ];
    fRows[0].base = forecast.current_price;
    fRows[0].high = forecast.current_price;
    fRows[0].low = forecast.current_price;
    fRows[0].bandLow = forecast.current_price;
    fRows[0].bandHigh = forecast.current_price;

    // Pontos finais: anchor = current_price; +6m = cenário.
    // Se MC GBM disponível, cenários high/base/low vêm dos percentis P75/P50/P25
    // dos 1000 paths MC (visualização geométrica real, não aproximação lognormal).
    // Banda P10-P90 idem: P10/P90 dos paths.
    const mc = forecast.monte_carlo;
    const base6m = mc ? mc.paths[500] : forecast.band.base_6m_price;
    const high6m = mc ? mc.paths[750] : forecast.band.high_6m_price;
    const low6m = mc ? mc.paths[250] : forecast.band.low_6m_price;
    const p10_6m = mc ? mc.paths[100] : forecast.band.p10_price;
    const p90_6m = mc ? mc.paths[900] : forecast.band.p90_price;

    fRows[1].base = (forecast.current_price + base6m) / 2;
    fRows[1].high = (forecast.current_price + high6m) / 2;
    fRows[1].low = (forecast.current_price + low6m) / 2;
    fRows[1].bandLow = (forecast.current_price + p10_6m) / 2;
    fRows[1].bandHigh = (forecast.current_price + p90_6m) / 2;

    fRows[2].base = base6m;
    fRows[2].high = high6m;
    fRows[2].low = low6m;
    fRows[2].bandLow = p10_6m;
    fRows[2].bandHigh = p90_6m;

    // Junta — histórico termina em as_of, forecast começa em as_of (com
    // mesmo valor de close/current_price, garantindo continuidade visual).
    // O Recharts conecta segmentos só se houver um valor compartilhado.
    const bridge: ChartRow = {
      ts: asOfTs,
      date: asOfDate,
      historical: forecast.current_price,
      base: forecast.current_price,
      high: forecast.current_price,
      low: forecast.current_price,
      bandLow: forecast.current_price,
      bandHigh: forecast.current_price,
    };
    // Substitui o último ponto histórico (que tem as_ofTs) pela ponte
    // unificada, evitando duplicação.
    const rows: ChartRow[] = [
      ...histRows.slice(0, -1),
      bridge,
      ...fRows.slice(1),
    ];

    const color =
      forecast.direction === "up" ? PACK.asset : PACK.negative;
    const gradientId = `forecast-band-${symbol}-${forecast.direction}`;

    return { rows, asOfTs, futureTs, color, gradientId };
  }, [forecast, historicalPrices, symbol]);

  // Estados (sulfur-ui-rules §5) ───────────────────────────────────────
  if (loading) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader
          title="Price forecast"
          rightSlot={
            <span className="text-[11px] text-foreground tabular-nums">
              6m horizon
            </span>
          }
        />
        <div className="space-y-2">
          <Skeleton className="w-40 h-7" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </ChartCard>
    );
  }

  if (unavailable || !forecast || !data) {
    return (
      <ChartCard className={className}>
        <ChartCardHeader title="Price forecast" />
        <div className="py-8 text-center space-y-2">
          <p className="text-[14px] text-foreground">
            Forecast 6m ainda não disponível para {symbol}.
          </p>
          <p className="text-[12px] text-foreground">
            Roadmap inclui expansão do painel (32 blue chips B3).
          </p>
        </div>
      </ChartCard>
    );
  }

  const pctSign = forecast.predicted_pct_return >= 0 ? "+" : "−";
  const pctAbs = Math.abs(forecast.predicted_pct_return).toFixed(2);
  const colorClass =
    forecast.direction === "up"
      ? "text-[var(--positive)]"
      : "text-[var(--negative)]";
  const mc = forecast.monte_carlo;
  const probUpPct = mc ? Math.round(mc.prob_up * 100) : null;
  const sigmaAnnPct = mc ? (mc.sigma_annualized * 100).toFixed(1) : null;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Price forecast"
        rightSlot={
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-foreground tabular-nums">
              6m horizon
            </span>
            <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded bg-white/[0.06] text-foreground">
              conf {(forecast.confidence * 100).toFixed(0)}
            </span>
          </div>
        }
      />

      {/* Hero number (Calibre display no título, Inter nos labels — typography-pack).
          Texto em foreground puro (sem opacity) per §13.1. */}
      <div className="flex items-baseline gap-2 mb-3 flex-wrap">
        <span
          className={`text-[24px] font-semibold tabular-nums tracking-tight ${colorClass}`}
        >
          R$ {forecast.predicted_price_6m.toFixed(2)}
        </span>
        <span className={`text-[13px] font-semibold tabular-nums ${colorClass}`}>
          {pctSign}
          {pctAbs}% expected
        </span>
        {probUpPct != null && (
          <span
            className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded ml-1"
            style={{
              background:
                probUpPct >= 50
                  ? "color-mix(in srgb, var(--positive) 18%, transparent)"
                  : "color-mix(in srgb, var(--negative) 18%, transparent)",
              color:
                probUpPct >= 50 ? "var(--positive)" : "var(--negative)",
            }}
            title="Probabilidade de alta em 6m, via Monte Carlo GBM (1000 paths, σ empírica 252d)"
          >
            P(up) {probUpPct}%
          </span>
        )}
      </div>

      {/* Wrapper com altura CONCRETA (§15.12 — ResponsiveContainer em flex
          container aninhado mede height=0 e SVG some). */}
      <div className="h-[220px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data.rows}
            margin={{ top: 12, right: 14, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={data.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={data.color} stopOpacity={0.30} />
                <stop offset="100%" stopColor={data.color} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid {...packGrid} />
            <TimeXAxis tickFontSize={10} />
            <YAxis
              tick={{
                fill: PACK.tick,
                fontSize: 9,
                fontFamily:
                  "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
              axisLine={false}
              tickLine={false}
              width={48}
              tickCount={4}
              domain={["auto", "auto"]}
            />
            <Tooltip
              wrapperStyle={packTooltipStyle}
              cursor={{
                stroke: "rgba(255, 255, 255, 0.15)",
                strokeWidth: 1,
              }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0]?.payload as ChartRow | undefined;
                if (!p) return null;
                const hist =
                  p.historical != null
                    ? `R$ ${p.historical.toFixed(2)}`
                    : "—";
                const base =
                  p.base != null ? `R$ ${p.base.toFixed(2)}` : "—";
                const high =
                  p.high != null ? `R$ ${p.high.toFixed(2)}` : "—";
                const low =
                  p.low != null ? `R$ ${p.low.toFixed(2)}` : "—";
                const p10 =
                  p.bandLow != null
                    ? `R$ ${p.bandLow.toFixed(2)}`
                    : "—";
                const p90 =
                  p.bandHigh != null
                    ? `R$ ${p.bandHigh.toFixed(2)}`
                    : "—";
                const isFuture = p.historical == null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground mb-1 tabular-nums">
                      {isFuture
                        ? `+6m projeção`
                        : new Date(p.ts).toLocaleDateString("pt-BR")}
                    </div>
                    {isFuture ? (
                      <>
                        <div
                          className="text-[11px] tabular-nums"
                          style={{ color: data.color }}
                        >
                          base: {base}
                        </div>
                        <div
                          className="text-[11px] tabular-nums"
                          style={{ color: data.color, opacity: 0.7 }}
                        >
                          high: {high}
                        </div>
                        <div
                          className="text-[11px] tabular-nums"
                          style={{ color: data.color, opacity: 0.7 }}
                        >
                          low: {low}
                        </div>
                        <div className="text-[10px] tabular-nums text-foreground mt-1">
                          P10–P90: {p10} — {p90}
                        </div>
                      </>
                    ) : (
                      <div
                        className="text-[11px] tabular-nums"
                        style={{ color: PACK.foreground }}
                      >
                        preço: {hist}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Banda P10–P90 sombreada. ReferenceArea cobre todo o chart
                (de as_of até futureTs), mas como o bandLow/bandHigh só têm
                valor no segmento forecast, a área só pinta no lado direito
                da ponte. connectNulls=true garante que a banda saia do
                preço atual (as_of) sem gap. */}
            <Area
              type="monotone"
              dataKey="bandHigh"
              stroke="none"
              fill={`url(#${data.gradientId})`}
              fillOpacity={1}
              isAnimationActive={false}
              connectNulls
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="bandLow"
              stroke="none"
              fill={PACK.tooltipBg}
              fillOpacity={1}
              isAnimationActive={false}
              connectNulls
              legendType="none"
            />

            {/* Linha histórica (branco fino). */}
            <Line
              dataKey="historical"
              {...packLineProps({
                stroke: PACK.foreground,
                strokeWidth: 1.5,
                lineType: "monotone",
              })}
              dot={false}
              connectNulls
            />

            {/* Cenário high (otimista) — sólido, mesma espessura do histórico. */}
            <Line
              dataKey="high"
              {...packLineProps({
                stroke: data.color,
                strokeWidth: 1.5,
                strokeOpacity: 0.55,
                dashed: false,
                lineType: "monotone",
              })}
              dot={false}
              connectNulls
            />

            {/* Cenário low (pessimista) — sólido, mesma espessura do histórico. */}
            <Line
              dataKey="low"
              {...packLineProps({
                stroke: data.color,
                strokeWidth: 1.5,
                strokeOpacity: 0.55,
                dashed: false,
                lineType: "monotone",
              })}
              dot={false}
              connectNulls
            />

            {/* Cenário base — sólido, levemente mais grosso, mesma cor. */}
            <Line
              dataKey="base"
              {...packLineProps({
                stroke: data.color,
                strokeWidth: 2,
                strokeOpacity: 0.85,
                dashed: false,
                lineType: "monotone",
              })}
              dot={false}
              connectNulls
            />

            {/* Marcador do preço atual (triângulo via ReferenceDot). */}
            <ReferenceDot
              x={data.asOfTs}
              y={forecast.current_price}
              r={5}
              fill={data.color}
              stroke={PACK.tooltipBg}
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />

            {/* Linha vertical tracejada marcando o "agora". */}
            <ReferenceLine
              x={data.asOfTs}
              stroke={data.color}
              strokeWidth={1}
              strokeDasharray="2 3"
              strokeOpacity={0.5}
              ifOverflow="extendDomain"
            />
            {/* Linha horizontal no cenário base (+6m). */}
            <ReferenceLine
              y={forecast.band.base_6m_price}
              stroke={data.color}
              strokeWidth={1}
              strokeDasharray="2 4"
              strokeOpacity={0.30}
              ifOverflow="extendDomain"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda (sem ícones redundantes — cor + texto bastam). */}
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.foreground }}
          />
          <span>histórico</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block"
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderBottom: `7px solid ${data.color}`,
            }}
          />
          <span>preço atual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background: `repeating-linear-gradient(90deg, ${data.color} 0 4px, transparent 4px 7px)`,
            }}
          />
          <span>base</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{
              background: `repeating-linear-gradient(90deg, ${data.color} 0 3px, transparent 3px 6px)`,
              opacity: 0.65,
            }}
          />
          <span>high / low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-2 rounded-sm"
            style={{
              background: data.color,
              opacity: 0.25,
            }}
          />
          <span>banda P10–P90</span>
        </div>
      </div>

      {/* Info row σ empírica + VaR95 (NOVO — MC GBM real). */}
      {mc && (
        <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground flex-wrap">
          <span className="tabular-nums">
            <span className="text-foreground/70">σ empírica:</span>{" "}
            <span className="font-semibold">{sigmaAnnPct}% aa</span>
          </span>
          <span className="text-foreground/30">|</span>
          <span className="tabular-nums">
            <span className="text-foreground/70">VaR95:</span>{" "}
            <span className="font-semibold">
              R$ {mc.var_95.toFixed(2)}
            </span>
          </span>
          {mc.cvar_95 > 0 && (
            <span className="tabular-nums">
              <span className="text-foreground/70">CVaR95:</span>{" "}
              <span className="font-semibold">
                R$ {mc.cvar_95.toFixed(2)}
              </span>
            </span>
          )}
          <span className="text-foreground/30">|</span>
          <span className="tabular-nums text-foreground/70">
            {mc.n_sims} sims · {mc.n_days}d vol
            {mc.vol_source === "model_fallback" && " · σ fallback"}
          </span>
        </div>
      )}

      {/* Mini-histograma dos 1000 paths MC — distribuição log-normal
          esperada, com cauda à direita. Cores: verde se > current_price,
          vermelho se < current_price. Linha vertical no preço atual. */}
      {mc && (
        <div className="mt-2">
          <div className="text-[9px] text-foreground/60 uppercase tracking-wider mb-1">
            Distribuição MC · preço em +6m
          </div>
          <div className="h-[80px] w-full">
            <ResponsiveContainer>
              <BarChart
                data={buildHistogramRows(mc, forecast.current_price)}
                margin={{ top: 4, right: 14, left: 0, bottom: 0 }}
                barCategoryGap={1}
              >
                <XAxis
                  dataKey="x"
                  tick={{ fill: PACK.tick, fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                  minTickGap={50}
                />
                <YAxis hide />
                <Tooltip
                  wrapperStyle={packTooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload as HistogramRow | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                        <div className="text-[10px] tabular-nums text-foreground mb-0.5">
                          R$ {p.xMin.toFixed(2)} — R$ {p.xMax.toFixed(2)}
                        </div>
                        <div className="text-[11px] tabular-nums text-foreground">
                          {p.count} paths ({((p.count / mc.n_sims) * 100).toFixed(1)}%)
                        </div>
                        {p.xMin < forecast.current_price && p.xMax > forecast.current_price && (
                          <div className="text-[9px] text-foreground/70 mt-0.5">
                            cruza preço atual
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" isAnimationActive={false}>
                  {buildHistogramRows(mc, forecast.current_price).map(
                    (row, i) => (
                      <Cell
                        key={i}
                        fill={
                          row.xMax <= forecast.current_price
                            ? PACK.negative
                            : row.xMin >= forecast.current_price
                              ? PACK.asset
                              : "color-mix(in srgb, var(--positive) 50%, var(--negative) 50%)"
                        }
                        fillOpacity={0.75}
                      />
                    ),
                  )}
                </Bar>
                <ReferenceLine
                  x={Math.round(forecast.current_price)}
                  stroke={PACK.foreground}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-3 text-[10px] text-foreground leading-relaxed">
        Previsão probabilística baseada em backtest histórico. Não é
        recomendação de investimento. Modelo v9 (regime_specialist_xs,
        painel 32 blue chips B3).
      </p>
    </ChartCard>
  );
}

/** Histograma de paths MC — 30 bins do min ao max. */
type HistogramRow = {
  x: number;
  xMin: number;
  xMax: number;
  count: number;
};

function buildHistogramRows(mc: MonteCarlo, _currentPrice: number): HistogramRow[] {
  const paths = mc.paths;
  if (paths.length === 0) return [];
  const min = paths[0];
  const max = paths[paths.length - 1];
  const nBins = 30;
  const binWidth = (max - min) / nBins;
  if (binWidth <= 0) return [];
  const counts = new Array<number>(nBins).fill(0);
  for (const p of paths) {
    let idx = Math.floor((p - min) / binWidth);
    if (idx >= nBins) idx = nBins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  return counts.map((c, i) => {
    const xMin = min + i * binWidth;
    const xMax = xMin + binWidth;
    return { x: Math.round((xMin + xMax) / 2), xMin, xMax, count: c };
  });
}

