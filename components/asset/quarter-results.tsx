"use client";

/**
 * QuarterResults — bar chart de revenue por ANO, com 4 colunas por ano
 * (uma por trimestre).
 *
 * Layout:
 *
 *   Quarterly revenue                                 2026
 *   ┌─────────────────────────────────────────────┐
 *   │                              ░░ ▓▓           │
 *   │                         ░░ ▓▓ ░░ ▓▓  ░░ ▓▓   │
 *   │                    ░░ ▓▓ ░░ ▓▓ ░░ ▓▓  ░░ ▓▓   │
 *   │               ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓  ░░ ▓▓  │
 *   │          ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓  ░░ ▓▓│
 *   │      ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓  ░░ ▓│
 *   │      2023       2024       2025       2026  │
 *   └─────────────────────────────────────────────┘
 *      ░░ = Q1 (branco)   ▓▓ = Q2 (laranja)
 *      ░░ = Q3 (branco)   ▓▓ = Q4 (laranja)
 *
 * Cores por quarter dentro do grupo (regra Arthur 2026-09-03):
 *   - Q1 = branco  (PACK.foreground)
 *   - Q2 = laranja (PACK.peer = amber #f5a623)
 *   - Q3 = branco
 *   - Q4 = laranja
 *
 * Packs aplicados:
 * - Pack 01 (gradient teal no topo): cada barra real tem gradient vertical
 *   da cor cheia (branco ou laranja) → transparente. Fade dá sensação de
 *   "preenchimento" do valor sem competir com vizinhos do mesmo grupo.
 * - Pack 02 (forecast vs reported): barra projected com fill="rgba(0,0,0,0)"
 *   + stroke PACK.muted tracejado (3 2). Mantida no novo shape de 4 anos —
 *   projected vai pra Q1 do ano mais recente (próximo quarter projetado).
 *
 * IMPORTANTE (fix 2026-09-03 print PETR4): os <linearGradient> PRECISAM
 * ficar dentro do <BarChart> (não num SVG invisível separado). Recharts
 * procura os gradients pelo `id` no contexto do SVG em que está renderizando
 * — defs externo = url(#qr-...) falha = fallback preto (todas as barras
 * saíam pretas no primeiro deploy).
 *
 * Dados REAIS: brapi incomeStatementHistoryQuarterly.
 * Brapi NÃO retorna estimates/sell-side consensus pra tickers BR.
 * Status heurístico: EPS caiu > 5% vs Q anterior = missed, subiu > 5% = beat.
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
  /** Lista de quarters completa (ordenada asc) — usada pra popular
   *  o chart de revenue trend. Se omitida, usa `results`. */
  quarters?: Array<{
    endDate: string;
    epsBasic: number | null;
    revenue: number | null;
  }>;
  currency: "BRL" | "USD";
  /** Quantos anos mostrar (default 4). */
  yearCount?: number;
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

/** Extrai ano (YYYY) e número do quarter (1-4) do endDate. */
function yearQuarterFromEndDate(endDate: string): { year: string; q: 1 | 2 | 3 | 4 } | null {
  const m = /^(\d{4})-(\d{2})-/.exec(endDate);
  if (!m) return null;
  const month = parseInt(m[2], 10);
  if (!Number.isFinite(month)) return null;
  return { year: m[1], q: (Math.ceil(month / 3) as 1 | 2 | 3 | 4) };
}

// Cor por quarter dentro do grupo (regra Arthur 2026-09-03):
// Q1/Q3 = branco, Q2/Q4 = laranja (PACK.peer = amber).
// IMPORTANTE: hex strings HARDCODED aqui pra evitar o module loading
// do chart-pack.ts em runtime. No print PETR4 (2026-09-04), os
// gradients saíam pretos porque Turbopack/Next.js splitou chart-pack
// em chunks lazy, e `S.YT.foreground` ficava undefined no momento
// de render. Hardcoding garante cor mesmo se o módulo não estiver
// carregado. Cores: branco #eeeff1 (era PACK.foreground), laranja
// #f5a623 (era PACK.peer = amber).
const QUARTER_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: "#eeeff1",
  2: "#f5a623",
  3: "#eeeff1",
  4: "#f5a623",
};

type YearData = {
  year: string;
  /** Q1..Q4 revenue (null se faltando). */
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  /** Quais quarters são projected (default false). */
  q1Projected: boolean;
  q2Projected: boolean;
  q3Projected: boolean;
  q4Projected: boolean;
  /** Soma dos 4 quarters (pra header). */
  total: number;
  /** Variação YoY % vs ano anterior (computed). */
  yoyChangePct: number | null;
};

