"use client";

/**
 * QuarterResults — bar chart de revenue por quarter (estilo Fey TSLA).
 *
 * Layout (réplica do print Fey):
 *
 *   Quarterly revenue                          R$45.8B
 *   ┌──────────────────────────────────────────────┐
 *   │                                     █        │
 *   │                              █     █        │
 *   │   █     █                █     █     █   █  │
 *   │   █     █      █         █     █     █   █  │
 *   │ 0 █_ ___ █ ____ █ _______ █ ____ █ _ █ __ █ _│
 *   │  Q1 25  Q2 25  Q3 25    Q1 26  Q2 26        │
 *   └──────────────────────────────────────────────┘
 *
 * Packs aplicados (sessão 2026-09-03):
 * - Pack 01: gradient teal no topo das barras (PACK.asset → transparente).
 *   Cada barra tem gradient vertical que reforça visualmente o "preenchimento
 *   do valor" — Fey style.
 * - Pack 02: barras projected (status="projected") com fill VAZIO + contorno
 *   tracejado. Comunica "ainda não reportado" sem legenda cognitiva.
 *
 * Real (passado): PACK.asset verde sólido com gradient, OU PACK.negative
 *   vermelho se QoQ < 0 (Fey convention).
 * Projected (futuro): fill="none" + stroke PACK.muted tracejado.
 *
 * Dados REAIS: brapi incomeStatementHistoryQuarterly.
 * Status "missed/beat" é heurístico: EPS caiu > 5% vs Q anterior
 * = missed, subiu > 5% = beat, senão flat. Brapi não dá consenso.
 *
 * Nota: Brapi NÃO retorna estimates/sell-side consensus pra tickers BR.
 * A referência Fey mostra Reported (passado, cinza) + Estimates (futuro,
 * amarelo/laranja). Como não temos estimates, usamos:
 * - Real quarters: PACK.asset (UP QoQ) ou PACK.negative (DOWN QoQ) com gradient
 * - Projected quarters: contorno vazio com stroke PACK.muted tracejado
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { PACK, packGrid } from "@/lib/chart-pack";

export type QuarterResult = {
  /** Quarter label "Q1 2024". */
  label: string;
  /** "Actual" (passado) ou "Projected" (próximo). */
  status: "actual" | "projected";
  /** Label grande (ex: "Miss", "Beat", "Projected Q1 date"). */
  headline: string;
  /** Status heurístico: missed/beat/flat. */
  trend: "missed" | "beat" | "flat";
  /** EPS básico. */
  eps: number | null;
  /** Revenue total no quarter. */
  revenue: number | null;
  /** Variação % vs year-ago quarter (calculada). */
  yoyChangePct: number | null;
};

type Props = {
  results: QuarterResult[];
  /** Lista de quarters completa (ordenada asc) — usada pro mini chart
   *  de revenue trend. Se omitida, usa `results`. */
  quarters?: Array<{
    endDate: string;
    epsBasic: number | null;
    revenue: number | null;
  }>;
  currency: "BRL" | "USD";
  className?: string;
};

