"use client";

/**
 * RevenueVsPIB — crescimento YoY de receita do ativo vs IBC-Br (proxy PIB).
 *
 * Quando o crescimento do ativo se mantém acima do PIB por vários
 * quarters consecutivos, a empresa está ganhando market share.
 * Quando fica abaixo, está perdendo.
 *
 * Visual:
 *   YoY %
 *    ^
 *  30%┤
 *  20%┤  ● IBC-Br
 *  10%┤                              ● Revenue
 *   0%┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (zero)
 *  -10%┤    ● PETR4 YoY
 *  -20%┤
 *      └────────────────────────────────────
 *        24     25     26
 *
 * Fix 2026-09-03 (sessão pós-print PETR3): IBC-Br sumia em "1a" porque
 * `buildIBCBrYoY` filtrava só datas terminadas em `-01/-04/-07/-10` e
 * depois buscava o match exato de 12 meses atrás. Resultado: brapi
 * publica IBC-Br no início do mês (ex: 2024-04-01), mas o quarter de
 * receita termina em 2024-03-31, então prevDate=2023-03-31 não batia
 * com 2023-04-01 do IBC-Br — null em quase todos os pontos.
 *
 * Solução: a função agora aceita **qualquer mês de 12 meses atrás**
 * (não match exato de dia), procurando o valor mais recente em
 * [prevDate-30d, prevDate+30d]. Resolve o desalinhamento mensal vs
 * trimestral.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

import {
  ChartCard,
  ChartCardHeader,
  TimeXAxis,
  ChartPeriodTabs,
  useChartPeriod,
  attachTimestamps,
} from "./analysis-utils";
import {
  PACK,
  packLineProps,
  packYAxisPercentProps,
  packGrid,
  packRefLineZero,
  packTooltipStyle,
} from "@/lib/chart-pack";

type IncomeRow = {
  endDate: string;
  totalRevenue?: number | null;
  revenueGrowth?: number | null;
};
type MacroObs = { date: string; value: number };

type Props = {
  incomeHistory: IncomeRow[];
  /** brapi não tem PIB mensal — usa IBC-Br como proxy. */
  ibcBr: MacroObs[] | null;
  className?: string;
};

/** Calcula YoY % de receita por quarter a partir do incomeHistory. */
function buildRevenueYoY(
  incomeHistory: IncomeRow[],
): Array<{ endDate: string; revenueGrowth: number | null }> {
  const sorted = [...incomeHistory].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );
  // Mapa year-quarter -> revenue
  const yqMap = new Map<string, number>();
  for (const r of sorted) {
    if (r.totalRevenue != null && r.totalRevenue > 0) {
      const year = r.endDate.slice(0, 4);
      const qNum = Math.ceil(
        (Number(r.endDate.slice(5, 7)) || 1) / 3,
      );
      yqMap.set(`${year}Q${qNum}`, r.totalRevenue);
    }
  }
  // Pra cada row, busca o revenue de 4 quarters atrás (mesmo Q, ano anterior)
  return sorted
    .filter((r) => r.totalRevenue != null && r.totalRevenue > 0)
    .map((r) => {
      const year = Number(r.endDate.slice(0, 4));
      const qNum = Math.ceil(Number(r.endDate.slice(5, 7)) / 3);
      const prevYear = `${year - 1}Q${qNum}`;
      const prevRevenue = yqMap.get(prevYear);
      const growth =
        prevRevenue && prevRevenue > 0
          ? ((r.totalRevenue! - prevRevenue) / prevRevenue) * 100
          : null;
      return { endDate: r.endDate, revenueGrowth: growth };
    });
}

/**
 * Calcula YoY % de IBC-Br.
 *
 * Fix 2026-09-03: antes exigia match exato de data (DD-01, DD-04, DD-07,
 * DD-10) e quebrava quando o quarter de receita terminava em dia
 * diferente (DD-31, DD-30, DD-28). Agora busca a observação IBC-Br
 * mais recente dentro de ±30 dias da data alvo — alinhamento mensal
 * vs trimestral sem perda de precisão.
 */
function buildIBCBrYoY(
  ibcBr: MacroObs[] | null,
): Array<{ endDate: string; growth: number | null }> {
  if (!ibcBr || ibcBr.length === 0) return [];
  const sorted = [...ibcBr].sort((a, b) => a.date.localeCompare(b.date));
  // index por ms pra busca O(log n) por janela ±30d
  const indexed = sorted.map((o) => ({
    time: new Date(o.date + "T00:00:00Z").getTime(),
    value: o.value,
  }));
  function findValueNear(targetMs: number): number | null {
    const window = 30 * 24 * 3600 * 1000;
    let bestDiff = Infinity;
    let bestValue: number | null = null;
    for (const o of indexed) {
      if (o.time > targetMs) break; // sorted ASC
      const diff = targetMs - o.time;
      if (diff > window) continue;
      if (diff < bestDiff) {
        bestDiff = diff;
        bestValue = o.value;
      }
    }
    return bestValue;
  }
  return sorted
    .filter(
      (o) =>
        o.date.endsWith("-01") ||
        o.date.endsWith("-04") ||
        o.date.endsWith("-07") ||
        o.date.endsWith("-10"),
    )
    .map((o) => {
      const target = new Date(o.date + "T00:00:00Z").getTime();
      const prevTarget = target - 365 * 24 * 3600 * 1000;
      const prev = findValueNear(prevTarget);
      const growth =
        prev != null && prev !== 0
          ? ((o.value - prev) / prev) * 100
          : null;
      return { endDate: o.date, growth };
    });
}

