"use client";

/**
 * PriceEarningsDecomposition — waterfall da variação do P/L entre
 * dois anos consecutivos. Decompõe em dois efeitos:
 *
 *   Δln(P/L) = Δln(preço) − Δln(LPA)
 *
 *   Efeito preço = ln(preço_t/preço_t-1)
 *   Efeito lucro = ln(LPA_t/LPA_t-1)
 *
 * Sinal:
 *   - Δln(P/L) NEGATIVO = múltiplo caiu (barateou em valor relativo)
 *   - Δln(P/L) POSITIVO = múltiplo subiu
 *   - Efeito preço domina → barateamento GENUÍNO
 *   - Efeito lucro domina → lucro insustentável (LPA subiu mas múltiplo caiu)
 *
 * Props:
 *   years: array de { year: number, price: number | null, eps: number | null }
 *   fromYear, toYear: período de comparação (default: 2 últimos anos)
 */

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMultiple } from "@/lib/format";

type DataPoint = {
  year: number;
  price: number | null;
  eps: number | null;
};

type Props = {
  years: DataPoint[];
  loading?: boolean;
};

export function PriceEarningsDecomposition({ years, loading }: Props) {
  const sortedYears = useMemo(
    () => years.slice().sort((a, b) => a.year - b.year),
    [years],
  );

  // default: comparar os 2 últimos anos com dados válidos
  const validYears = sortedYears.filter(
    (y) => y.price != null && y.price > 0 && y.eps != null && y.eps > 0,
  );
  const defaultFrom = validYears[Math.max(0, validYears.length - 2)]?.year;
  const defaultTo = validYears[validYears.length - 1]?.year;

  const [fromYear, setFromYear] = useState<number | null>(defaultFrom ?? null);
  const [toYear, setToYear] = useState<number | null>(defaultTo ?? null);

  const data = useMemo(() => {
    if (fromYear == null || toYear == null) return null;
    const from = sortedYears.find((y) => y.year === fromYear);
    const to = sortedYears.find((y) => y.year === toYear);
    if (!from || !to) return null;
    if (from.price == null || from.eps == null || to.price == null || to.eps == null) return null;
    if (from.price <= 0 || from.eps <= 0 || to.price <= 0 || to.eps <= 0) return null;

    const plFrom = from.price / from.eps;
    const plTo = to.price / to.eps;
    const lnPLChange = Math.log(plTo / plFrom);
    const lnPriceChange = Math.log(to.price / from.price);
    const lnEPSChange = Math.log(to.eps / from.eps);

    return {
      fromYear,
      toYear,
      fromPL: plFrom,
      toPL: plTo,
      priceChange: lnPriceChange,
      epsChange: lnEPSChange,
      totalChange: lnPLChange,
      priceDominant: Math.abs(lnPriceChange) > Math.abs(lnEPSChange),
    };
  }, [sortedYears, fromYear, toYear]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101116] p-5">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (validYears.length < 2) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101116] p-5 text-center text-[12px] text-muted-foreground/85">
        Histórico insuficiente pra decompor o P/L (precisa de ≥2 anos com preço e LPA).
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[12px] uppercase tracking-[0.18em] text-foreground">
          Decomposição Δln P/L
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-muted-foreground/70">de</span>
          <select
            value={fromYear ?? ""}
            onChange={(e) => setFromYear(Number(e.target.value))}
            className="h-7 px-2 rounded bg-white/[0.04] border border-white/10 text-[12px] text-foreground focus:outline-none"
          >
            {validYears.map((y) => (
              <option key={y.year} value={y.year}>
                {y.year}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground/70">para</span>
          <select
            value={toYear ?? ""}
            onChange={(e) => setToYear(Number(e.target.value))}
            className="h-7 px-2 rounded bg-white/[0.04] border border-white/10 text-[12px] text-foreground focus:outline-none"
          >
            {validYears.map((y) => (
              <option key={y.year} value={y.year}>
                {y.year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data && (
        <>
          <div className="flex items-end justify-between gap-3 h-32 mb-3 px-2">
            {/* Barra inicial: P/L from */}
            <div className="flex flex-col items-center w-16">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mb-1">
                P/L inicial
              </div>
              <div className="bg-white/[0.08] rounded w-full" style={{ height: `${Math.max(8, Math.min(96, 96 - Math.abs(data.priceChange) * 30))}px` }} />
              <div className="text-[12px] tabular-nums mt-1.5 text-foreground">
                {formatMultiple(data.fromPL)}
              </div>
            </div>

            {/* Efeito preço */}
            <div className="flex flex-col items-center w-20">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mb-1">
                Preço
              </div>
              <div
                className="rounded w-full"
                style={{
                  background: data.priceChange >= 0
                    ? "rgba(77, 190, 149, 0.35)"
                    : "rgba(216, 79, 104, 0.35)",
                  height: `${Math.max(8, Math.abs(data.priceChange) * 40)}px`,
                }}
              />
              <div
                className="text-[12px] tabular-nums mt-1.5"
                style={{
                  color: data.priceChange >= 0 ? "var(--positive)" : "var(--negative)",
                }}
              >
                {data.priceChange >= 0 ? "+" : ""}
                {(data.priceChange * 100).toFixed(1)}%
              </div>
            </div>

            {/* Efeito lucro */}
            <div className="flex flex-col items-center w-20">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mb-1">
                LPA
              </div>
              <div
                className="rounded w-full"
                style={{
                  background: data.epsChange >= 0
                    ? "rgba(77, 190, 149, 0.35)"
                    : "rgba(216, 79, 104, 0.35)",
                  height: `${Math.max(8, Math.abs(data.epsChange) * 40)}px`,
                }}
              />
              <div
                className="text-[12px] tabular-nums mt-1.5"
                style={{
                  color: data.epsChange >= 0 ? "var(--positive)" : "var(--negative)",
                }}
              >
                {data.epsChange >= 0 ? "+" : ""}
                {(data.epsChange * 100).toFixed(1)}%
              </div>
            </div>

            {/* Igual (=) */}
            <div className="text-muted-foreground/40 text-[14px] self-center mt-6">=</div>

            {/* Barra final: P/L to */}
            <div className="flex flex-col items-center w-16">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mb-1">
                P/L final
              </div>
              <div className="bg-white/[0.08] rounded w-full" style={{ height: `${Math.max(8, Math.min(96, 96 - Math.abs(data.epsChange) * 30))}px` }} />
              <div className="text-[12px] tabular-nums mt-1.5 text-foreground">
                {formatMultiple(data.toPL)}
              </div>
            </div>
          </div>

          {/* Veredito */}
          <div className="border-t border-white/10 pt-3 px-2">
            <p className="text-[12px] text-foreground/85 leading-relaxed">
              <strong className="text-foreground">
                {data.priceDominant ? "Preço dominou" : "Lucro dominou"}.
              </strong>{" "}
              O P/L passou de {formatMultiple(data.fromPL)} para {formatMultiple(data.toPL)}{" "}
              ({data.totalChange > 0 ? "+" : ""}
              {(data.totalChange * 100).toFixed(1)}% em ln).{" "}
              {data.priceDominant
                ? "Variação veio do preço — leitura direta de mercado."
                : "Variação veio do lucro — pode ser normalização de pico ou deterioração."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
