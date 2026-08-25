"use client";

/**
 * ValueAddedDonut — F4-1.
 *
 * Hand-rolled SVG donut chart showing the distribution of value
 * added across 4 stakeholders (from DVA — the Brazilian accounting
 * statement most platforms ignore):
 *   - Governo     (taxes)
 *   - Empregados  (teamRemuneration)
 *   - Financiadores (remunerationOfThirdPartyCapitals — interest)
 *   - Acionistas (dividends + interestOnOwnEquity + retainedEarnings)
 *
 * Each slice uses an arc on a single SVG <path>. Hover changes
 * stroke width for emphasis.
 */

import { useState } from "react";

type Slice = {
  label: string;
  value: number;
  color: string;
};

const COLORS: Record<string, string> = {
  governo: "#ef4444",
  empregados: "#06b6d4",
  financiadores: "#f59e0b",
  acionistas: "#10b981",
};

export function ValueAddedDonut({
  data,
  year,
}: {
  data: { teamRemuneration: number; taxes: number; thirdPartyCapitals: number; shareholders: number } | null;
  year: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        Sem dados de DVA disponíveis.
      </div>
    );
  }

  const total =
    data.taxes + data.teamRemuneration + data.thirdPartyCapitals + data.shareholders;
  if (total <= 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-5 py-8 text-center text-[12px] text-muted-foreground/60">
        DVA zerada para {year}.
      </div>
    );
  }

  const slices: Slice[] = [
    { label: "governo", value: data.taxes, color: COLORS.governo },
    { label: "empregados", value: data.teamRemuneration, color: COLORS.empregados },
    { label: "financiadores", value: data.thirdPartyCapitals, color: COLORS.financiadores },
    { label: "acionistas", value: data.shareholders, color: COLORS.acionistas },
  ];

  const cx = 150;
  const cy = 150;
  const rOuter = 110;
  const rInner = 70;

  let cumulative = 0;
  const arcs = slices.map((s) => {
    const start = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += s.value;
    const end = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    return { ...s, start, end, path: describeArc(cx, cy, rOuter, rInner, start, end) };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 320 320" className="w-full max-w-[320px]">
        {arcs.map((a) => (
          <path
            key={a.label}
            d={a.path}
            fill={a.color}
            stroke={active === a.label ? "#ffffff" : "transparent"}
            strokeWidth={active === a.label ? 2 : 0}
            fillOpacity={active && active !== a.label ? 0.45 : 0.85}
            style={{ cursor: "pointer", transition: "fill-opacity 200ms ease" }}
            onMouseEnter={() => setActive(a.label)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
        {/* Center label */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={20}
          style={{ fontWeight: 600 }}
        >
          {compactBRL(total)}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-muted-foreground/60"
          fontSize={10}
          style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}
        >
          DVA · {year}
        </text>
      </svg>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-[480px]">
        {arcs.map((a) => {
          const pct = (a.value / total) * 100;
          return (
            <div
              key={a.label}
              className="rounded-lg border border-border/60 bg-foreground/[0.02] px-3 py-2"
              onMouseEnter={() => setActive(a.label)}
              onMouseLeave={() => setActive(null)}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: a.color }}
                />
                <p className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {a.label}
                </p>
              </div>
              <p className="mt-1.5 text-[14px] font-semibold tabular-nums">
                {pct.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                {compactBRL(a.value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(endAngle);
  const y2 = cy + rOuter * Math.sin(endAngle);
  const x3 = cx + rInner * Math.cos(endAngle);
  const y3 = cy + rInner * Math.sin(endAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

function compactBRL(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}R$ ${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
}