import type { BrapiKeyStatisticsPeriod } from "@/lib/brapi";

/**
 * Calcula earnings yield histórico a partir de stats-history da brapi.
 *
 * Implementa a opção (a) da spec A1: `earningsYield[t] = 1 / trailingPE[t]`.
 *
 * Por que não opção (b) (somar 4 quarters de basicEarningsPerShare)?
 * Brapi tem DUAS definições conflitantes de EPS no payload:
 *   - `/v2/stocks/income-statement?basicEarningsPerCommonShare` = EPS por
 *     CLASSE específica (ON ou PN), em centavos. Não é normalizado por
 *     shares outstanding, então somá-lo não dá LTM válido pra valuation.
 * - `/v2/stocks/statistics?earningsPerShare` (em `mode=history`) = EPS
 *     **trimestral** (= NI / shares daquele quarter). Não é TTM.
 * - `trailingPE` (em `mode=history`) = preço / TTM-EPS interno da brapi
 *     (fórmula não exposta). É o que entra na "earnings yield" da spec.
 *
 * Outliers (>40%): reais em empresas cíclicas (PETR4 nos booms do petróleo
 * 2010-14 e 2022 teve P/L < 3, ou seja EY > 33%). Logamos pra review mas
 * NÃO mascaramos — são pontos legítimos da série.
 */
export type EarningsYieldHistoryPoint = {
  endDate: string;
  /** EPS TTM em R$ (= price / trailingPE × 100, implícito da definição da brapi). */
  epsLtm: number | null;
  /** Preço de fechamento no quarter end em R$. */
  price: number | null;
  /** trailingPE do quarter. */
  trailingPE: number | null;
  /** earnings yield em % a.a. = 1/trailingPE × 100. */
  earningsYield: number | null;
};

export function computeEarningsYieldHistory(
  statsHistory: BrapiKeyStatisticsPeriod[] | null,
): EarningsYieldHistoryPoint[] {
  if (statsHistory == null) return [];
  const out: EarningsYieldHistoryPoint[] = [];
  for (const row of statsHistory) {
    const pe =
      row.trailingPE != null && Number.isFinite(row.trailingPE) ? row.trailingPE : null;
    const price =
      row.price != null && Number.isFinite(row.price) ? row.price : null;
    if (pe == null || pe <= 0) continue;

    const earningsYield = (1 / pe) * 100;

    if (Math.abs(earningsYield) > 40) {
      console.warn(
        `[analysis] earnings yield ${earningsYield.toFixed(1)}% em ${row.endDate} (pe=${pe}, price=${price})`,
      );
    }

    out.push({
      endDate: row.endDate,
      epsLtm: pe > 0 ? price! / pe : null,
      price,
      trailingPE: pe,
      earningsYield,
    });
  }
  return out;
}