export function QuarterResults({
  results,
  quarters,
  currency,
  yearCount = 4,
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

    // Mantém só quarters com revenue > 0 (não descarta prejuízo real —
    // só negativos). Filtra buracos conhecidos: brapi às vezes retorna
    // Q4 (dez) com revenue null.
    const positives = withRev.filter((q) => q.revenue > 0);

    // Map projected statuses por endDate (label) — projected do results[]
    // é sinalizado aqui pra receber tratamento pack 02 (contorno vazio).
    const projectedByLabel = new Set<string>();
    for (const r of results) {
      if (r.status === "projected") projectedByLabel.add(r.label);
    }

    // Agrupa por ano fiscal. Cada ano pode ter até 4 quarters.
    type Bucket = { q1: number | null; q2: number | null; q3: number | null; q4: number | null };
    const byYear = new Map<string, Bucket>();
    for (const q of positives) {
      const yq = yearQuarterFromEndDate(q.endDate);
      if (!yq) continue;
      if (!byYear.has(yq.year)) byYear.set(yq.year, { q1: null, q2: null, q3: null, q4: null });
      const bucket = byYear.get(yq.year)!;
      // Se já tem valor nesse quarter, mantém o primeiro (não somar —
      // brapi às vezes duplica).
      if (bucket[`q${yq.q}` as "q1" | "q2" | "q3" | "q4"] == null) {
        bucket[`q${yq.q}` as "q1" | "q2" | "q3" | "q4"] = q.revenue;
      }
    }

    // Pega os N anos mais recentes (ordem DESC: mais recente primeiro).
    // Depois invertemos pra ASC pro chart ficar esquerda→direita
    // (2023, 2024, 2025, 2026) como Arthur pediu.
    const sortedYearsDesc = Array.from(byYear.keys())
      .sort()
      .reverse()
      .slice(0, yearCount);
    const sortedYears = [...sortedYearsDesc].reverse();
    const yearsData: YearData[] = sortedYears.map((y) => {
      const b = byYear.get(y)!;
      // Marca como projected qualquer Q que esteja em projectedByLabel
      // (label tipo "Q2 2025"). Compara com label normalizado.
      const isProj = (q: 1 | 2 | 3 | 4) => {
        const month = String(q * 3).padStart(2, "0");
        const lastDay = q === 2 ? "30" : q === 4 ? "31" : "31";
        const endDate = `${y}-${month}-${lastDay}`;
        return projectedByLabel.has(quarterLabelFromEndDate(endDate));
      };
      const total = (b.q1 ?? 0) + (b.q2 ?? 0) + (b.q3 ?? 0) + (b.q4 ?? 0);
      return {
        year: y,
        q1: b.q1,
        q2: b.q2,
        q3: b.q3,
        q4: b.q4,
        q1Projected: isProj(1),
        q2Projected: isProj(2),
        q3Projected: isProj(3),
        q4Projected: isProj(4),
        total,
        yoyChangePct: null,
      };
    });

    // Calcula YoY %: variação do total vs ano anterior.
    for (let i = 0; i < yearsData.length; i++) {
      const curr = yearsData[i];
      const prev = yearsData[i + 1];
      if (prev && prev.total > 0) {
        curr.yoyChangePct = ((curr.total - prev.total) / prev.total) * 100;
      }
    }

    return yearsData;
  }, [quarters, results, yearCount]);

  if (data.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-[13px] text-muted-foreground/85">
          Sem dados de quarters disponíveis.
        </p>
      </div>
    );
  }

  // Header valor: total do ÚLTIMO ANO FISCAL COMPLETO (com 4 quarters
  // preenchidos). Como data tá em ordem ASC (2023→2026), iteramos
  // de trás pra frente pra achar o último ano com 4 quarters.
  const lastCompleteYear = [...data]
    .reverse()
    .find((y) => y.q1 != null && y.q2 != null && y.q3 != null && y.q4 != null);
  const headerTotal = lastCompleteYear?.total ?? data[0].total;
  const headerYoY = lastCompleteYear?.yoyChangePct ?? null;

  return (
    <div className={cn("flex flex-col", className)}>
      <RevenueBarChart
        data={data}
        currency={currency}
        headerTotal={headerTotal}
        headerYoY={headerYoY}
      />
    </div>
  );
}

/** Formata endDate (YYYY-MM-DD) pra "Q1 2024" — usado pra match com projected labels. */
function quarterLabelFromEndDate(endDate: string): string {
  const yq = yearQuarterFromEndDate(endDate);
  if (!yq) return endDate;
  return `Q${yq.q} ${yq.year}`;
}

