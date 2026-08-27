/**
 * lib/analytics/zscore.ts
 *
 * Two-axis z-score for valuation multiples (spec section 2):
 *   1. Against own history (5y mean / std).
 *   2. Against sector peers (percentile within subsector).
 *
 * The visualisation in the spec is a 2-D plane with 4 quadrants:
 *
 *   vs history
 *      caro (z>0)
 *        ┌──────────────┐
 *        │  value trap  │  candidato
 *        │  caro+econômico│  caro+caro
 *        ├──────────────┤
 *        │  bargain em  │  bargain
 *        │  tudo        │  barato+caro
 *   barato (z<0)
 *        └──────────────┘
 *                  barato (z<0)        caro (z>0)
 *                          vs peers (subsetor)
 *
 * Both inputs are null-tolerant — return null when the data isn't there.
 */

import type { BrapiKeyStatisticsHistory } from "@/lib/brapi-full";

/** Sample mean and population std. */
function meanStd(xs: Array<number>): { mu: number; sigma: number; n: number } {
  if (xs.length === 0) return { mu: 0, sigma: 0, n: 0 };
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length;
  return { mu, sigma: Math.sqrt(variance), n: xs.length };
}

export type ZScore = {
  current: number;
  mu: number;
  sigma: number;
  z: number;
  /** n samples used (excluding current year). */
  n: number;
};

/**
 * Z-score vs own history.
 * `current` is the latest value; `series` is up to 16y of historical
 * values. Computes z = (current − μ) / σ, excluding the current year
 * from μ and σ (in-sample contamination avoided).
 */
export function zScoreVsHistory(
  current: number | null,
  series: BrapiKeyStatisticsHistory[] | null | undefined,
  extract: (row: BrapiKeyStatisticsHistory) => number | null,
): ZScore | null {
  if (current == null || !series || series.length === 0) return null;

  // Exclude the most recent entry from the historical window — that's
  // the current year. Brapi's history is sorted asc by endDate, so the
  // last element is the current year.
  const dropLast = series.length > 5 ? series.slice(0, -1) : series.slice(0, -1);
  const xs = dropLast
    .map(extract)
    .filter((x): x is number => x != null && Number.isFinite(x));

  if (xs.length < 2) return null;
  const { mu, sigma, n } = meanStd(xs);
  if (sigma === 0 || !Number.isFinite(sigma)) return null;

  return { current, mu, sigma, z: (current - mu) / sigma, n };
}

export type SectorPercentile = {
  current: number;
  /** Percentile rank in subsetor, 0..1. 1 = most expensive. */
  percentile: number;
  /** Peer count used in the percentile. */
  n: number;
};

/**
 * Percentile vs subsetor peers.
 * Caller passes the current value + a list of peer values; we sort
 * and rank. Pure function — Brapi doesn't expose subsetor universe
 * directly so this expects the caller to fetch the peer universe first.
 */
export function percentileVsPeers(
  current: number | null,
  peers: Array<number | null>,
): SectorPercentile | null {
  if (current == null) return null;
  const xs = peers.filter((x): x is number => x != null && Number.isFinite(x));
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  // Number of peers with value < current, divided by total.
  let below = 0;
  for (const v of sorted) {
    if (v < current) below++;
    else break;
  }
  const percentile = below / sorted.length;
  return { current, percentile, n: sorted.length };
}

/**
 * Quadrant classifier from the 2-D z plane. Used by the UI to pick
 * the copy ("value trap" vs "candidato a reversão à média", etc.).
 */
export type Quadrant =
  | "caro-vs-historia-e-caro-vs-setor"
  | "caro-vs-historia-e-barato-vs-setor"
  | "barato-vs-historia-e-caro-vs-setor"
  | "barato-vs-historia-e-barato-vs-setor"
  | "indefinido";

export function classifyQuadrant(zHistory: number, zPeers: number): Quadrant {
  if (!Number.isFinite(zHistory) || !Number.isFinite(zPeers)) return "indefinido";
  const caroH = zHistory > 0;
  const caroP = zPeers > 0;
  if (caroH && caroP) return "caro-vs-historia-e-caro-vs-setor";
  if (caroH && !caroP) return "caro-vs-historia-e-barato-vs-setor";
  if (!caroH && caroP) return "barato-vs-historia-e-caro-vs-setor";
  return "barato-vs-historia-e-barato-vs-setor";
}

export const QUADRANT_COPY: Record<Quadrant, { title: string; body: string }> = {
  "caro-vs-historia-e-barato-vs-setor": {
    title: "Caro vs história, barato vs subsetor",
    body: "Possível value trap setorial: caro relativamente à própria média, mas barato em relação aos pares. Verifique se o subsetor inteiro está descontado por fator macro (juros, regulação).",
  },
  "barato-vs-historia-e-caro-vs-setor": {
    title: "Barato vs história, caro vs subsetor",
    body: "Candidato a reversão à média: negociando abaixo da própria média histórica enquanto o subsetor já está caro. Tese de catch-up.",
  },
  "caro-vs-historia-e-caro-vs-setor": {
    title: "Caro em ambas as dimensões",
    body: "Mercado precificando prêmio relativo em todas as métricas. Justificativa precisa vir de crescimento ou qualidade superior.",
  },
  "barato-vs-historia-e-barato-vs-setor": {
    title: "Barato em ambas as dimensões",
    body: "Desconto amplo vs história e vs subsetor. Pode ser oportunidade ou aviso de deterioração estrutural — cruzamento com qualidade é essencial.",
  },
  indefinido: {
    title: "Dados insuficientes",
    body: "Série histórica ou subsetor incompletos — z-scores não podem ser calculados.",
  },
};
