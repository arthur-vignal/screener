"use client";

/**
 * Sparkline — SVG inline minimalista pra preview de variação.
 *
 * Não usa Recharts (peso desnecessário num widget de 120×48px).
 * Recebe uma série de números e desenha um path único com fill
 * gradient opcional embaixo.
 *
 * Auto-escala Y entre min/max da série (padding 8% pra linha não
 * tocar nas bordas). Cor e fill são configuráveis.
 */

import { useId, useMemo } from "react";
import type { JSX } from "react";

type Props = {
  /** Série de pontos (Y values). Mínimo 2. */
  points: number[];
  /** Stroke da linha. Default: var(--foreground). */
  stroke?: string;
  /** Fill gradient embaixo da linha. Se omitido, sem fill. */
  fill?: string;
  /** Largura. Default: 100% (responsivo, usa viewBox). */
  width?: number | string;
  /** Altura. Default: 48. */
  height?: number;
  /** Espessura do stroke. Default: 1.5. */
  strokeWidth?: number;
  /** Tipo de linha (default: monotone smooth). */
  type?: "linear" | "monotone";
  className?: string;
  ariaLabel?: string;
};

export function Sparkline({
  points,
  stroke = "currentColor",
  fill,
  height = 48,
  strokeWidth = 1.5,
  type = "monotone",
  className,
  ariaLabel,
}: Props): JSX.Element | null {
  const gradId = useId().replace(/:/g, "");

  const { pathD, areaD, width } = useMemo(() => {
    if (points.length < 2) return { pathD: "", areaD: "", width: 100 };
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 100;
    const h = 100;
    const padTop = 8;
    const padBot = 8;
    const usable = h - padTop - padBot;
    const step = w / (points.length - 1);

    const coords = points.map((v, i) => {
      const x = i * step;
      // Se range=0 (todos iguais), centraliza no meio
      const y =
        max === min ? h / 2 : padTop + ((max - v) / range) * usable;
      return [x, y] as const;
    });

    let path: string;
    if (type === "linear") {
      path = coords
        .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
        .join(" ");
    } else {
      // Catmull-Rom → cubic bezier (recharts monotone style simplificado)
      path = coords
        .map(([x, y], i) => {
          if (i === 0) return `M${x.toFixed(2)},${y.toFixed(2)}`;
          const prev = coords[i - 1]!;
          const cx1 = prev[0] + (x - prev[0]) / 3;
          const cx2 = x - (x - prev[0]) / 3;
          return `C${cx1.toFixed(2)},${prev[1].toFixed(2)} ${cx2.toFixed(2)},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");
    }

    const area = `${path} L${w},${h} L0,${h} Z`;

    return { pathD: path, areaD: area, width: w };
  }, [points, type]);

  if (points.length < 2) return null;

  return (
    <svg
      viewBox={`0 0 ${width} 100`}
      preserveAspectRatio="none"
      height={height}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={className}
      style={{ display: "block", width: "100%" }}
    >
      {fill && (
        <>
          <defs>
            <linearGradient
              id={`spark-grad-${gradId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={fill} stopOpacity="0.32" />
              <stop offset="100%" stopColor={fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#spark-grad-${gradId})`} />
        </>
      )}
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}