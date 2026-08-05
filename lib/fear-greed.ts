/**
 * Fear & Greed Index — composite sentiment indicator.
 *
 * Score: 0 = extreme fear, 100 = extreme greed.
 * Computed from 5 components (rebalanced):
 *   1. Market Volatility (VIX vs 50d MA)         — 30%
 *   2. Market Momentum (S&P 500 vs 125d MA)     — 25%
 *   3. Stock Strength (advance/decline proxy)    — 20%
 *   4. Safe Haven Demand (Gold vs Equities)     — 15%
 *   5. Junk Bond Demand (HYG vs TLT)            — 10%
 *
 * Each component maps to 0-100 via domain-specific scaling.
 */

import { getAssetQuotes } from "./assets";
import { getYahooCandles } from "./yahoo";
import { cached } from "./cache";

export type FgComponent = {
  name: string;
  label: string;
  weight: number;
  value: number; // 0-100
  raw: {
    current: number;
    comparison: number;
    description: string;
  };
};

export type FgResult = {
  score: number; // 0-100
  regime: "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
  label: string;
  components: FgComponent[];
  computedAt: number;
  /** Component history (last 30 days), if available */
  history: { date: string; score: number }[];
};

const VIX_SYMBOL = "^VIX";
const SP500_SYMBOL = "^GSPC";
const GOLD_SYMBOL = "GC=F";
const HYG_SYMBOL = "HYG"; // High Yield Corporate Bond ETF
const TLT_SYMBOL = "TLT"; // Long Treasury Bond ETF

type Closes = { date: string; close: number }[];

async function loadCloses(symbol: string, lookbackDays: number): Promise<Closes> {
  return cached(
    `fg:closes:${symbol}:${lookbackDays}`,
    60 * 60 * 1000, // 1h cache
    async () => {
      try {
        // Need 1Y+ to get 125d MA + 50d MA
        const candles = await getYahooCandles(symbol, "1y", "1d");
        return candles.map((c) => ({ date: c.date, close: c.close }));
      } catch {
        return [];
      }
    },
  );
}