/** Formata um número grande em string curta (R$127B, R$1.5B, R$250M). */
function formatCompact(v: number, currency: "BRL" | "USD"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${symbol}${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${symbol}${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${symbol}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${symbol}${(v / 1e3).toFixed(1)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

/** Quebra label "Q1 2024" em 2 linhas: "Q1" e "25" (ano curto). */
function splitQuarterLabel(label: string): { q: string; y: string } {
  const m = label.match(/^(Q\d)\s+(\d{2,4})$/);
  if (!m) return { q: label, y: "" };
  const year = m[2];
  return { q: m[1], y: year.length === 4 ? year.slice(2) : year };
}

/** Extrai quarter + ano curto do endDate pra usar como label. */
function quarterFromEndDate(endDate: string): string {
  if (/^Q\d \d{4}$/.test(endDate)) return endDate;
  const d = new Date(endDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return endDate;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}

/** Formata número em string curta pra eixo Y (ex: 200000000000 → "200B"). */
function formatAxisValue(v: number, currency: "BRL" | "USD"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${symbol}${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${symbol}${(v / 1e9).toFixed(0)}B`;
  if (abs >= 1e6) return `${symbol}${(v / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${symbol}${(v / 1e3).toFixed(0)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

export function QuarterResults({
  results,
  quarters,
  currency,
  className,
}: Props): JSX.Element {
  const data = useMemo(() => {
    const src =
      quarters && quarters.length > 0
        ? quarters
        : results.map((r) => ({
            endDate: r.label,
            epsBasic: r.eps,
            revenue: r.revenue,
          }));

    const withRev = src
      .filter(
        (q): q is { endDate: string; epsBasic: number | null; revenue: number } =>
          q.revenue != null,
      )
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    // Filtra buracos conhecidos: brapi às vezes retorna Q4 (dez) com
    // revenue null e preenche com Q1+2+3 (linhas duplicadas somadas).
    // Mantém só quarters com revenue > 0 OU exatamente 0 (não descarta
    // prejuízo real — só negativos).
    const positives = withRev.filter((q) => q.revenue > 0);

    // Pegar o ANO FISCAL mais recente completo (4 trimestres) — antes
    // pegava slice(-5) que misturava quarters de 2 anos diferentes
    // (ex: 2025-Q2 + Q3 + Q4 + 2026-Q1), dando a impressão errada de
    // "3 Qs em vez de 4".
    //
    // Estratégia: agrupa por ano, pega o último ano com 4 quarters
    // válidos. Fallback: último ano parcial (3+) se nenhum cheio.
    const byYear = new Map<string, typeof positives>();
    for (const q of positives) {
      const year = q.endDate.slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(q);
    }

    const sortedYears = Array.from(byYear.keys()).sort().reverse();
    let last: typeof positives = [];
    for (const y of sortedYears) {
      const qs = byYear.get(y)!;
      if (qs.length === 4) {
        last = qs;
        break;
      }
      // guarda o mais recente incompleto como fallback
      if (last.length < qs.length) last = qs;
    }
    // último fallback: slice(-4) se nada bateu
    if (last.length === 0) last = positives.slice(-4);

    // Pra calcular QoQ da PRIMEIRA barra plotada, acha o último quarter
    // positivo ANTERIOR ao primeiro do array `last`. Isso dá uma cor
    // correta mesmo pro Q mais antigo do grupo plotado.
    const firstEnd = last[0]?.endDate ?? "";
    const baseline =
      last.length > 0
        ? [...withRev]
            .reverse()
            .find((q) => q.endDate < firstEnd && q.revenue > 0)
        : null;

    // Map projected statuses por endDate (label) pra saber se uma barra é
    // projected (não tem endDate consistente, mas tem label do results[]).
    const projectedByLabel = new Set<string>();
    for (const r of results) {
      if (r.status === "projected") projectedByLabel.add(r.label);
    }

    return last.map((q, i, arr) => {
      // QoQ vs quarter anterior do array plotado. Se for o primeiro e
      // temos um baseline de quarters positivos antes, usa o baseline.
      let prev: { revenue: number } | null =
        i > 0 ? arr[i - 1] : baseline ?? null;
      const changePct =
        prev && prev.revenue !== 0
          ? ((q.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100
          : null;
      const label = quarterFromEndDate(q.endDate);
      return {
        index: i,
        label,
        revenue: q.revenue,
        eps: q.epsBasic,
        changePct,
        // pack 02: projected (do results[]) recebe tratamento visual
        // diferente (contorno vazio, sem fill).
        isProjected: projectedByLabel.has(label),
      };
    });
  }, [quarters, results]);

  if (data.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-[13px] text-muted-foreground/85">
          Sem dados de quarters disponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <RevenueBarChart data={data} currency={currency} />
    </div>
  );
}

/**
 * Bar chart vertical de revenue por quarter.
 *
 * Packs aplicados:
 * - Pack 01 (gradient teal no topo): cada barra real tem gradient vertical
 *   da cor (PACK.asset verde UP, PACK.negative vermelho DOWN) → transparente
 *   embaixo. <linearGradient> com id único por barra.
 * - Pack 02 (forecast vs reported): barras projected renderizam com fill="none"
 *   + stroke PACK.muted tracejado (1.5px) — visual "ainda não reportado".
 *
 * Réplica Fey TSLA:
 * - Y axis à DIREITA com 4 ticks discretos em compact
 * - Barras finas (barSize=28) com gap generoso (barCategoryGap=35%)
 * - SEM texto embaixo das colunas
 * - Grid horizontal tracejado sutil
 */
function RevenueBarChart({
  data,
  currency,
}: {
  data: Array<{
    index: number;
    label: string;
    revenue: number;
    eps: number | null;
    changePct: number | null;
    isProjected: boolean;
  }>;
  currency: "BRL" | "USD";
}): JSX.Element {
  const lastRevenue = data[data.length - 1]?.revenue ?? 0;

  return (
    <div>
      {/* Header estilo Fey: título bold + valor à direita */}
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div className="text-[16px] font-bold tracking-tight text-foreground shrink-0">
          Quarterly revenue
        </div>
        <div className="text-[12px] text-muted-foreground/70 font-semibold tabular-nums truncate">
          {formatCompact(lastRevenue, currency)}
        </div>
      </div>

      {/* Defs: gradientes por cor (pack 01). Um gradient por barra — não
          dá pra compartilhar porque o pack 01 pede cor específica por
          barra (verde UP / vermelho DOWN). */}
      <BarDefs data={data} />

      {/* Bar chart */}
      <div className="h-[220px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 8, right: 48, left: 8, bottom: 0 }}
            barCategoryGap="35%"
            barSize={28}
          >
            <CartesianGrid {...packGrid} />
            <XAxis
              dataKey="label"
              tick={({ x, y, payload }) => {
                const { q, y: yr } = splitQuarterLabel(
                  String(payload.value ?? ""),
                );
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={10}
                      textAnchor="middle"
                      fill={PACK.tick}
                      fontSize={10}
                      fontFamily="var(--font-manrope), system-ui, sans-serif"
                    >
                      {q}
                    </text>
                    {yr && (
                      <text
                        x={0}
                        y={0}
                        dy={22}
                        textAnchor="middle"
                        fill={PACK.tick}
                        fillOpacity={0.7}
                        fontSize={9}
                        fontFamily="var(--font-manrope), system-ui, sans-serif"
                      >
                        {yr}
                      </text>
                    )}
                  </g>
                );
              }}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={32}
            />
            <YAxis
              orientation="right"
              tick={{
                fill: PACK.tick,
                fontSize: 9,
                fontFamily: "var(--font-manrope), system-ui, sans-serif",
              }}
              tickFormatter={(v: number) => formatAxisValue(v, currency)}
              axisLine={false}
              tickLine={false}
              width={48}
              tickCount={4}
              allowDecimals={false}
              // Domínio com 10% headroom em cima pra não cortar a barra
              // mais alta. Começa de 0 (não de negative — sem barras
              // negativas porque filtramos revenue > 0).
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as
                  | {
                      label: string;
                      revenue: number;
                      eps: number | null;
                      changePct: number | null;
                      isProjected: boolean;
                    }
                  | undefined;
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70">
                      {d.label}
                      {d.isProjected && (
                        <span className="ml-1.5 text-[var(--muted-foreground)]">
                          (projetado)
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] font-semibold tabular-nums text-foreground">
                      {formatCompact(d.revenue, currency)}
                    </div>
                    {d.eps != null && (
                      <div className="text-[10px] tabular-nums text-foreground/70 mt-0.5">
                        EPS: {d.eps.toFixed(2)}
                      </div>
                    )}
                    {d.changePct != null && (
                      <div
                        className={cn(
                          "text-[10px] tabular-nums mt-0.5",
                          d.changePct >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]",
                        )}
                      >
                        {d.changePct >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(d.changePct).toFixed(1)}% QoQ
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="revenue"
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((d, idx) => {
                // Pack 02: projected → contorno vazio tracejado (sem fill)
                if (d.isProjected) {
                  return (
                    <Cell
                      key={`cell-${idx}`}
                      fill="rgba(0,0,0,0)"
                      stroke={PACK.muted}
                      strokeWidth={1.5}
                      strokeDasharray="3 2"
                    />
                  );
                }
                // Pack 01: gradient teal no topo fade embaixo.
                // Cor: PACK.asset verde (UP) ou PACK.negative vermelho (DOWN).
                // Sem QoQ (primeira barra) = neutro (cinza).
                const gradientId =
                  d.changePct == null
                    ? `qr-grad-neutral-${idx}`
                    : d.changePct >= 0
                      ? `qr-grad-up-${idx}`
                      : `qr-grad-down-${idx}`;
                const stopColor =
                  d.changePct == null
                    ? "rgba(255, 255, 255, 0.4)"
                    : d.changePct >= 0
                      ? PACK.asset
                      : PACK.negative;
                return (
                  <Cell
                    key={`cell-${idx}`}
                    fill={`url(#${gradientId})`}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda: regra de cor por QoQ + projected */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ background: PACK.asset }}
          />
          <span>Up QoQ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ background: PACK.negative }}
          />
          <span>Down QoQ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{
              background:
                "repeating-linear-gradient(90deg, " +
                PACK.muted +
                " 0 2px, transparent 2px 4px)",
              border: `1px solid ${PACK.muted}`,
            }}
          />
          <span>Projetado</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Defs: gradientes pra pack 01 (1 gradient por barra real).
 * Renderizado fora do BarChart pra evitar problemas de reordenação do
 * Recharts quando defs fica dentro.
 */
function BarDefs({
  data,
}: {
  data: Array<{ changePct: number | null; isProjected: boolean }>;
}): JSX.Element {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        {data.map((d, idx) => {
          if (d.isProjected) return null;
          const stopColor =
            d.changePct == null
              ? "rgba(255, 255, 255, 0.4)"
              : d.changePct >= 0
                ? PACK.asset
                : PACK.negative;
          const gradientId =
            d.changePct == null
              ? `qr-grad-neutral-${idx}`
              : d.changePct >= 0
                ? `qr-grad-up-${idx}`
                : `qr-grad-down-${idx}`;
          return (
            <linearGradient
              key={gradientId}
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={stopColor} stopOpacity={0.95} />
              <stop offset="100%" stopColor={stopColor} stopOpacity={0.18} />
            </linearGradient>
          );
        })}
      </defs>
    </svg>
  );
}
