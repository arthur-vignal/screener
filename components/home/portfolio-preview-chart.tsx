"use client";

/**
 * PortfolioPreviewChart — preview do último pregão do portfolio
 * (card "Carteira" da /home).
 *
 * Baseado no pack 05 (chart-pack-references): linha branca fina +
 * fill gradient verde/vermelho relativo ao valor inicial do portfolio.
 *
 * Adaptação do pack 05:
 *   - Pack original: gradient entre linha e EIXO ZERO do chart (spread).
 *   - Aqui: gradient entre linha e VALOR INICIAL do portfolio
 *     (`initialValue`), porque portfolio não tem "zero" natural —
 *     R$ 0 não é referência útil. O ref line é tracejado no initialValue.
 *
 * Visual:
 *   - Linha branca (var(--foreground)) contínua
 *   - Gradient verde se final > initial, vermelho se final < initial
 *   - Ref line tracejada no initialValue (linha d'água)
 *   - Sem eixos / labels / tooltip (preview, não análise)
 *
 * Quando há 0-1 pontos, retorna null (deixa o card esconder o chart).
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";

type Props = {
  /** Série de candles 5m do último pregão. */
  points: Array<{ ts: number; value: number }>;
  /** Valor inicial do portfolio (referência = linha d'água). */
  initialValue: number;
  height?: number;
  className?: string;
};

export function PortfolioPreviewChart({
  points,
  initialValue,
  height = 56,
  className,
}: Props): JSX.Element | null {
  const { gradientId, lineColor, finalValue } = useMemo(() => {
    const id = `ppc-grad-${Math.random().toString(36).slice(2, 9)}`;
    if (points.length === 0) {
      return { gradientId: id, lineColor: "var(--foreground)", finalValue: initialValue };
    }
    const final = points[points.length - 1]!.value;
    return {
      gradientId: id,
      lineColor: "var(--foreground)",
      finalValue: final,
    };
  }, [points, initialValue]);

  if (points.length < 2) return null;

  const positive = finalValue >= initialValue;
  const fillColor = positive ? "var(--positive)" : "var(--negative)";
  // Build data with explicit ref so recharts plots the gradient area
  // between the line and the reference value (initialValue), not the Y=0.
  const data = points.map((p) => ({ ts: p.ts, value: p.value }));

  // Sparkline escala em torno dos PONTOS, não do initialValue.
  //
  // Bug anterior: yDomain = [min(points, initialValue), max(points, initialValue)].
  // Quando initialValue vem de `portfolio.initial_value` (custo de criação,
  // não o open do dia), ele fica FORA do range intraday e o domain se expande
  // dezenas de vezes o range real dos candles — resultado: linha parece
  // reta achatada no topo/fundo porque a variação de 1% do pregao ocupa
  // 1% da altura total.
  //
  // Fix: domain = [dataMin, dataMax] dos pontos + padding generoso
  // pra acomodar a ReferenceLine (initialValue) sem achatar os dados.
  // A ReferenceLine com `ifOverflow="extendDomain"` cuida de incluir
  // a linha d'água quando ela está fora, e o padding visual é mantido
  // pelo `lo - pad, hi + pad`.
  const yDomain: [number, number] = useMemo(() => {
    if (points.length === 0) {
      const c0 = initialValue;
      return [c0 * 0.9995, c0 * 1.0005];
    }
    const values = points.map((p) => p.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const span = dataMax - dataMin;
    // Padding de 100% do span acima e abaixo dos pontos — garante que a
    // variação de 1-2% intraday fique visualmente óbvia e que a
    // ReferenceLine (initialValue) caia num lugar razoável quando
    // próxima mas não coincidente.
    const pad = span > 0 ? span * 1.0 : Math.max(dataMax * 0.005, 0.01);
    return [dataMin - pad, dataMax + pad];
  }, [points, initialValue]);

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <YAxis hide domain={yDomain} allowDataOverflow={false} />

          {/* Reference line = valor inicial (linha d'água) */}
          <ReferenceLine
            y={initialValue}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="3 4"
            strokeWidth={1}
            ifOverflow="extendDomain"
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            baseValue={initialValue}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}