/**
 * Bar chart grouped: 4 barras (Q1-Q4) por ano (eixo X).
 *
 * IMPORTANTE (fix 2026-09-03): <defs> com os <linearGradient> ficam
 * DENTRO do <BarChart>. Recharts procura os gradients pelo `id` no
 * contexto do SVG em que está renderizando — defs externo causava
 * `url(#qr-...)` falhar e cair em fallback preto.
 *
 * Packs aplicados:
 * - Pack 01 (gradient teal no topo): gradient vertical da cor do quarter
 *   (branco Q1/Q3 ou laranja Q2/Q4) → transparente embaixo.
 * - Pack 02 (forecast vs reported): barra projected com fill="rgba(0,0,0,0)"
 *   + stroke PACK.muted tracejado (1.5px).
 */
function RevenueBarChart({
  data,
  currency,
  headerTotal,
  headerYoY,
}: {
  data: YearData[];
  currency: "BRL" | "USD";
  headerTotal: number;
  headerYoY: number | null;
}): JSX.Element {
  return (
    <div>
      {/* Header estilo Fey: título bold + total à direita */}
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div className="text-[16px] font-bold tracking-tight text-foreground shrink-0">
          Quarterly revenue
        </div>
        <div className="flex items-baseline gap-3">
          {headerYoY != null && (
            <div
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                headerYoY >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
              )}
            >
              {headerYoY >= 0 ? "+" : "−"}
              {Math.abs(headerYoY).toFixed(1)}% YoY
            </div>
          )}
          <div className="text-[12px] text-foreground/70 font-semibold tabular-nums truncate">
            {formatCompact(headerTotal, currency)}
          </div>
        </div>
      </div>

      {/* Bar chart grouped + linhas de trend por quarter */}
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 8, right: 48, left: 8, bottom: 28 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <CartesianGrid {...packGrid} />
            <XAxis
              dataKey="year"
              tick={({ x, y, payload }) => {
                const year = String(payload.value ?? "");
                const yearData = data.find((d) => d.year === year);
                // YoY = currentYear.total vs ANO ANTERIOR (data ASC).
                // data[0]=2023 (mais antigo), data[3]=2026 (mais novo).
                // Pra 2023, idx=0 → não tem anterior. Pra 2024, idx=1 → anterior=2023 (idx-1).
                const idx = data.findIndex((d) => d.year === year);
                const prevData = idx > 0 ? data[idx - 1] : null;
                const yoy =
                  yearData?.total != null && prevData?.total != null && prevData.total > 0
                    ? ((yearData.total - prevData.total) / prevData.total) * 100
                    : null;
                return (
                  <g transform={`translate(${x},${y})`}>
                    {/* Ano */}
                    <text
                      x={0}
                      y={0}
                      dy={10}
                      textAnchor="middle"
                      fill="#9ba1a8"
                      fontSize={10}
                      fontFamily="var(--font-manrope), system-ui, sans-serif"
                    >
                      {year}
                    </text>
                    {/* Chip YoY — só pra anos com ano anterior (skip 2023) */}
                    {yoy != null && idx > 0 && (
                      <g transform="translate(0, 22)">
                        <rect
                          x={-22}
                          y={0}
                          width={44}
                          height={14}
                          rx={3}
                          fill={
                            yoy >= 0
                              ? "rgba(77, 190, 149, 0.18)"
                              : "rgba(216, 79, 104, 0.18)"
                          }
                          stroke={
                            yoy >= 0
                              ? "rgba(77, 190, 149, 0.4)"
                              : "rgba(216, 79, 104, 0.4)"
                          }
                          strokeWidth={0.5}
                        />
                        <text
                          x={0}
                          y={0}
                          dy={10}
                          textAnchor="middle"
                          fill={yoy >= 0 ? "#4dbe95" : "#d84f68"}
                          fontSize={9}
                          fontWeight={600}
                          fontFamily="var(--font-manrope), system-ui, sans-serif"
                        >
                          {yoy >= 0 ? "+" : "−"}
                          {Math.abs(yoy).toFixed(1)}%
                        </text>
                      </g>
                    )}
                  </g>
                );
              }}
              axisLine={false}
              tickLine={false}
              height={44}
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
              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as YearData | undefined;
                if (!d) return null;
                const yearRevenue = (d.q1 ?? 0) + (d.q2 ?? 0) + (d.q3 ?? 0) + (d.q4 ?? 0);
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">{d.year}</div>
                    <div className="text-[12px] font-semibold tabular-nums text-foreground">
                      {formatCompact(yearRevenue, currency)}
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] space-y-0.5">
                      {([
                        { key: "q1", label: "Q1", value: d.q1, projected: d.q1Projected },
                        { key: "q2", label: "Q2", value: d.q2, projected: d.q2Projected },
                        { key: "q3", label: "Q3", value: d.q3, projected: d.q3Projected },
                        { key: "q4", label: "Q4", value: d.q4, projected: d.q4Projected },
                      ] as const).map((q) => (
                        <div
                          key={q.key}
                          className="flex items-center justify-between gap-3 text-[10px] tabular-nums"
                        >
                          <span
                            className={cn(
                              q.projected ? "text-foreground/60" : "text-foreground/85",
                            )}
                          >
                            {q.label}
                            {q.projected && (
                              <span className="ml-1 text-foreground/50">(proj)</span>
                            )}
                          </span>
                          <span className="text-foreground font-medium">
                            {q.value != null ? formatCompact(q.value, currency) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {d.yoyChangePct != null && (
                      <div
                        className={cn(
                          "mt-1.5 pt-1.5 border-t border-white/[0.06] text-[10px] tabular-nums font-semibold",
                          d.yoyChangePct >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]",
                        )}
                      >
                        {d.yoyChangePct >= 0 ? "+" : "−"}
                        {Math.abs(d.yoyChangePct).toFixed(1)}% YoY
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Pack 01: 4 Bar separadas (grouped). Cada uma tem gradient
                vertical (cor do quarter → transparente embaixo). */}
            {/* Cor sólida por quarter (sem gradient — pack 01 não funcionou
                em prod porque Turbopack splitou chart-pack em chunks
                lazy e o S.YT.foreground ficava undefined). Regra Arthur:
                Q1/Q3 branco (#eeeff1), Q2/Q4 laranja (#f5a623).
                fillOpacity 0.8 — Arthur pediu opacidade 80% (2026-09-04). */}
            <Bar
              dataKey="q1"
              fill="#eeeff1"
              fillOpacity={0.8}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((d) => (
                <BarCell
                  key={`q1-${d.year}`}
                  value={d.q1}
                  isProjected={d.q1Projected}
                  quarterColor="#eeeff1"
                />
              ))}
            </Bar>
            <Bar
              dataKey="q2"
              fill="#f5a623"
              fillOpacity={0.8}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((d) => (
                <BarCell
                  key={`q2-${d.year}`}
                  value={d.q2}
                  isProjected={d.q2Projected}
                  quarterColor="#f5a623"
                />
              ))}
            </Bar>
            <Bar
              dataKey="q3"
              fill="#eeeff1"
              fillOpacity={0.8}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((d) => (
                <BarCell
                  key={`q3-${d.year}`}
                  value={d.q3}
                  isProjected={d.q3Projected}
                  quarterColor="#eeeff1"
                />
              ))}
            </Bar>
            <Bar
              dataKey="q4"
              fill="#f5a623"
              fillOpacity={0.8}
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((d) => (
                <BarCell
                  key={`q4-${d.year}`}
                  value={d.q4}
                  isProjected={d.q4Projected}
                  quarterColor="#f5a623"
                />
              ))}
            </Bar>

          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda: branco/laranja por quarter + projected */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-foreground/70 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ background: "#eeeff1" }}
          />
          <span>Q1 / Q3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ background: "#f5a623" }}
          />
          <span>Q2 / Q4</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{
              background:
                "repeating-linear-gradient(90deg, " +
                "#9ba1a8" +
                " 0 2px, transparent 2px 4px)",
              border: `1px solid #9ba1a8`,
            }}
          />
          <span>Projetado</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Cell helper: barra real recebe gradient fill (pack 01), projected
 * recebe fill transparente + stroke tracejado (pack 02). null fica
 * com fill="transparent" pra não renderizar (espaço vazio no chart).
 */
function BarCell({
  value,
  isProjected,
  quarterColor,
}: {
  value: number | null;
  isProjected: boolean;
  /** Cor sólida da barra (Q1/Q3 = branco #eeeff1, Q2/Q4 = laranja #f5a623). */
  quarterColor: string;
}): JSX.Element {
  // null = sem dado pra esse quarter nesse ano. Não renderiza.
  if (value == null) {
    return <Cell fill="transparent" stroke="none" />;
  }
  // Pack 02: projected = contorno pontilhado (fill vazio + stroke tracejado)
  if (isProjected) {
    return (
      <Cell
        fill="rgba(0,0,0,0)"
        stroke="#9ba1a8"
        strokeWidth={1.5}
        strokeDasharray="3 2"
      />
    );
  }
  // Cor sólida do quarter (sem gradient)
  return <Cell fill={quarterColor} />;
}
