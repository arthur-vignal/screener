import type { BrapiKeyStatisticsPeriod } from "@/lib/brapi";

/**
 * Calcula bandas de múltiplo histórico (P/L, EV/EBITDA, P/VP).
 *
 * Spec B1 (2026-08-29):
 *   - Janela de 5 anos (default) ou 10 quando houver dado suficiente.
 *   - Outliers: winsorização p1/p99 (clip nos percentis 1 e 99 da
 *     janela) — diferente do A8 original que descartava P/L > 100 ou
 *     negativo. Winsorizar mantém o ponto mas protege média e sigma
 *     de pontos extremos (Lava Jato, COVID, eventos não-recorrentes).
 *   - EV/EBITDA: descartar (não winsorizar) quando EBITDA ≤ 0 —
 *     razão sem sentido.
 *   - Retorna série completa (sem winsorização aplicada) e versão
 *     clipada (pra cálculo de estatística). Caller decide.
 *
 * Output `BandStats`:
 *   - current: valor do último quarter
 *   - mean, std: média e desvio padrão da série clipada
 *   - sigma1Low/High: mean ± 1σ
 *   - sigma2Low/High: mean ± 2σ
 *   - percentile: posição relativa (0-100) do `current` na série
 *   - series: [{endDate, value}] com valor winsorizado (pra gráfico)
 *   - rawSeries: [{endDate, value}] sem winsorização (pra tooltip)
 *   - count: observações usadas na janela
 *   - reason: "insufficient" se count < 12, etc.
 */

export type BandStats = {
  current: number | null;
  mean: number | null;
  std: number | null;
  sigma1Low: number | null;
  sigma1High: number | null;
  sigma2Low: number | null;
  sigma2High: number | null;
  percentile: number | null;
  series: Array<{ endDate: string; value: number }>;
  rawSeries: Array<{ endDate: string; value: number }>;
  count: number;
  insufficient: boolean;
};

export type MultiplesBands = {
  pe: BandStats;
  evebitda: BandStats;
  pbv: BandStats;
  peMean5a: number | null; // média do P/L nos últimos 5a (B1.b fair value)
  windowYears: number;
};

const WINDOW_YEARS_DEFAULT = 5;
const WINDOW_YEARS_LONG = 10;
const MIN_OBSERVATIONS = 12;
const WINSORIZE_P_LOW = 0.01;
const WINSORIZE_P_HIGH = 0.99;

/**
 * Pega valor do array por data (mais recente).
 */
function getValueAt(
  arr: Array<{ endDate: string; [k: string]: unknown }>,
  dateStr: string,
  key: string,
): number | null {
  const row = arr.find((r) => r.endDate === dateStr);
  if (!row) return null;
  const v = row[key];
  return v != null && Number.isFinite(v) ? (v as number) : null;
}

/**
 * Winsoriza um array: substitui valores abaixo do percentil p_low pelo
 * valor de p_low, e acima de p_high pelo valor de p_high. Não remove
 * pontos (preserva a série temporal completa).
 */
function winsorize(values: number[], pLow: number, pHigh: number): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * pLow)];
  const high = sorted[Math.floor(sorted.length * pHigh) - 1];
  return values.map((v) => (v < low ? low : v > high ? high : v));
}

/**
 * Calcula mean e std de uma série (já winsorizada ou não).
 */
function meanStd(values: number[]): { mean: number; std: number } | null {
  if (values.length === 0) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Percentil (0-100) do valor na série (ordenada).
 */
function percentileOf(values: number[], value: number): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  let rank = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] <= value) rank = i + 1;
    else break;
  }
  return (rank / sorted.length) * 100;
}

function computeBand(
  rawValues: Array<{ endDate: string; value: number }>,
  filter: (v: number) => boolean,
  label: string,
): BandStats {
  const filtered = rawValues.filter((r) => filter(r.value));
  const current =
    filtered.length > 0 ? filtered[filtered.length - 1].value : null;
  const values = filtered.map((r) => r.value);
  if (values.length < MIN_OBSERVATIONS) {
    return {
      current,
      mean: null,
      std: null,
      sigma1Low: null,
      sigma1High: null,
      sigma2Low: null,
      sigma2High: null,
      percentile: current != null ? percentileOf(values, current) : null,
      series: filtered,
      rawSeries: rawValues,
      count: values.length,
      insufficient: true,
    };
  }
  const winsorized = winsorize(values, WINSORIZE_P_LOW, WINSORIZE_P_HIGH);
  const stats = meanStd(winsorized);
  if (!stats) {
    return {
      current,
      mean: null,
      std: null,
      sigma1Low: null,
      sigma1High: null,
      sigma2Low: null,
      sigma2High: null,
      percentile: current != null ? percentileOf(values, current) : null,
      series: filtered,
      rawSeries: rawValues,
      count: values.length,
      insufficient: true,
    };
  }
  // Aplica winsorização também na série plotada (mantém o ponto mas
  // clampa o valor pra não esticar o eixo Y).
  const low = [...values].sort((a, b) => a - b)[
    Math.floor(values.length * WINSORIZE_P_LOW)
  ];
  const high = [...values].sort((a, b) => a - b)[
    Math.floor(values.length * WINSORIZE_P_HIGH) - 1
  ];
  const series = filtered.map((r) => ({
    endDate: r.endDate,
    value: r.value < low ? low : r.value > high ? high : r.value,
  }));
  const percentile = current != null ? percentileOf(values, current) : null;
  return {
    current,
    mean: stats.mean,
    std: stats.std,
    sigma1Low: stats.mean - stats.std,
    sigma1High: stats.mean + stats.std,
    sigma2Low: stats.mean - 2 * stats.std,
    sigma2High: stats.mean + 2 * stats.std,
    percentile,
    series,
    rawSeries: rawValues,
    count: values.length,
    insufficient: false,
  };
}

