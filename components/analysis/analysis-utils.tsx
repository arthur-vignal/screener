"use client";

/**
 * Helpers compartilhados pelos 8 gráficos da página /analysis.
 */

import type { JSX, ReactNode } from "react";
import { XAxis } from "recharts";

import { cn } from "@/lib/utils";

/**
 * Eixo X que renderiza tempo real no eixo (não por índice).
 *
 * A3 fix (spec 2026-08-29): antes, gráficos que plotavam séries
 * trimestrais filtradas (com buracos de dado) usavam `dataKey="index"`,
 * que espaçava os pontos uniformemente — buracos viravam compressão
 * silenciosa do tempo. PETR4 tinha Q1-11, Q2-11, Q3-11, Q4-11, depois
 * pulava pra Q1-14 sem indicação visual do gap.
 *
 * Correção: `type="number"`, `scale="time"`, `domain={`[`[`dataMin", "dataMax"`,
 * `dataKey="ts"` (timestamp numérico, ms unix). Tick formatter converte
 * ms → label PT-BR.
 *
 * Caller passa `data` com `{ ..., ts: new Date(endDate).getTime() }`
 * (helper abaixo faz isso).
 */
export function TimeXAxis({
  tickFontSize = 9,
}: {
  tickFontSize?: number;
}): JSX.Element {
  return (
    <XAxis
      dataKey="ts"
      type="number"
      scale="time"
      domain={["dataMin", "dataMax"]}
      tick={{
        fill: "rgba(200, 210, 230, 0.55)",
        fontSize: tickFontSize,
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
      }}
      tickFormatter={(ts: number) => {
        if (!Number.isFinite(ts)) return "";
        const d = new Date(ts);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        });
      }}
      axisLine={false}
      tickLine={false}
      interval="preserveStartEnd"
      minTickGap={48}
    />
  );
}

/**
 * Adiciona `ts` (timestamp numérico em ms) num array de rows baseado em
 * `endDate` (string ISO `YYYY-MM-DD`). Usar antes de passar pro chart
 * que usa `<TimeXAxis>`.
 */
export function attachTimestamps<
  T extends { endDate: string },
>(rows: T[]): Array<T & { ts: number }> {
  return rows.map((r) => ({ ...r, ts: new Date(r.endDate + "T00:00:00Z").getTime() }));
}

/** Formata número grande em string curta (R$127B, R$1.5B). */
export function formatCompactCurrency(
  v: number,
  currency: "BRL" | "USD",
): string {
  const symbol = currency === "USD" ? "$" : "R$";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${symbol}${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${symbol}${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${symbol}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${symbol}${(v / 1e3).toFixed(1)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

/** Formata número genérico grande (1.2B, 500M, 250K). */
export function formatCompactNumber(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${v.toFixed(0)}`;
}

/** Converte ISO "YYYY-MM-DD" pra label "Q1 24" / "MMM/YY" (quarterly mode default). */
export function formatQuarter(endDate: string): string {
  if (/^Q\d \d{4}$/.test(endDate)) return endDate.replace(/\s\d{4}/, (m) => {
    const year = m.trim().slice(2);
    return ` '${year.slice(-2)}`;
  });
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} '${String(year).slice(-2)}`;
}

/** Header padrão pra cada card de chart (título + sub). */
export function ChartCardHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between mb-3 gap-2">
      <div>
        <div className="text-[13px] font-semibold text-foreground tracking-tight">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {rightSlot}
    </div>
  );
}

/** Wrapper de card pra cada gráfico. */
export function ChartCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Tooltip wrapper consistente pra todos os gráficos. */
export const tooltipWrapperStyle = {
  outline: "none",
} as const;
