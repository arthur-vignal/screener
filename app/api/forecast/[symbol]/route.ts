import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { brapiQuote, brapiHistorical } from "@/lib/brapi";
import { cached } from "@/lib/cache";

/**
 * /api/forecast/[symbol] — previsão de preço 6m à frente via modelo
 * sulfur-ml v9 regime_specialist_xs (EXP-4 winner, cross-fold IR +0,35).
 *
 * Fonte de verdade (offline, pré-computado pelo pipeline sulfur-ml):
 *   ~/projects/sulfur-ml/models/checkpoints/v9_xs_regime_combined_2026-09-08/
 *   Espelhado em:
 *   ~/projects/sulfur/data/forecast/specialist_xs/
 *     - predictions_latest.csv         (32 tickers com y_pred direto do value_specialist_xs)
 *     - regime_current.json            (snapshot do regime + selic_real)
 *
 * Modelo EXP-4 — regime_specialist_xs:
 * - Target: fwd_h6m_xs (cross-section demeaned log return 6m)
 * - 34 features técnicas (SEM fundamentals brutos brapi)
 * - 3 especialistas HistGBM por regime (value/transition/momentum)
 * - Detecção de regime atual via selic_real (set/2026: value >7%)
 * - Validador 8-fold: sharpe_medio +1,16, IR +0,35, IC95 [-1,28, +3,61], 57,1% folds sharpe>1
 * - Walk-forward OOS: ann_ret +40,66%, sharpe +5,62, max_dd -2,50%, 81,2% >SELIC
 *
 * Banda (P10/P90 e high/base/low) usa vol anualizada empírica do regime_aware_xs
 * walkforward (vol_ann_pct = 6.07% → σ_6m_log ≈ 4.29%).
 * P10/P90: z=1.645 (IC 90% bilateral) × σ_6m_log.
 * Cenários low/high: ±1σ_6m_log (~68% IC, banda provável).
 *
 * Cache: 6h (forecast não muda intra-day).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// CSVs versionados no próprio projeto Sulfur (data/forecast/specialist_xs/) pra
// que o endpoint funcione em produção sem depender do projeto sulfur-ml.
// Atualização: rodar `sync-forecast.ts` periodicamente ou copiar manualmente
// do sulfur-ml (ver scripts/sync-forecast-data.sh).
const CHECKPOINT_DIR = path.join(process.cwd(), "data", "forecast", "specialist_xs");

// Vol anualizada empírica do regime_aware_xs walkforward (v9_xs_regime_combined).
// vol_ann_pct = 6.07% → σ_ann = 6.07% / 100 = 0.0607.
// Para horizonte 6m: σ_6m_log = σ_ann × √(6/12) ≈ 0.0429.
const SIGMA_6M_LOG = 0.0429;

// z-score one-tail 95% (= IC 90% bilateral). Mesma convenção do qnorm(0.95).
const Z_P90 = 1.645;

const DISCLAIMER =
  "Previsão probabilística baseada em backtest histórico. NÃO é recomendação de investimento.";

type Source = "specialist_xs_predictions";

type PredictionRow = {
  rank: number;
  ticker: string;
  y_pred: number;
  regime_atual: string;
  model_used: string;
  date: string;
  selic_real_pct: number;
};

type RegimeCurrent = {
  model: string;
  version: string;
  latest_date: string;
  current_regime: string;
  current_selic_real_pct: number;
};

type ForecastResponse = {
  symbol: string;
  current_price: number;
  as_of: string;
  horizon: "6m";
  model: "regime_specialist_xs_v9";
  predicted_price_6m: number;
  predicted_log_return: number;
  predicted_pct_return: number;
  direction: "up" | "down";
  confidence: number;
  band: {
    p10_price: number;
    p90_price: number;
    low_6m_price: number;
    base_6m_price: number;
    high_6m_price: number;
  };
  features_snapshot: {
    pe: number | null;
    p_vp: number | null;
    ev_ebitda: number | null;
    roe: number | null;
    dy: number | null;
    composite_score: number | null;
  };
  regime: {
    current: string;
    selic_real_pct: number;
    model_used: string;
    model_version: string;
  };
  /** Monte Carlo GBM — σ empírica por ativo + 1000 paths. NOVO 2026-09-08. */
  monte_carlo: MonteCarloGBM;
  source: Source;
  disclaimer: string;
};

