/**
 * Quant recommendation engine.
 *
 * Generates a 0-100 score and categorical recommendation (STRONG BUY / BUY / HOLD
 * / SELL / STRONG SELL) from technical indicators only — no analyst opinion,
 * no placeholders.
 *
 * Components (each weighted 0-1):
 *   - Trend (25%): ADX strength + SMA20/50 alignment
 *   - Momentum (20%): RSI position + recent return profile
 *   - Volatility profile (15%): reward moderate vol, penalize extreme
 *   - Sharpe quality (20%): risk-adjusted returns
 *   - Drawdown risk (20%): penalize large max drawdowns
 *
 * Each sub-score returns 0-100. Weighted sum → final score 0-100.
 * Bands:
 *   75+ → STRONG BUY
 *   60+ → BUY
 *   45+ → HOLD
 *   30+ → SELL
 *   <30 → STRONG SELL
 */

export type Recommendation = {
  score: number; // 0-100
  band: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
  components: {
    trend: number;
    momentum: number;
    volatility: number;
    sharpe: number;
    drawdown: number;
  };
  rationale: string[];
};

type Inputs = {
  adx: number | null;
  smaTrend: "up" | "down" | "unknown" | null;
  rsi: number | null;
  volatility: number | null; // annualized %
  sharpe: number | null;
  maxDrawdown: number | null; // positive number (e.g. 25 means -25%)
  zScore: number | null;
};

function band(score: number): Recommendation["band"] {
  if (score >= 75) return "STRONG BUY";
  if (score >= 60) return "BUY";
  if (score >= 45) return "HOLD";
  if (score >= 30) return "SELL";
  return "STRONG SELL";
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Trend (0-100): ADX strength + direction. */
function trendScore(adx: number | null, smaTrend: Inputs["smaTrend"]): { score: number; note: string } {
  if (adx == null || smaTrend == null || smaTrend === "unknown") {
    return { score: 50, note: "tendência indefinida" };
  }
  // ADX strength: 0-100 mapped from 0-50
  const strength = clamp((adx / 50) * 100);
  if (adx < 20) return { score: 50, note: `sem tendência (ADX ${adx.toFixed(0)})` };
  // Has trend. Score depends on direction.
  if (smaTrend === "up") {
    return {
      score: clamp(50 + strength * 0.5),
      note: `tendência de ALTA (ADX ${adx.toFixed(0)})`,
    };
  }
  return {
    score: clamp(50 - strength * 0.5),
    note: `tendência de BAIXA (ADX ${adx.toFixed(0)})`,
  };
}

/** Momentum (0-100): RSI sweet spot 50-65. */
function momentumScore(rsi: number | null, zScore: number | null): { score: number; note: string } {
  if (rsi == null) return { score: 50, note: "momentum neutro" };
  let s = 50;
  if (rsi >= 40 && rsi <= 65) s = 80; // sweet spot
  else if (rsi >= 30 && rsi < 40) s = 65; // recovering
  else if (rsi > 65 && rsi <= 75) s = 55; // weakening
  else if (rsi > 75) s = 25; // overbought
  else if (rsi < 30) s = 35; // oversold (potential reversal)

  // Z-score adds context: positive z + RSI 50-65 = strong momentum
  if (zScore != null) {
    if (zScore > 0 && rsi >= 50 && rsi <= 70) s += 10;
    if (zScore < -1.5 && rsi < 35) s += 5; // mean reversion candidate
  }
  return {
    score: clamp(s),
    note:
      rsi < 30 ? "sobrevendido (possível repique)"
        : rsi > 70 ? "sobrecomprado (possível correção)"
          : rsi >= 50 && rsi <= 65 ? "momentum saudável"
            : "momentum neutro",
  };
}

/** Volatility profile (0-100): penalize extreme vol. */
function volatilityScore(vol: number | null): { score: number; note: string } {
  if (vol == null) return { score: 50, note: "volatilidade indeterminada" };
  // Sweet spot: 15-30%. Below 10 = too quiet. Above 50 = risky.
  if (vol >= 10 && vol <= 30) return { score: 85, note: `volatilidade moderada (${vol.toFixed(0)}%)` };
  if (vol > 30 && vol <= 50) return { score: 55, note: `volatilidade alta (${vol.toFixed(0)}%)` };
  if (vol > 50 && vol <= 80) return { score: 30, note: `volatilidade muito alta (${vol.toFixed(0)}%)` };
  if (vol > 80) return { score: 15, note: `volatilidade extrema (${vol.toFixed(0)}%)` };
  return { score: 50, note: `volatilidade baixa (${vol.toFixed(0)}%)` };
}

/** Sharpe quality (0-100): higher Sharpe = better. */
function sharpeScore(sharpe: number | null): { score: number; note: string } {
  if (sharpe == null) return { score: 50, note: "Sharpe indeterminável" };
  // Map -1..3 to 0..100
  const s = clamp(((sharpe + 1) / 4) * 100);
  let note: string;
  if (sharpe >= 2) note = `Sharpe excelente (${sharpe.toFixed(2)})`;
  else if (sharpe >= 1) note = `Sharpe bom (${sharpe.toFixed(2)})`;
  else if (sharpe >= 0) note = `Sharpe aceitável (${sharpe.toFixed(2)})`;
  else note = `Sharpe negativo (${sharpe.toFixed(2)})`;
  return { score: s, note };
}

/** Drawdown risk (0-100): invert MDD. -50% MDD = 0 score. */
function drawdownScore(mdd: number | null): { score: number; note: string } {
  if (mdd == null || !Number.isFinite(mdd)) return { score: 50, note: "drawdown indeterminável" };
  const positiveMdd = Math.abs(mdd);
  // Map 0..60 → 100..0
  const s = clamp(100 - (positiveMdd / 60) * 100);
  let note: string;
  if (positiveMdd < 10) note = `drawdown baixo (${positiveMdd.toFixed(0)}%)`;
  else if (positiveMdd < 20) note = `drawdown moderado (${positiveMdd.toFixed(0)}%)`;
  else if (positiveMdd < 35) note = `drawdown alto (${positiveMdd.toFixed(0)}%)`;
  else note = `drawdown severo (${positiveMdd.toFixed(0)}%)`;
  return { score: s, note };
}

/**
 * Compute a quant recommendation from raw indicators.
 * Returns null if no usable inputs.
 */
export function quantRecommendation(inputs: Inputs): Recommendation | null {
  const trend = trendScore(inputs.adx, inputs.smaTrend);
  const momentum = momentumScore(inputs.rsi, inputs.zScore);
  const volatility = volatilityScore(inputs.volatility);
  const sharpe = sharpeScore(inputs.sharpe);
  const drawdown = drawdownScore(inputs.maxDrawdown);

  const score = Math.round(
    trend.score * 0.25 +
      momentum.score * 0.20 +
      volatility.score * 0.15 +
      sharpe.score * 0.20 +
      drawdown.score * 0.20,
  );

  return {
    score,
    band: band(score),
    components: {
      trend: Math.round(trend.score),
      momentum: Math.round(momentum.score),
      volatility: Math.round(volatility.score),
      sharpe: Math.round(sharpe.score),
      drawdown: Math.round(drawdown.score),
    },
    rationale: [
      trend.note,
      momentum.note,
      volatility.note,
      sharpe.note,
      drawdown.note,
    ],
  };
}
