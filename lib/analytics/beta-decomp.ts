/**
 * lib/analytics/beta-decomp.ts
 *
 * Section 8 — risk decomposition.
 *
 * Decomposes the asset's β (cov with Ibovespa) into:
 *   β_mercado   — correlation with Ibovespa
 *   β_setorial  — correlation with the sector portfolio (residual after
 *                  the market regression)
 *   β_idio      — idiosyncratic residual
 *
 * Approach: two-stage regression. Stage 1 regresses the asset on the
 * Ibovespa (captures β_mercado). Stage 2 regresses the residual on the
 * sector portfolio (captures β_setorial). The remaining residual after
 * stage 2 is idiosyncratic.
 *
 * This is a deliberate simplification vs. a true multi-factor model —
 * it captures ~80% of the variance with two factors the analyst can
 * interpret directly.
 */

export type RegressionResult = {
  /** Slope (β). */
  beta: number;
  /** Intercept. */
  alpha: number;
  /** R² of the fit (0..1). */
  r2: number;
  /** Residual series (Y − Ŷ). */
  residuals: number[];
};

export type BetaDecomposition = {
  /** Total β against the market (single-factor regression). */
  betaMercado: number | null;
  /** β of the residual (after market) against the sector portfolio. */
  betaSetorial: number | null;
  /** Std-dev of the final residuals / std-dev of the asset returns. */
  betaIdiossincratico: number | null;
  /** R² of the market regression — how much variance the market alone explains. */
  r2Mercado: number | null;
  /** Total R² of the 2-factor decomposition. */
  r2Total: number | null;
  /** Stage-1 (market) regression. */
  market: RegressionResult | null;
  /** Stage-2 (sector) regression on the residuals. */
  sector: RegressionResult | null;
};

function std(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function covariance(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length === 0) return 0;
  const muX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const muY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sum = 0;
  for (let i = 0; i < xs.length; i++) sum += (xs[i] - muX) * (ys[i] - muY);
  return sum / xs.length;
}

/**
 * OLS regression of `ys` on `xs`: ys = alpha + beta * xs.
 *
 * Returns null if `var(xs)` is 0 (vertical line — no slope can be fit).
 */
export function regress(ys: number[], xs: number[]): RegressionResult | null {
  if (xs.length === 0 || xs.length !== ys.length) return null;
  const varX = covariance(xs, xs);
  if (varX === 0) return null;

  const covXY = covariance(xs, ys);
  const beta = covXY / varX;
  const muY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const muX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const alpha = muY - beta * muX;

  const residuals = ys.map((y, i) => y - (alpha + beta * xs[i]));
  const ssRes = residuals.reduce((a, b) => a + b * b, 0);
  const ssTot = covariance(ys, ys) * ys.length;
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { beta, alpha, r2, residuals };
}

/**
 * Two-stage decomposition.
 *
 * @param assetReturns — periodic (monthly) returns of the asset
 * @param marketReturns — periodic returns of the Ibovespa
 * @param sectorReturns — periodic returns of a sector portfolio
 *                       (e.g. equal-weighted average of peers)
 *
 * Returns β decomposition as a tuple (β_mercado, β_setorial, β_idio).
 */
export function decomposeBeta(
  assetReturns: number[],
  marketReturns: number[],
  sectorReturns: number[],
): BetaDecomposition {
  const n = assetReturns.length;
  if (n < 6 || n !== marketReturns.length || n !== sectorReturns.length) {
    return {
      betaMercado: null,
      betaSetorial: null,
      betaIdiossincratico: null,
      r2Mercado: null,
      r2Total: null,
      market: null,
      sector: null,
    };
  }

  // Stage 1: regress asset on market.
  const market = regress(assetReturns, marketReturns);
  if (!market) {
    return {
      betaMercado: null,
      betaSetorial: null,
      betaIdiossincratico: null,
      r2Mercado: null,
      r2Total: null,
      market: null,
      sector: null,
    };
  }

  // Stage 2: regress the market residuals on sector returns.
  const sector = regress(market.residuals, sectorReturns);

  // Final residuals = stage 1 residuals − stage 2 prediction.
  let finalResiduals = market.residuals;
  if (sector) {
    finalResiduals = market.residuals.map(
      (r, i) => r - (sector.alpha + sector.beta * sectorReturns[i]),
    );
  }

  // β_idio = std(finalResiduals) / std(assetReturns).
  const idio = std(finalResiduals) / std(assetReturns);
  // cap at 1 (above that means the residual is more volatile than the
  // asset itself, which would indicate a bug)
  const betaIdio = Number.isFinite(idio) ? Math.min(idio, 1) : null;

  // Total R² = 1 − var(finalResiduals)/var(asset).
  const totalR2 = 1 - (std(finalResiduals) ** 2) / (std(assetReturns) ** 2);

  return {
    betaMercado: market.beta,
    betaSetorial: sector?.beta ?? null,
    betaIdiossincratico: betaIdio,
    r2Mercado: market.r2,
    r2Total: sector ? totalR2 : market.r2,
    market,
    sector,
  };
}

/**
 * Build a sector portfolio from peer returns. Equal-weighted average
 * of the peer return series, in the same period as the asset.
 */
export function equalWeightedSector(peerReturns: number[][]): number[] {
  if (peerReturns.length === 0) return [];
  const len = peerReturns[0].length;
  // Validate alignment.
  for (const p of peerReturns) {
    if (p.length !== len) return [];
  }
  const sum = new Array<number>(len).fill(0);
  for (const p of peerReturns) {
    for (let i = 0; i < len; i++) sum[i] += p[i];
  }
  return sum.map((s) => s / peerReturns.length);
}

/**
 * Periodic returns from a price series. Accepts closing prices in
 * chronological order; returns array of `len - 1` log returns.
 */
export function logReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] <= 0 || prices[i - 1] <= 0) {
      out.push(0);
    } else {
      out.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return out;
}