/**
 * Calcula bandas dos 3 múltiplos (P/L, EV/EBITDA, P/VP) a partir do
 * stats-history trimestral da brapi.
 *
 * Janela: 5 anos (default). Se < 12 observações válidas após filtrar,
 * marca `insufficient: true` (não renderiza banda).
 *
 * Filtros por múltiplo:
 *   - P/L: > 0, < 100 (winsorização depois cobre o que vazar)
 *   - EV/EBITDA: > 0 (EBITDA ≤ 0 = razão sem sentido)
 *   - P/VP: > 0, < 50
 */
export function computeValuationBands(
  statsHistory: BrapiKeyStatisticsPeriod[] | null,
  windowYears: number = WINDOW_YEARS_DEFAULT,
): MultiplesBands {
  if (statsHistory == null || statsHistory.length === 0) {
    return {
      pe: emptyBand(),
      evebitda: emptyBand(),
      pbv: emptyBand(),
      peMean5a: null,
      windowYears,
    };
  }

  // Janela: pegar últimos `windowYears * 4` quarters (~windowYears anos
  // de quarters trimestrais). Fallback: se < 12 obs, expandir pra 10a.
  const sorted = [...statsHistory].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );
  const windowQuarters = windowYears * 4;
  let window = sorted.slice(-windowQuarters);
  if (window.length < MIN_OBSERVATIONS && sorted.length >= MIN_OBSERVATIONS * 2) {
    window = sorted.slice(-WINDOW_YEARS_LONG * 4);
  }

  // Extrair séries por múltiplo
  const peRows = window
    .map((r) => ({
      endDate: r.endDate,
      value:
        r.trailingPE != null && Number.isFinite(r.trailingPE)
          ? r.trailingPE
          : null,
    }))
    .filter((r): r is { endDate: string; value: number } => r.value != null);

  const evebitdaRows = window
    .map((r) => ({
      endDate: r.endDate,
      value:
        r.enterpriseToEbitda != null && Number.isFinite(r.enterpriseToEbitda)
          ? r.enterpriseToEbitda
          : null,
    }))
    .filter((r): r is { endDate: string; value: number } => r.value != null);

  const pbvRows = window
    .map((r) => ({
      endDate: r.endDate,
      value:
        r.priceToBook != null && Number.isFinite(r.priceToBook)
          ? r.priceToBook
          : null,
    }))
    .filter((r): r is { endDate: string; value: number } => r.value != null);

  const pe = computeBand(peRows, (v) => v > 0 && v < 100, "P/L");
  const evebitda = computeBand(evebitdaRows, (v) => v > 0, "EV/EBITDA");
  const pbv = computeBand(pbvRows, (v) => v > 0 && v < 50, "P/VP");

  // Média do P/L pra fair value (B1.b). Usa a média da série winsorizada
  // do P/L (excluindo a observação atual pra não contaminar).
  const peValues = pe.rawSeries
    .map((r) => r.value)
    .filter((v) => v > 0 && v < 100);
  let peMean5a: number | null = null;
  if (peValues.length >= MIN_OBSERVATIONS) {
    const w = winsorize(peValues, WINSORIZE_P_LOW, WINSORIZE_P_HIGH);
    const m = meanStd(w);
    peMean5a = m ? m.mean : null;
  }

  return {
    pe,
    evebitda,
    pbv,
    peMean5a,
    windowYears,
  };
}

function emptyBand(): BandStats {
  return {
    current: null,
    mean: null,
    std: null,
    sigma1Low: null,
    sigma1High: null,
    sigma2Low: null,
    sigma2High: null,
    percentile: null,
    series: [],
    rawSeries: [],
    count: 0,
    insufficient: true,
  };
}