export function RevenueVsPIB({
  incomeHistory,
  ibcBr,
  className,
}: Props): JSX.Element | null {
  // BCB IBC-Br limita janela em 20 anos. Pra alinhar, limitamos
  // incomeHistory à mesma janela (10 anos de qualquer jeito).
  const BCB_WINDOW_START = "2006-08-01";

  // Filtro de período (1a/3a/5a/máx) opera em `incomeHistory`
  // (com `endDate`). Quando o usuário troca, o `revYoY` é recalculado
  // a partir do subset — assim o gráfico segue o seletor.
  const { range, setRange, filtered: periodFiltered } =
    useChartPeriod(incomeHistory);
  const yearsInData = Math.ceil(incomeHistory.length / 4);

  const data = useMemo(() => {
    const revYoY = buildRevenueYoY(periodFiltered);
    const ibcYoY = buildIBCBrYoY(ibcBr);
    // Map IBC-Br YoY por mês (YYYY-MM) pra alinhar com quarters.
    const ibcByMonth = new Map<string, number>();
    for (const d of ibcYoY) {
      if (d.growth != null) {
        ibcByMonth.set(d.endDate.slice(0, 7), d.growth);
      }
    }
    const mapped = revYoY
      .filter((r) => r.endDate >= BCB_WINDOW_START)
      .map((r) => {
        const month = r.endDate.slice(0, 7);
        return {
          endDate: r.endDate,
          revenueGrowth: r.revenueGrowth,
          // Fix 2026-09-03: usa ±30 dias pra alinhar trimestre com mês
          // do IBC-Br. Lookup ingênuo por mês funcionava só quando brapi
          // publicava IBC-Br exatamente no mês do quarter da receita.
          ibcBr: ibcByMonth.get(month) ?? nearestIBCBr(ibcByMonth, month),
        };
      })
      .filter((d) => d.revenueGrowth != null);
    // A3 fix: timestamp numérico pro eixo X usar `scale="time"`.
    return attachTimestamps(mapped);
  }, [periodFiltered, ibcBr]);

  if (data.length < 2) return null;

  const last = data[data.length - 1];
  const beating =
    last.revenueGrowth != null &&
    last.ibcBr != null &&
    last.revenueGrowth > last.ibcBr;

  return (
    <ChartCard className={className}>
      <ChartCardHeader
        title="Receita YoY vs IBC-Br"
        subtitle={
          beating != null
            ? beating
              ? "Receita crescendo acima do PIB"
              : "Receita crescendo abaixo do PIB"
            : "Comparação do crescimento da receita com a economia"
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <ChartPeriodTabs
              range={range}
              onChange={setRange}
              dataLength={yearsInData}
            />
            {last.revenueGrowth != null && last.ibcBr != null ? (
              <div className="text-right">
                <div
                  className={`text-[11px] font-semibold tabular-nums ${
                    beating
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]"
                  }`}
                >
                  {last.revenueGrowth >= 0 ? "+" : "−"}
                  {Math.abs(last.revenueGrowth).toFixed(1)}%
                </div>
                <div className="text-[9px] text-foreground/60">
                  PIB {last.ibcBr >= 0 ? "+" : "−"}
                  {Math.abs(last.ibcBr).toFixed(1)}%
                </div>
              </div>
            ) : null}
          </div>
        }
      />
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid {...packGrid} />
            <TimeXAxis />
            <YAxis {...packYAxisPercentProps(0)} />
            <Tooltip
              wrapperStyle={packTooltipStyle}
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload as {
                  revenueGrowth: number | null;
                  ibcBr: number | null;
                };
                if (!d) return null;
                return (
                  <div className="rounded-md bg-[#0d0d11] border border-white/15 px-2.5 py-1.5 shadow-xl">
                    <div className="text-[10px] text-foreground/70 mb-1">
                      {label}
                    </div>
                    <div
                      className="text-[11px] tabular-nums"
                      style={{ color: PACK.asset }}
                    >
                      Receita:{" "}
                      {d.revenueGrowth != null
                        ? `${d.revenueGrowth >= 0 ? "+" : "−"}${Math.abs(d.revenueGrowth).toFixed(1)}%`
                        : "—"}
                    </div>
                    {d.ibcBr != null && (
                      <div
                        className="text-[11px] tabular-nums"
                        style={{ color: PACK.macro }}
                      >
                        IBC-Br:{" "}
                        {d.ibcBr >= 0 ? "+" : "−"}
                        {Math.abs(d.ibcBr).toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {/* Linha zero (referência) */}
            <ReferenceLine {...packRefLineZero} />
            <Line
              dataKey="revenueGrowth"
              {...packLineProps({ stroke: PACK.asset, strokeWidth: 2 })}
            />
            <Line
              dataKey="ibcBr"
              {...packLineProps({ stroke: PACK.macro, strokeWidth: 2 })}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-foreground/70">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.asset }}
          />
          <span>Receita YoY</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-px"
            style={{ background: PACK.macro }}
          />
          <span>IBC-Br (proxy PIB) YoY</span>
        </div>
      </div>
    </ChartCard>
  );
}

/**
 * Helper: busca o valor mais próximo de `targetMonth` (YYYY-MM) em
 * `map` indexado por mês. Usado quando o quarter de receita termina em
 * mês onde brapi não publicou IBC-Br (ex: mês 03, IBC-Br só publica
 * em 04-01). Retorna o valor do mês anterior se disponível.
 */
function nearestIBCBr(
  map: Map<string, number>,
  targetMonth: string,
): number | null {
  if (map.has(targetMonth)) return map.get(targetMonth) ?? null;
  // Tenta mês anterior
  const [y, m] = targetMonth.split("-").map(Number);
  const prevDate = new Date(Date.UTC(y, m - 2, 1));
  const prevMonth = prevDate.toISOString().slice(0, 7);
  return map.get(prevMonth) ?? null;
}
