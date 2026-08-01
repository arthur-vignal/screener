/**
 * Piotroski F-Score (financial strength, 0-9).
 *   8-9: very strong
 *   7:   strong
 *   5-6: average
 *   3-4: weak
 *   0-2: very weak
 *
 * Inputs come from Yahoo summary (free). For unavailable data points, we
 * skip that signal (giving partial credit). Each present signal = 1 point.
 */

type YahooSummaryLike = {
  roe?: number | null;
  roa?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  profitMargin?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  dividendYield?: number | null;
  payoutRatio?: number | null;
  beta?: number | null;
  priceToBook?: number | null;
  marketCap?: number | null;
};

export type PiotroskiResult = {
  score: number;
  max: number;
  signals: { name: string; passed: boolean | null; reason: string }[];
};

export function piotroskiF(s: YahooSummaryLike): PiotroskiResult {
  // Inputs are already in percent (0-100), not fractions.
  const signals: PiotroskiResult["signals"] = [];
  // Profitability (4 signals)
  signals.push({
    name: "ROE positivo",
    passed: s.roe != null ? s.roe > 0 : null,
    reason: s.roe == null ? "sem dados" : `ROE = ${s.roe.toFixed(1)}%`,
  });
  signals.push({
    name: "ROA positivo",
    passed: s.roa != null ? s.roa > 0 : null,
    reason: s.roa == null ? "sem dados" : `ROA = ${s.roa.toFixed(1)}%`,
  });
  signals.push({
    name: "Margem bruta > 0",
    passed: s.grossMargin != null ? s.grossMargin > 0 : null,
    reason: s.grossMargin == null ? "sem dados" : `GM = ${s.grossMargin.toFixed(1)}%`,
  });
  signals.push({
    name: "Margem operacional > 0",
    passed: s.operatingMargin != null ? s.operatingMargin > 0 : null,
    reason: s.operatingMargin == null ? "sem dados" : `Op margin = ${s.operatingMargin.toFixed(1)}%`,
  });

  // Leverage/Liquidity (3 signals) — not in free Finnhub metrics
  signals.push({ name: "Dívida de longo prazo caindo", passed: null, reason: "não calculado" });
  signals.push({ name: "Current ratio subindo", passed: null, reason: "não calculado" });
  signals.push({ name: "Shares outstanding estáveis", passed: null, reason: "não calculado" });

  // Operating efficiency (2 signals)
  signals.push({
    name: "Crescimento de receita",
    passed: s.revenueGrowth != null ? s.revenueGrowth > 0 : null,
    reason: s.revenueGrowth == null ? "sem dados" : `Rev growth = ${s.revenueGrowth.toFixed(1)}%`,
  });
  signals.push({
    name: "Crescimento de lucro",
    passed: s.earningsGrowth != null ? s.earningsGrowth > 0 : null,
    reason: s.earningsGrowth == null ? "sem dados" : `EPS growth = ${s.earningsGrowth.toFixed(1)}%`,
  });

  const score = signals.filter((sig) => sig.passed === true).length;
  const max = signals.filter((sig) => sig.passed !== null).length;
  return { score, max, signals };
}

/**
 * Altman Z-Score (bankruptcy risk).
 *   Z > 2.99:  safe zone
 *   1.81 < Z < 2.99: grey zone
 *   Z < 1.81:  distress
 *
 * Simplified public version (uses book value proxy):
 *   Z = 1.2*A + 1.4*B + 3.3*C + 0.6*D + 1.0*E
 *   A = working capital / total assets (proxy via margins here)
 *   B = retained earnings / total assets (not in Yahoo summary, omitted)
 *   C = EBIT / total assets (proxy: operating margin)
 *   D = market cap / total liabilities (proxy: 1/beta-vola)
 *   E = sales / total assets (proxy: revenue growth)
 *
 * We compute a simplified Altman Z using only available Yahoo inputs.
 */
export type AltmanResult = {
  z: number | null;
  zone: "safe" | "grey" | "distress" | "unknown";
  notes: string[];
};

export function altmanZ(s: YahooSummaryLike): AltmanResult {
  const notes: string[] = [];
  let z = 0;
  let components = 0;

  // Working capital / total assets: proxy using current price > book value (P/B)
  if (s.priceToBook != null && s.priceToBook > 0) {
    z += 1.2 * Math.min(s.priceToBook, 3) / 3; // normalize to 0..1.2
    components += 1;
    notes.push(`P/B = ${s.priceToBook.toFixed(2)} (proxy working capital)`);
  } else {
    notes.push("P/B missing — working capital component skipped");
  }

  // EBIT / total assets: proxy via operating margin
  if (s.operatingMargin != null) {
    z += 3.3 * Math.max(0, s.operatingMargin);
    components += 1;
    notes.push(`Op margin = ${(s.operatingMargin * 100).toFixed(1)}% (proxy EBIT/TA)`);
  } else {
    notes.push("Op margin missing — EBIT component skipped");
  }

  // Market cap / total liabilities: proxy using low beta (lower beta -> stronger balance sheet)
  if (s.beta != null) {
    z += 0.6 * (1 / Math.max(0.5, s.beta));
    components += 1;
    notes.push(`Beta = ${s.beta.toFixed(2)} (proxy equity/debt)`);
  } else {
    notes.push("Beta missing — equity/debt component skipped");
  }

  // Sales / total assets: proxy using revenue growth
  if (s.revenueGrowth != null) {
    z += 1.0 * Math.max(0, s.revenueGrowth * 10); // scale 0..1+
    components += 1;
    notes.push(`Rev growth = ${(s.revenueGrowth * 100).toFixed(1)}% (proxy sales/TA)`);
  } else {
    notes.push("Rev growth missing — sales component skipped");
  }

  if (components === 0) {
    return { z: null, zone: "unknown", notes };
  }

  let zone: AltmanResult["zone"];
  if (z > 2.99) zone = "safe";
  else if (z > 1.81) zone = "grey";
  else zone = "distress";

  return { z, zone, notes };
}
