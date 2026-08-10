"use client";

/**
 * SparklineStack — three sparkline rows on real Brapi data, each
 * with ticker + price + 3-month change. Used inside the "Cotação em
 * tempo real" feature card.
 */
import { useEffect, useState } from "react";
import { getHistory } from "@/lib/brapi-history";

const SYMBOLS = ["PETR4", "VALE3", "ITUB4"];

export function SparklineStack() {
  const [series, setSeries] = useState<Record<string, number[] | null>>({});

  useEffect(() => {
    Promise.all(
      SYMBOLS.map(async (s) => {
        const h = await getHistory(s, "3mo");
        return [s, h.map((p) => p.v)] as const;
      }),
    ).then((pairs) => {
      const out: Record<string, number[] | null> = {};
      for (const [k, v] of pairs) out[k] = v;
      setSeries(out);
    });
  }, []);

  return (
    <div className="space-y-1.5">
      {SYMBOLS.map((s) => (
        <SparkRow
          key={s}
          symbol={s}
          closes={series[s] ?? null}
        />
      ))}
    </div>
  );
}

function SparkRow({
  symbol,
  closes,
}: {
  symbol: string;
  closes: number[] | null;
}) {
  if (!closes || closes.length < 2) {
    return (
      <div className="h-9 shimmer rounded-md" />
    );
  }
  const last = closes[closes.length - 1];
  const first = closes[0];
  const change = last - first;
  const pct = (change / first) * 100;
  const w = 140;
  const h = 28;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const stepX = w / (closes.length - 1);
  const path = closes
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const isUp = change >= 0;
  const color = isUp ? "#34d399" : "#f2555f";
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col min-w-0 w-[80px]">
        <span className="num text-[10.5px] text-white font-medium">
          {symbol}
        </span>
        <span className="num text-[9px] text-[#65666e]">
          R$ {last.toFixed(2)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="flex-1"
        style={{ height: `${h}px` }}
      >
        <path
          d={path}
          stroke={color}
          strokeWidth="1.2"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="num text-[10.5px] font-medium w-[48px] text-right"
        style={{ color }}
      >
        {change >= 0 ? "+" : ""}
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}