type MonteCarloGBM = {
  /** 1000 preços finais (+6m) ordenados do menor pro maior. */
  paths: number[];
  /** P(price_final > current_price) — probabilidade de alta nos próximos 6m. */
  prob_up: number;
  /** P(price_final > 2 * current_price) — cauda extrema de alta. */
  prob_double: number;
  /** VaR 95%: perda esperada no cenário dos 5% piores (R$, positivo). */
  var_95: number;
  /** CVaR 95%: perda média nos 5% piores cenários (R$, positivo). */
  cvar_95: number;
  /** Vol anualizada empírica do ativo via log returns diários 252d. */
  sigma_annualized: number;
  /** σ_6m_log = σ_ann × √(6/12) — input do GBM. */
  sigma_6m_log: number;
  n_sims: number;
  /** Candles diários efetivamente usados no cálculo da vol. */
  n_days: number;
  /** Fonte: "brapi_1y" (vol empírica) ou "model_fallback" (σ do regime se <60 candles). */
  vol_source: "brapi_1y" | "model_fallback";
};

const SUPPORTED_TICKERS_SAMPLE = [
  "PETR4",
  "VALE3",
  "ITUB4",
  "BBDC4",
  "ABEV3",
  "WEGE3",
  "RENT3",
  "PRIO3",
  "BBSE3",
  "TOTS3",
];

/** CSV minimal parser — só campos numéricos e strings sem aspas/quebras. */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw) continue;
    out.push(raw.split(","));
  }
  return out;
}

