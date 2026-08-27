/**
 * lib/analytics/cape.ts — CAPE (Cyclically-Adjusted P/E).
 *
 * Inspirado no método Shiller: P/L sobre lucro médio real (deflacionado
 * por IPCA) de 10 anos. Para cíclicas (como Petrobras), o CAPE diverge
 * violentemente do P/L trailing porque o lucro corrente está no pico
 * do ciclo e a média histórica é mais baixa.
 *
 * Cálculo:
 *   - Pega lucro líquido anual dos últimos 10 anos
 *   - Deflaciona cada ano pelo IPCA acumulado até o ano corrente
 *   - CAPE = preço_atual / (lucro_real_médio_10anos / shares_outstanding)
 *
 * Se shares_outstanding não estiver disponível, usa lucro por ação
 * (LPA) deflacionado direto.
 */

type IPCAMonth = { year: string; month: string; value: number };

/**
 * IPCA acumulado entre `fromYear` e `toYear`. Calcula o fator de inflação
 * total no período (ex: 1.18 entre 2020 e 2025).
 */
function ipcaFactorBetween(
  ipca: IPCAMonth[],
  fromYear: number,
  toYear: number,
): number {
  if (fromYear === toYear) return 1;
  const sorted = ipca
    .slice()
    .sort((a, b) =>
      a.year !== b.year ? a.year.localeCompare(b.year) : a.month.localeCompare(b.month),
    );
  let factor = 1;
  for (const r of sorted) {
    const y = Number(r.year);
    if (y >= fromYear && y <= toYear && Number.isFinite(r.value)) {
      factor *= 1 + r.value / 100;
    }
  }
  return factor;
}

/**
 * Calcula o CAPE (P/L de ciclo de 10 anos, deflacionado).
 *
 * @param netIncomeByYear   - { year: number, value: number } lucro líquido anual
 * @param sharesOutstanding - número total de ações (para converter lucro em LPA)
 * @param currentPrice      - preço atual da ação
 * @param ipca              - série IPCA mensal do /api/macro/ipca
 * @param currentYear       - ano de referência pra deflacionar (default: ano corrente)
 * @param window            - janela em anos (default: 10, padrão Shiller)
 */
export function computeCAPE(args: {
  netIncomeByYear: Array<{ year: number; value: number | null }>;
  sharesOutstanding: number | null;
  currentPrice: number | null;
  ipca: IPCAMonth[];
  currentYear?: number;
  window?: number;
}): number | null {
  const {
    netIncomeByYear,
    sharesOutstanding,
    currentPrice,
    ipca,
    currentYear = new Date().getFullYear(),
    window = 10,
  } = args;

  if (currentPrice == null) return null;

  // pega os últimos N anos com lucro válido
  const validYears = netIncomeByYear
    .filter((r) => r.value != null && r.value > 0)
    .slice()
    .sort((a, b) => a.year - b.year);

  if (validYears.length < window) return null;

  const recent = validYears.slice(-window);
  const realEarnings = recent.map((r) => {
    const factor = ipcaFactorBetween(ipca, r.year, currentYear);
    return (r.value as number) / factor;
  });

  const avgRealEarnings = realEarnings.reduce((s, v) => s + v, 0) / realEarnings.length;
  if (avgRealEarnings <= 0) return null;

  // converte lucro total em LPA real
  let realEPS: number;
  if (sharesOutstanding != null && sharesOutstanding > 0) {
    realEPS = avgRealEarnings / sharesOutstanding;
  } else {
    // sem shares, trabalha com lucro total deflacionado e usa price/sales
    // como proxy — mas isso perde precisão. Retorna null nesse caso.
    return null;
  }

  if (realEPS <= 0) return null;
  return currentPrice / realEPS;
}
