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
  // baseValue = primeiro ponto do dia (= "open" intraday do portfolio).
  // Gradient é desenhado entre a linha e esse valor, então a área verde/vermelha
  // reflete a VARIAÇÃO INTRADAY desde a abertura, não a variação desde que
  // a carteira foi criada (que pode distorcer a escala).
  const { gradientId, lineColor, finalValue, baseValue } = useMemo(() => {
    const id = `ppc-grad-${Math.random().toString(36).slice(2, 9)}`;
    if (points.length === 0) {
      return {
        gradientId: id,
        lineColor: "var(--foreground)",
        finalValue: initialValue,
        baseValue: initialValue,
      };
    }
    const final = points[points.length - 1]!.value;
    const base = points[0]!.value;
    return {
      gradientId: id,
      lineColor: "var(--foreground)",
      finalValue: final,
      baseValue: base,
    };
  }, [points, initialValue]);

  if (points.length < 2) return null;

  const positive = finalValue >= baseValue;
  const fillColor = positive ? "var(--positive)" : "var(--negative)";
  // Build data with explicit ref so recharts plots the gradient area
  // between the line and the reference value, not the Y=0.
  const data = points.map((p) => ({ ts: p.ts, value: p.value }));

  // Sparkline escala em torno dos PONTOS, com padding generoso pra variação
  // intraday (tipicamente 0.5-2%) ficar visualmente óbvia.
  //
  // Bug que estava achatando o gráfico:
  // 1. yDomain incluía `initialValue` (custo de criação da carteira, não o
  //    open do dia) → domain se expandia dezenas de vezes o range intraday
  //    real, esmagando a variação visual.
  // 2. baseValue do <Area> = initialValue → gradient desenhado entre a
  //    linha dos candles e o initialValue (que está longe), criando uma
  //    área gigante que esmaga a linha branca no topo.
  //
  // Fix: yDomain centrado nos candles com padding; baseValue = primeiro
  // candle do dia (= open intraday). Assim o gradient reflete a
  // variação do pregão, não a variação desde a criação da carteira.
  const yDomain: [number, number] = useMemo(() => {
    if (points.length === 0) {
      const c0 = initialValue;
      return [c0 * 0.9995, c0 * 1.0005];
    }
    const values = points.map((p) => p.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const span = dataMax - dataMin;
    // Padding de 50% do span — variação intraday típica (0.5-2%) ocupa
    // ~30-60% da altura visual, ficando óbvia sem colar nas bordas.
    const pad = span > 0 ? span * 0.5 : Math.max(dataMax * 0.001, 0.01);
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

          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            baseValue={baseValue}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}