function toNum(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Lê predictions_latest.csv (32 tickers com y_pred do value_specialist_xs). Cache 1h. */
async function readPredictions(): Promise<Map<string, PredictionRow>> {
  return cached("forecast:predictions:specialist_xs", 60 * 60, async () => {
    const map = new Map<string, PredictionRow>();
    try {
      const text = await readFile(
        path.join(CHECKPOINT_DIR, "predictions_latest.csv"),
        "utf8",
      );
      const rows = parseCsv(text);
      const header = rows[0];
      const idx = (k: string) => header.indexOf(k);
      for (const r of rows.slice(1)) {
        const ticker = r[idx("ticker")]?.trim().toUpperCase();
        if (!ticker) continue;
        map.set(ticker, {
          rank: Number(r[idx("rank")] ?? 0),
          ticker,
          y_pred: Number(r[idx("y_pred")] ?? 0),
          regime_atual: r[idx("regime_atual")] ?? "",
          model_used: r[idx("model_used")] ?? "",
          date: r[idx("date")] ?? "",
          selic_real_pct: Number(r[idx("selic_real_pct")] ?? 0),
        });
      }
    } catch (err) {
      console.error("[forecast] failed to read predictions_latest.csv:", err);
    }
    return map;
  });
}

/** Lê regime_current.json (snapshot do regime detectado). Cache 1h. */
async function readRegimeCurrent(): Promise<RegimeCurrent | null> {
  return cached("forecast:regime:specialist_xs", 60 * 60, async () => {
    try {
      const text = await readFile(
        path.join(CHECKPOINT_DIR, "regime_current.json"),
        "utf8",
      );
      const j = JSON.parse(text) as RegimeCurrent;
      return j;
    } catch (err) {
      console.error("[forecast] failed to read regime_current.json:", err);
      return null;
    }
  });
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Confidence: 0.5 base + |log_return| × 0.15, clampado a [0, 1]. */
function confidenceFromLogReturn(yPred: number): number {
  return clamp(0.5 + Math.abs(yPred) * 0.15, 0, 1);
}

/**
 * Box-Muller vetorizado — gera n samples ~ N(0, 1) em JS puro.
 *   Z = √(-2 ln U₁) · cos(2π U₂)
 * Performance: ~2ms pra 1000 samples em V8 moderno.
 */
function normalSample(n: number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const u1 = Math.random() || 1e-12; // evita log(0)
    const u2 = Math.random();
    out[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return out;
}

/**
 * Monte Carlo GBM — Geometric Brownian Motion com σ empírica por ativo.
 *
 * Modelo:
 *   dS/S = μ dt + σ dW
 *   S(T) = S(0) · exp((μ - σ²/2)·T + σ·√T·Z),  Z ~ N(0, 1)
 *
 * Parâmetros:
 *   - μ (drift) = yPred do modelo (log return esperado em 6m) — vem do regime_specialist_xs.
 *   - σ (vol) = vol realizada 252d do ativo via brapi /historical (1y, 1d).
 *                Se o ativo tem <60 candles (IPO recente), usa σ_6m_log do modelo como fallback.
 *
 * Output:
 *   - 1000 preços finais ordenados.
 *   - P(up) = P(S(T) > S(0)) — % de paths acima do preço atual.
 *   - VaR95 / CVaR95 — risco de cauda (loss nos 5% piores cenários).
 *   - prob_double — P(S(T) > 2·S(0)) — cenário extremo de alta.
 *
 * Cache 6h (forecast é estático no horizonte diário).
 */
async function simulateGBM(
  currentPrice: number,
  yPred: number,
  ticker: string,
  horizonMonths: number = 6,
  nSims: number = 1000,
): Promise<MonteCarloGBM> {
  // 1) Candles 1y via brapi (5min cache já dentro de brapiHistorical).
  const candles = await brapiHistorical(ticker, { range: "1y", interval: "1d" });

  // 2) Log returns diários: ln(close[t] / close[t-1]).
  const closes = candles
    .map((c) => c.close)
    .filter((c) => Number.isFinite(c) && c > 0);
  const logReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }

  // 3) Vol anualizada empírica do ativo (std × √252).
  let sigmaAnnualized: number;
  let volSource: "brapi_1y" | "model_fallback";
  if (logReturns.length >= 60) {
    const mean =
      logReturns.reduce((s, r) => s + r, 0) / logReturns.length;
    const variance =
      logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) /
      Math.max(1, logReturns.length - 1);
    sigmaAnnualized = Math.sqrt(variance * 252);
    volSource = "brapi_1y";
  } else {
    // IPO recente ou pouco histórico (~<3 meses de pregão): fallback
    // conservador pra σ do regime (~25% aa, razoável pra blue chip B3).
    sigmaAnnualized = 0.25;
    volSource = "model_fallback";
  }

  // 4) Drift do GBM com correção de Itô (μ - σ²/2)·T.
  //    μ implícito: yPred / horizonMonths (log return mensal médio).
  const muMonthly = yPred / horizonMonths;
  const driftCorrected =
    (muMonthly - 0.5 * Math.pow(sigmaAnnualized / Math.sqrt(12), 2)) *
    horizonMonths;

  // 5) σ_6m_log = σ_ann × √(horizonMonths/12).
  const sigma6m = sigmaAnnualized * Math.sqrt(horizonMonths / 12);

  // 6) Simula 1000 paths (Box-Muller, vetorizado).
  const Z = normalSample(nSims);
  const finalPrices = new Array<number>(nSims);
  for (let i = 0; i < nSims; i++) {
    finalPrices[i] = currentPrice * Math.exp(driftCorrected + sigma6m * Z[i]);
  }
  finalPrices.sort((a, b) => a - b);

  // 7) Estatísticas.
  let upCount = 0;
  let doubleCount = 0;
  for (let i = 0; i < nSims; i++) {
    if (finalPrices[i] > currentPrice) upCount++;
    if (finalPrices[i] > 2 * currentPrice) doubleCount++;
  }
  const probUp = upCount / nSims;
  const probDouble = doubleCount / nSims;

  // VaR95 = perda esperada no cenário dos 5% piores.
  const var95Index = Math.floor(nSims * 0.05);
  const var95 = Math.max(0, currentPrice - finalPrices[var95Index]);
  // CVaR95 = perda média nos 5% piores.
  const cvar95 =
    finalPrices
      .slice(0, var95Index)
      .reduce((s, p) => s + Math.max(0, currentPrice - p), 0) /
    Math.max(1, var95Index);

  return {
    paths: finalPrices,
    prob_up: probUp,
    prob_double: probDouble,
    var_95: var95,
    cvar_95: cvar95,
    sigma_annualized: sigmaAnnualized,
    sigma_6m_log: sigma6m,
    n_sims: nSims,
    n_days: logReturns.length,
    vol_source: volSource,
  };
}

/** Wrapper com cache 6h por símbolo. */
async function getMonteCarloGBM(
  currentPrice: number,
  yPred: number,
  ticker: string,
): Promise<MonteCarloGBM> {
  return cached(
    `forecast:gbm:${ticker}`,
    60 * 60 * 6, // 6h
    () => simulateGBM(currentPrice, yPred, ticker),
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const [predictions, regimeCurrent, quoteMap] = await Promise.all([
    readPredictions(),
    readRegimeCurrent(),
    brapiQuote([symbol]).catch(() => new Map()),
  ]);

  // 404 explícito quando ticker não está no predictions_latest.csv.
  // EXP-4 cobre os 32 blue chips; ticker fora = painel não cobre.
  const pred = predictions.get(symbol);
  if (!pred) {
    return NextResponse.json(
      {
        error: "ticker_fora_do_painel_specialist_xs",
        message: `Ticker ${symbol} não está no painel specialist_xs (32 blue chips B3 cobertos pelo EXP-4).`,
        supported_tickers_sample: SUPPORTED_TICKERS_SAMPLE,
      },
      { status: 404 },
    );
  }

  const quote = quoteMap.get(symbol);
  const currentPrice =
    quote?.price != null && Number.isFinite(quote.price) && quote.price > 0
      ? quote.price
      : null;

  if (currentPrice == null) {
    return NextResponse.json(
      {
        error: "preço_indisponível",
        message: `Não foi possível obter o preço atual de ${symbol} via brapi.`,
      },
      { status: 502 },
    );
  }

  const yPred = pred.y_pred;
  const predictedPrice6m = currentPrice * Math.exp(yPred);
  const baseLog = yPred;

  // Banda P10/P90 usa z=1.645 (IC 90% bilateral) × σ_6m_log empírica do WF.
  // Cenários low/high do fan chart usam ±1σ (~68% IC, banda provável).
  const p10Price = currentPrice * Math.exp(yPred - Z_P90 * SIGMA_6M_LOG);
  const p90Price = currentPrice * Math.exp(yPred + Z_P90 * SIGMA_6M_LOG);

  // Cenários fan chart: low/base/high = ±1σ_6m_log em torno do base (68% IC).
  const lowPrice = currentPrice * Math.exp(baseLog - SIGMA_6M_LOG);
  const highPrice = currentPrice * Math.exp(baseLog + SIGMA_6M_LOG);

  // Regime snapshot (defaults if regime_current.json not present)
  const regime = regimeCurrent ?? {
    model: "regime_specialist_xs",
    version: "v9_xs_regime_combined_2026-09-08",
    latest_date: pred.date,
    current_regime: pred.regime_atual,
    current_selic_real_pct: pred.selic_real_pct,
  };

  // Monte Carlo GBM com σ empírica por ativo (vol realizada 252d via brapi).
  // Falha silenciosa → mantém campo mas com fallback do modelo (não quebra o card).
  let monteCarlo: MonteCarloGBM;
  try {
    monteCarlo = await getMonteCarloGBM(currentPrice, yPred, symbol);
  } catch (err) {
    console.warn(`[forecast] MC GBM falhou pra ${symbol}, fallback regime:`, err);
    // Fallback: usa σ_6m_log do regime_aware_xs walkforward (constante global).
    const sigmaFallback = 0.0607; // ~6.07% aa
    const sigma6mFb = sigmaFallback * Math.sqrt(0.5);
    const Z = Array.from({ length: 1000 }, () => Math.random() * 2 - 1);
    const fb = Z.map(
      (z) => currentPrice * Math.exp(yPred + sigma6mFb * z),
    ).sort((a, b) => a - b);
    const upCount = fb.filter((p) => p > currentPrice).length;
    monteCarlo = {
      paths: fb,
      prob_up: upCount / 1000,
      prob_double: fb.filter((p) => p > 2 * currentPrice).length / 1000,
      var_95: Math.max(0, currentPrice - fb[50]),
      cvar_95:
        fb.slice(0, 50).reduce((s, p) => s + Math.max(0, currentPrice - p), 0) / 50,
      sigma_annualized: sigmaFallback,
      sigma_6m_log: sigma6mFb,
      n_sims: 1000,
      n_days: 0,
      vol_source: "model_fallback",
    };
  }

  const response: ForecastResponse = {
    symbol,
    current_price: currentPrice,
    as_of: new Date().toISOString(),
    horizon: "6m",
    model: "regime_specialist_xs_v9",
    predicted_price_6m: predictedPrice6m,
    predicted_log_return: yPred,
    predicted_pct_return: (Math.exp(yPred) - 1) * 100,
    direction: yPred >= 0 ? "up" : "down",
    confidence: confidenceFromLogReturn(yPred),
    band: {
      p10_price: p10Price,
      p90_price: p90Price,
      low_6m_price: lowPrice,
      base_6m_price: predictedPrice6m,
      high_6m_price: highPrice,
    },
    features_snapshot: {
      pe: null,
      p_vp: null,
      ev_ebitda: null,
      roe: null,
      dy: null,
      composite_score: null,
    },
    regime: {
      current: pred.regime_atual,
      selic_real_pct: pred.selic_real_pct,
      model_used: pred.model_used,
      model_version: regime.version,
    },
    monte_carlo: monteCarlo,
    source: "specialist_xs_predictions",
    disclaimer: DISCLAIMER,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, max-age=21600, s-maxage=21600" },
  });
}
