"use client";

/**
 * MacroChartCarousel — card 2 de Macro tab.
 *
 * 1 chart em view, com auto-rotação de 5s entre SELIC, IPCA, IBC-Br.
 * Setas manuais pra pular. Pausa auto-rotação quando o user interage.
 *
 * Cada chart:
 *   - SELIC: linha contínua com gradient verde/vermelho relativo a
 *     zero (pack 05). pct ao ano é sempre positivo, então o gradient
 *     fica só verde.
 *   - IPCA: idem. geralmente subindo.
 *   - IBC-Br YoY (%): idem mas série é índice; mostramos YoY% (variação
 *     anual). Pode passar de zero.
 *
 * Fonte: /api/macro/bcb?series=selic,ipca,ibcbr
 *
 * Decisão: ao invés de criar /api/macro/ipca e /api/macro/ibcbr novos,
 * reusa o /api/macro/bcb (já existe). Mas ipca não tá nele. Vou ter que
 * adicionar — feito no próximo patch.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback, useEffect, useRef, useState,
} from "react";
import type { JSX } from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type SeriesKey = "selic" | "ipca" | "ibcbr";

type Point = { date: string; value: number };

type ChartConfig = {
  key: SeriesKey;
  label: string;
  /** Suffix no eixo Y e no tooltip */
  unit: "% a.a." | "% 12m" | "índice";
  /** Negative values allowed? (false => sempre gradient verde) */
  bidirectional: boolean;
};

const CHARTS: ChartConfig[] = [
  { key: "selic",  label: "SELIC meta",   unit: "% a.a.", bidirectional: false },
  { key: "ipca",   label: "IPCA 12m",     unit: "% 12m",  bidirectional: false },
  { key: "ibcbr",  label: "IBC-Br YoY%",  unit: "% 12m",  bidirectional: true  },
];

const AUTO_ROTATE_MS = 5_000;

export function MacroChartCarousel(): JSX.Element {
  const [active, setActive] = useState(0);
  const [series, setSeries] = useState<Record<SeriesKey, Point[] | null>>({
    selic: null,
    ipca: null,
    ibcbr: null,
  });
  const userTouched = useRef(false);

  // Fetch all series once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/macro/bcb?series=selic,ipca,ibcbr", {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { series?: Record<string, Point[]> };
        if (cancelled || !data.series) return;
        setSeries({
          selic: data.series.selic ?? null,
          ipca:  data.series.ipca  ?? null,
          ibcbr: data.series.ibcbr ?? null,
        });
      } catch {
        if (!cancelled) {
          setSeries({ selic: [], ipca: [], ibcbr: [] });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-rotate (paused if user touched)
  useEffect(() => {
    if (userTouched.current) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % CHARTS.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [active]);

  const goTo = useCallback((next: number) => {
    userTouched.current = true;
    setActive(((next % CHARTS.length) + CHARTS.length) % CHARTS.length);
  }, []);

  const cfg = CHARTS[active]!;
  const data = series[cfg.key];
  const loading = data === null;

  return (
    <section
      className="rounded-2xl border border-white/5 bg-[#101116] overflow-hidden"
      aria-label={cfg.label}
    >
      <header className="flex items-baseline justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
            {cfg.label}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground/70 tabular-nums">
            Banco Central · série oficial · {cfg.unit}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {CHARTS.map((c, i) => (
            <button
              key={c.key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Mostrar ${c.label}`}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium",
                "transition-colors",
                i === active
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label.split(" ")[0]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Anterior"
            className="ml-1 p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Próximo"
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="h-[260px] w-full px-3 pb-4">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id={`fill-positive-${cfg.key}`}
                  x1="0" x2="0" y1="0" y2="1"
                >
                  <stop offset="0%" stopColor="#4dbe95" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#4dbe95" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id={`fill-negative-${cfg.key}`}
                  x1="0" x2="0" y1="0" y2="1"
                >
                  <stop offset="0%" stopColor="#d84f68" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#d84f68" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis dataKey="date" hide />
              <YAxis
                orientation="right"
                tick={{ fill: "rgba(200,210,230,0.55)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}`}
                width={48}
              />
              <Area
                type="linear"
                dataKey="value"
                stroke="#e8eaed"
                strokeWidth={1.5}
                fill={cfg.bidirectional ? "url(#fill-positive-selic)" : `url(#fill-positive-${cfg.key})`}
                isAnimationActive={true}
                animationDuration={600}
                connectNulls={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[13px] text-muted-foreground/70">
            Sem dados disponíveis.
          </div>
        )}
      </div>
    </section>
  );
}