function ma(closes: Closes, days: number): number | null {
  if (closes.length < days) return null;
  const slice = closes.slice(-days);
  const sum = slice.reduce((a, b) => a + b.close, 0);
  return sum / days;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** 1. VIX — inversely proportional to greed (low VIX = greed) */
async function volatilityComponent(): Promise<FgComponent> {
  const closes = await loadCloses(VIX_SYMBOL, 60);
  const current = closes.length ? closes[closes.length - 1].close : 20;
  const ma50 = ma(closes, 50) ?? current;

  // If VIX is well below MA = greed (high score).
  // If VIX is well above MA = fear (low score).
  // Standard scaling: ratio 0.5 → 100, ratio 1.0 → 50, ratio 2.0 → 0
  const ratio = ma50 > 0 ? current / ma50 : 1;
  const score = clamp(100 - (ratio - 0.5) * 100, 0, 100);

  return {
    name: "volatility",
    label: "Volatilidade (VIX)",
    weight: 0.3,
    value: Math.round(score),
    raw: {
      current,
      comparison: ma50,
      description: `VIX ${current.toFixed(1)} vs 50d MA ${ma50.toFixed(1)}`,
    },
  };
}

/** 2. S&P 500 momentum vs 125d MA */
async function momentumComponent(): Promise<FgComponent> {
  const closes = await loadCloses(SP500_SYMBOL, 150);
  const current = closes.length ? closes[closes.length - 1].close : 0;
  const ma125 = ma(closes, 125) ?? current;

  // % above/below MA maps to 0-100
  // Typical: 5% above MA ≈ 80, 10% above ≈ 100, 5% below ≈ 20, 10% below ≈ 0
  const pctDiff = ma125 > 0 ? ((current - ma125) / ma125) * 100 : 0;
  const score = clamp(50 + pctDiff * 6, 0, 100);

  return {
    name: "momentum",
    label: "Momentum (S&P 500)",
    weight: 0.25,
    value: Math.round(score),
    raw: {
      current,
      comparison: ma125,
      description: `S&P ${pctDiff >= 0 ? "+" : ""}${pctDiff.toFixed(2)}% vs 125d MA`,
    },
  };
}

/** 3. Stock strength — proxy: % of SP500 above 50d MA */
async function strengthComponent(): Promise<FgComponent> {
  const closes = await loadCloses(SP500_SYMBOL, 60);
  const current = closes.length ? closes[closes.length - 1].close : 0;
  const ma50 = ma(closes, 50) ?? current;

  // Use Binance BTC as crypto proxy (more volatile than sp500)
  // For simplicity: VIX inverse + sp500 momentum → stock breadth proxy
  // This is a placeholder; real breadth needs advance/decline data which we don't have
  const score = clamp(50 + ((current - ma50) / ma50) * 100, 0, 100);

  return {
    name: "strength",
    label: "Força (breadth proxy)",
    weight: 0.2,
    value: Math.round(score),
    raw: {
      current,
      comparison: ma50,
      description: `S&P vs 50d MA (${(((current - ma50) / ma50) * 100).toFixed(2)}%)`,
    },
  };
}

/** 4. Safe haven demand — Gold vs Equities (SP500) 20d return */
async function safeHavenComponent(): Promise<FgComponent> {
  const [goldCloses, spCloses] = await Promise.all([
    loadCloses(GOLD_SYMBOL, 30),
    loadCloses(SP500_SYMBOL, 30),
  ]);

  if (goldCloses.length < 21 || spCloses.length < 21) {
    return {
      name: "safe-haven",
      label: "Safe Haven (Gold vs Stocks)",
      weight: 0.15,
      value: 50,
      raw: { current: 0, comparison: 0, description: "Dados insuficientes" },
    };
  }

  const goldReturn =
    ((goldCloses[goldCloses.length - 1].close - goldCloses[goldCloses.length - 21].close) /
      goldCloses[goldCloses.length - 21].close) *
    100;
  const spReturn =
    ((spCloses[spCloses.length - 1].close - spCloses[spCloses.length - 21].close) /
      spCloses[spCloses.length - 21].close) *
    100;

  // If gold outperforming stocks = fear (low score)
  const diff = spReturn - goldReturn;
  const score = clamp(50 + diff * 4, 0, 100);

  return {
    name: "safe-haven",
    label: "Safe Haven (Gold vs Stocks)",
    weight: 0.15,
    value: Math.round(score),
    raw: {
      current: spReturn,
      comparison: goldReturn,
      description: `Stocks 20d: ${spReturn >= 0 ? "+" : ""}${spReturn.toFixed(2)}% | Gold 20d: ${goldReturn >= 0 ? "+" : ""}${goldReturn.toFixed(2)}%`,
    },
  };
}

/** 5. Junk bond demand — HYG vs TLT 20d return (high yield bonds vs treasuries) */
async function junkBondComponent(): Promise<FgComponent> {
  const [hygCloses, tltCloses] = await Promise.all([
    loadCloses(HYG_SYMBOL, 30),
    loadCloses(TLT_SYMBOL, 30),
  ]);

  if (hygCloses.length < 21 || tltCloses.length < 21) {
    return {
      name: "junk-bond",
      label: "Junk Bond Demand (HYG vs TLT)",
      weight: 0.1,
      value: 50,
      raw: { current: 0, comparison: 0, description: "Dados insuficientes" },
    };
  }

  const hygReturn =
    ((hygCloses[hygCloses.length - 1].close - hygCloses[hygCloses.length - 21].close) /
      hygCloses[hygCloses.length - 21].close) *
    100;
  const tltReturn =
    ((tltCloses[tltCloses.length - 1].close - tltCloses[tltCloses.length - 21].close) /
      tltCloses[tltCloses.length - 21].close) *
    100;

  // Junk bonds outperforming treasuries = risk-on (high score)
  const diff = hygReturn - tltReturn;
  const score = clamp(50 + diff * 8, 0, 100);

  return {
    name: "junk-bond",
    label: "Junk Bond Demand (HYG vs TLT)",
    weight: 0.1,
    value: Math.round(score),
    raw: {
      current: hygReturn,
      comparison: tltReturn,
      description: `HYG 20d: ${hygReturn >= 0 ? "+" : ""}${hygReturn.toFixed(2)}% | TLT 20d: ${tltReturn >= 0 ? "+" : ""}${tltReturn.toFixed(2)}%`,
    },
  };
}

function classifyRegime(score: number): FgResult["regime"] {
  if (score < 25) return "extreme-fear";
  if (score < 45) return "fear";
  if (score < 55) return "neutral";
  if (score < 75) return "greed";
  return "extreme-greed";
}

const REGIME_LABELS: Record<FgResult["regime"], string> = {
  "extreme-fear": "Medo extremo",
  fear: "Medo",
  neutral: "Neutro",
  greed: "Ganância",
  "extreme-greed": "Ganância extrema",
};

export function regimeLabel(regime: FgResult["regime"]): string {
  return REGIME_LABELS[regime];
}

export async function computeFearGreed(): Promise<FgResult> {
  // Run all components in parallel
  const [vol, mom, str, sh, jb] = await Promise.all([
    volatilityComponent(),
    momentumComponent(),
    strengthComponent(),
    safeHavenComponent(),
    junkBondComponent(),
  ]);

  const components = [vol, mom, str, sh, jb];
  const score = Math.round(
    components.reduce((acc, c) => acc + c.value * c.weight, 0),
  );

  return {
    score,
    regime: classifyRegime(score),
    label: regimeLabel(classifyRegime(score)),
    components,
    computedAt: Date.now(),
    history: [], // populated by separate API call
  };
}
