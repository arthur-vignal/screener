import type { BrapiCashflowPeriod } from "@/lib/brapi";
import type { EarningsYieldHistoryPoint } from "@/lib/analytics/earnings-yield-history";

/**
 * Calcula três yields trimestrais: earnings yield, FCF yield, dividend
 * yield (B3 da spec 2026-08-29).
 *
 *   earnings_yield[t] = eps_ltm / preço  (= 1/trailingPE — já no helper)
 *   fcf_yield[t]      = (fco_ltm - capex_ltm) / market_cap
 *   dividend_yield[t] = proventos 12m / preço
 *
 * Importante: a série `earningsYieldHistory` já existe (1/trailingPE por
 * quarter). Aqui só adicionamos os outros dois.
 *
 * DY via histórico de dividendos da brapi (`/dividends?symbols=X`) tem
 * `cashDividends[]` array com `paymentDate` + `rate`. Fallback: usar
 * `dividendYield` (TTM) do brapi `quote` replicado por quarter (mesmo
 * valor pra todos os pontos) se histórico não estiver disponível.
 */

export type YieldPoint = {
  endDate: string;
  earningsYield: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
};

export type YieldSummary = {
  earningsYield: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  /** Gap médio EY - FCFY últimos 8 quarters (pp). Positivo = lucro contábil > caixa real. */
  earningsFcfGapAvg: number | null;
};

type CashDividend = {
  paymentDate: string;
  rate: number;
  label?: string;
};

const QUARTERS_LTM = 4;

function num(rec: Record<string, unknown>, key: string): number | null {
  const v = rec[key];
  return v != null && Number.isFinite(v) ? (v as number) : null;
}

/**
 * Soma dividendos pagos nos últimos 12 meses anteriores a `endDate`.
 * Brapi retorna `rate` em fração (0.05 = 5%); retorna fração (multiplica
 * por 100 pra %).
 */
function sumDividends12M(
  dividends: CashDividend[],
  endDate: string,
): number | null {
  const end = new Date(endDate + "T00:00:00Z");
  const cutoff = new Date(end);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
  let sum = 0;
  let found = false;
  for (const d of dividends) {
    if (!d.paymentDate || d.rate == null) continue;
    const pay = new Date(d.paymentDate);
    if (pay >= cutoff && pay <= end) {
      sum += d.rate;
      found = true;
    }
  }
  return found ? sum * 100 : null; // retorna em %
}

/**
 * Soma free cash flow LTM: soma 4 quarters de (operatingCashFlow -
 * capitalExpenditures). Se capex null, usa só operating cash flow.
 */
function sumFCFLTM(
  cashflow: BrapiCashflowPeriod[],
  fromIndex: number,
): number | null {
  let sum = 0;
  let count = 0;
  for (let i = fromIndex; i >= 0 && count < QUARTERS_LTM; i--, count++) {
    const ocf = num(cashflow[i] as Record<string, unknown>, "operatingCashFlow");
    const capex = num(cashflow[i] as Record<string, unknown>, "capitalExpenditures");
    if (ocf == null) return null;
    // capex é negativo na brapi (saída); somamos ocf - capex (capex subtrai)
    sum += ocf - (capex ?? 0);
  }
  return count === QUARTERS_LTM ? sum : null;
}

export function computeYieldComparison(
  earningsYieldHistory: EarningsYieldHistoryPoint[],
  cashflow: BrapiCashflowPeriod[],
  marketCap: number | null,
  dividends: CashDividend[] | null,
  currentPrice: number | null,
): { series: YieldPoint[]; summary: YieldSummary } {
  if (earningsYieldHistory.length === 0) {
    return {
      series: [],
      summary: {
        earningsYield: null,
        fcfYield: null,
        dividendYield: null,
        earningsFcfGapAvg: null,
      },
    };
  }

  const sortedCF = [...cashflow].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );
  const sortedEarnings = [...earningsYieldHistory].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );

  const series: YieldPoint[] = [];
  for (let i = 0; i < sortedEarnings.length; i++) {
    const e = sortedEarnings[i];
    const cf = sortedCF[i];
    if (!cf) continue;
    const ey = e.earningsYield;
    // FCF yield: usa marketCap atual (snapshot — aproximado). Spec
    // aceita essa simplificação ("market_cap" sem histórico).
    let fcfYield: number | null = null;
    if (marketCap != null && marketCap > 0 && i >= QUARTERS_LTM - 1) {
      const fcfLTMSum = sumFCFLTM(sortedCF, i);
      if (fcfLTMSum != null) {
        fcfYield = (fcfLTMSum / marketCap) * 100;
      }
    }
    // DY: proventos 12m / preço atual. Sem dados de dividendos brapi
    // no payload atual, dy fica null (endpoint /dividends existe
    // mas não foi integrado nesse fluxo — pode ser adicionado depois).
    // Mantém o cálculo pra quando dividends vier populado.
    let dy: number | null = null;
    if (currentPrice != null && currentPrice > 0 && dividends && dividends.length > 0) {
      const sum = sumDividends12M(dividends, e.endDate);
      if (sum != null) dy = sum / currentPrice; // já é fração, mantém em %
    }
    series.push({
      endDate: e.endDate,
      earningsYield: ey,
      fcfYield,
      dividendYield: dy,
    });
  }

  // Summary: último + gap médio EY-FCFY últimos 8T
  const last = series[series.length - 1];
  const recent = series.slice(-8);
  const gaps = recent
    .map((p) =>
      p.earningsYield != null && p.fcfYield != null
        ? p.earningsYield - p.fcfYield
        : null,
    )
    .filter((g): g is number => g != null);
  const gapAvg = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : null;

  return {
    series,
    summary: {
      earningsYield: last?.earningsYield ?? null,
      fcfYield: last?.fcfYield ?? null,
      dividendYield: last?.dividendYield ?? null,
      earningsFcfGapAvg: gapAvg,
    },
  };
}

// (EarningsYieldHistoryPoint vem de earnings-yield-history)