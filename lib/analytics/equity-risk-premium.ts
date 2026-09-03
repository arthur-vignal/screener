import type { EarningsYieldHistoryPoint } from "./earnings-yield-history";

/**
 * Tipo dos pontos do histórico NTN-B. Brapi retorna `baseDate` (string
 * ISO YYYY-MM-DD) e `buyRate` (% a.a. real sobre IPCA).
 */
export type TreasuryHistoryPoint = {
  baseDate: string;
  buyRate: number | null;
};

/**
 * Calcula o prêmio de equity vs NTN-B longa (B5 da spec 2026-08-29).
 *
 *   premio[t] = earnings_yield[t] - taxa_real_ntnb_longa[t]
 *
 * Usa NTN-B 2045 (tesouro-ipca-15052045) — 6.8B líquido, 19.7 anos
 * de duration, mais longa listada. `buyRate` do `/treasury/indicators/
 * history` é a taxa real anual (% a.a. sobre IPCA).
 *
 * Importante (anotação na spec): earnings yield nominal contra juro
 * real só se sustenta porque o lucro tem repasse de inflação. É uma
 * aproximação defensável mas é uma aproximação — deixar explícito no
 * tooltip.
 */

export type EquityRiskPremiumPoint = {
  endDate: string;
  earningsYield: number | null;
  ntnbRate: number | null;
  /** Spread em pp. Positivo = equity paga mais que renda fixa real. */
  premium: number | null;
};

export type EquityRiskPremiumSummary = {
  premium: number | null;
  earningsYield: number | null;
  ntnbRate: number | null;
  /** Symbol da NTN-B usada (ex: "tesouro-ipca-15052045"). */
  ntnbSymbol: string;
};

/**
 * Symbol da NTN-B mais longa listada na brapi. 2045 = 19.7 anos duration.
 * Atualizado se brapi mudar a lista.
 */
export const NTNB_LONG_SYMBOL = "tesouro-ipca-15052045";

/**
 * Converte array de pontos brapi (date, buyRate) em Map<endDate, rate>.
 * buyRate é % a.a. real.
 */
function treasuryToMap(history: TreasuryHistoryPoint[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of history) {
    if (p.baseDate && p.buyRate != null && Number.isFinite(p.buyRate)) {
      m.set(p.baseDate, p.buyRate);
    }
  }
  return m;
}

/**
 * Acha a taxa NTN-B mais recente anterior a `endDate` (alinhamento
 * por data — NTN-B tem cotação diária, equity tem cotação trimestral).
 */
function nearestPriorRate(
  treasuryMap: Map<string, number>,
  endDate: string,
  maxDaysBack = 90,
): number | null {
  if (treasuryMap.size === 0) return null;
  const end = new Date(endDate + "T00:00:00Z").getTime();
  const cutoff = end - maxDaysBack * 24 * 3600 * 1000;
  let best: { date: string; rate: number } | null = null;
  let bestTime = -Infinity;
  for (const [date, rate] of treasuryMap.entries()) {
    const t = new Date(date + "T00:00:00Z").getTime();
    if (t > end || t < cutoff) continue;
    if (t > bestTime) {
      best = { date, rate };
      bestTime = t;
    }
  }
  return best?.rate ?? null;
}

export function computeEquityRiskPremium(
  earningsHistory: EarningsYieldHistoryPoint[],
  treasuryHistoryRaw: Array<Record<string, unknown>>,
  ntnbSymbol: string = NTNB_LONG_SYMBOL,
): { series: EquityRiskPremiumPoint[]; summary: EquityRiskPremiumSummary } {
  // Normaliza o shape do brapi (`baseDate` + `buyRate`) pro tipo interno.
  const treasuryHistory: TreasuryHistoryPoint[] = treasuryHistoryRaw
    .map((r) => ({
      baseDate: String(r.baseDate ?? ""),
      buyRate: r.buyRate != null && Number.isFinite(r.buyRate) ? (r.buyRate as number) : null,
    }))
    .filter((r) => r.baseDate);
  const treasuryMap = treasuryToMap(treasuryHistory);

  // Carry-forward do NTN-B: brapi /treasury/indicators/history retorna os
  // últimos ~2 anos com gaps. Sem carry-forward, o último quarter pode
  // cair fora da janela do treasuryMap e `nearestPriorRate` retorna null,
  // fazendo a linha azul sumir do chart. Aplica forward-fill por data.
  const sortedTreasuryDates = [...treasuryMap.keys()].sort();
  let lastKnown: number | null = null;
  const treasuryFilled = new Map<string, number>();
  for (const date of sortedTreasuryDates) {
    const v = treasuryMap.get(date);
    if (v != null) {
      treasuryFilled.set(date, v);
      lastKnown = v;
    } else if (lastKnown != null) {
      treasuryFilled.set(date, lastKnown);
    }
  }

  const series: EquityRiskPremiumPoint[] = [];
  for (const e of earningsHistory) {
    const ey = e.earningsYield;
    const rate = nearestPriorRate(treasuryFilled, e.endDate);
    const premium = ey != null && rate != null ? ey - rate : null;
    series.push({
      endDate: e.endDate,
      earningsYield: ey,
      ntnbRate: rate,
      premium,
    });
  }

  // Pega o ponto mais recente por endDate (input pode vir em qualquer
  // ordem — brapi costuma vir decrescente, mas stats-history vai
  // crescente). `reduce` acha o max por endDate.
  const last = series.reduce<EquityRiskPremiumPoint | null>(
    (acc, p) => {
      if (!acc) return p;
      return p.endDate > acc.endDate ? p : acc;
    },
    null,
  );
  return {
    series,
    summary: {
      premium: last?.premium ?? null,
      earningsYield: last?.earningsYield ?? null,
      ntnbRate: last?.ntnbRate ?? null,
      ntnbSymbol,
    },
  };
}