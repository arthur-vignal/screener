import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { brapiQuote } from "@/lib/brapi";
import { cached } from "@/lib/cache";

/**
 * /api/forecast/[symbol] — previsão de preço 6m à frente via modelo
 * sulfur-ml v8 (ensemble_ridge_hgb sobre painel 10y de blue chips B3).
 *
 * Fonte de verdade (offline, pré-computado pelo pipeline sulfur-ml):
 *   ~/projects/sulfur-ml/models/checkpoints/v8_real_fund_2026-09-08/
 *     - predictions_latest.csv         (10 tickers top com y_pred direto)
 *     - composite_scores_latest.csv    (25 tickers com composite_score)
 *
 * Banda (P10/P90 e high/base/low) usa vol anualizada empírica do hist_gbm
 * (vol_ann_pct = 5.76% do walkforward_summary.json → σ_6m_log = 4.07%).
 * P10/P90: z=1.645 (IC 90% bilateral) × σ_6m_log.
 * Cenários low/high: ±1σ_6m_log (~68% IC, banda provável).
 *
 * Cache: 6h (forecast não muda intra-day).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CHECKPOINT_DIR =
  "C:\\Users\\vigna\\projects\\sulfur-ml\\models\\checkpoints\\v8_real_fund_2026-09-08";

// Vol anualizada empírica do hist_gbm (validator v8 walkforward_summary.json).
// vol_ann_pct = 5.76% (hist_gbm winner) → σ_ann = 5.76% / 100 = 0.0576.
// Para horizonte 6m: σ_6m_log = σ_ann × √(6/12) ≈ 0.0407.
const SIGMA_6M_LOG = 0.0407;

// z-score one-tail 95% (= IC 90% bilateral). Mesma convenção do qnorm(0.95).
const Z_P90 = 1.645;

const DISCLAIMER =
  "Previsão probabilística baseada em backtest histórico. NÃO é recomendação de investimento.";

type Source = "predictions_latest" | "composite_scores_proxy";

type PredictionRow = {
  rank: number;
  ticker: string;
  y_pred: number;
  date: string;
  pe: number | null;
  p_vp: number | null;
  ev_ebitda: number | null;
  roe: number | null;
  dy: number | null;
  peg_ratio: number | null;
  profit_margin: number | null;
  composite_score: number | null;
};

type CompositeRow = {
  rank: number;
  ticker: string;
  composite_score: number;
  pe: number | null;
  p_vp: number | null;
  ev_ebitda: number | null;
  roe: number | null;
  dy: number | null;
};

type ForecastResponse = {
  symbol: string;
  current_price: number;
  as_of: string;
  horizon: "6m";
  model: "v8_real_fund_2026-09-08";
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
  source: Source;
  disclaimer: string;
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

/** Lê predictions_latest.csv (10 tickers com y_pred). Cache 1h em memória. */
async function readPredictions(): Promise<Map<string, PredictionRow>> {
  return cached("forecast:predictions:v8", 60 * 60, async () => {
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
          date: r[idx("date")] ?? "",
          pe: toNum(r[idx("pe")]),
          p_vp: toNum(r[idx("p_vp")]),
          ev_ebitda: toNum(r[idx("ev_ebitda")]),
          roe: toNum(r[idx("roe")]),
          dy: toNum(r[idx("dy")]),
          peg_ratio: toNum(r[idx("peg_ratio")]),
          profit_margin: toNum(r[idx("profit_margin")]),
          composite_score: toNum(r[idx("composite_score")]),
        });
      }
    } catch (err) {
      console.error("[forecast] failed to read predictions_latest.csv:", err);
    }
    return map;
  });
}

/** Lê composite_scores_latest.csv (25 tickers com composite_score). Cache 1h. */
async function readCompositeScores(): Promise<Map<string, CompositeRow>> {
  return cached("forecast:composite:v8", 60 * 60, async () => {
    const map = new Map<string, CompositeRow>();
    try {
      const text = await readFile(
        path.join(CHECKPOINT_DIR, "composite_scores_latest.csv"),
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
          composite_score: Number(r[idx("composite_score")] ?? 0),
          pe: toNum(r[idx("pe")]),
          p_vp: toNum(r[idx("p_vp")]),
          ev_ebitda: toNum(r[idx("ev_ebitda")]),
          roe: toNum(r[idx("roe")]),
          dy: toNum(r[idx("dy")]),
        });
      }
    } catch (err) {
      console.error(
        "[forecast] failed to read composite_scores_latest.csv:",
        err,
      );
    }
    return map;
  });
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Confidence: 0.5 base + |log_return| × 0.15, clampado a [0, 1]. */
function confidenceFromLogReturn(yPred: number): number {
  return clamp(0.5 + Math.abs(yPred) * 0.15, 0, 1);
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

  const [predictions, composites, quoteMap] = await Promise.all([
    readPredictions(),
    readCompositeScores(),
    brapiQuote([symbol]).catch(() => new Map()),
  ]);

  // 404 explícito quando ticker não está em nenhum dos dois CSVs.
  const pred = predictions.get(symbol);
  const comp = pred ? null : composites.get(symbol);
  if (!pred && !comp) {
    return NextResponse.json(
      {
        error: "ticker_fora_do_painel_v8",
        message: `Ticker ${symbol} não está no painel v8 (25 blue chips). Expansão prevista no roadmap.`,
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

  // Resolve y_pred (log return esperado em 6m):
  //   - predictions_latest → y_pred direto
  //   - composite_scores   → proxy = composite_score × 0.05
  //     (heurística: z-score ~5% log return esperado — calibrar depois)
  let yPred: number;
  let source: Source;
  let features: ForecastResponse["features_snapshot"];

  if (pred) {
    yPred = pred.y_pred;
    source = "predictions_latest";
    features = {
      pe: pred.pe,
      p_vp: pred.p_vp,
      ev_ebitda: pred.ev_ebitda,
      roe: pred.roe,
      dy: pred.dy,
      composite_score: pred.composite_score,
    };
  } else {
    // comp é não-null aqui (early return acima).
    yPred = comp!.composite_score * 0.05;
    source = "composite_scores_proxy";
    features = {
      pe: comp!.pe,
      p_vp: comp!.p_vp,
      ev_ebitda: comp!.ev_ebitda,
      roe: comp!.roe,
      dy: comp!.dy,
      composite_score: comp!.composite_score,
    };
  }

  const predictedPrice6m = currentPrice * Math.exp(yPred);
  const baseLog = yPred;

  // Banda P10/P90 usa z=1.645 (IC 90% bilateral) × σ_6m_log empírica do hist_gbm.
  // Cenários low/high do fan chart usam ±1σ (~68% IC, banda provável).
  const p10Price = currentPrice * Math.exp(yPred - Z_P90 * SIGMA_6M_LOG);
  const p90Price = currentPrice * Math.exp(yPred + Z_P90 * SIGMA_6M_LOG);

  // Cenários fan chart: low/base/high = ±1σ_6m_log em torno do base (68% IC).
  const lowPrice = currentPrice * Math.exp(baseLog - SIGMA_6M_LOG);
  const highPrice = currentPrice * Math.exp(baseLog + SIGMA_6M_LOG);

  const response: ForecastResponse = {
    symbol,
    current_price: currentPrice,
    as_of: new Date().toISOString(),
    horizon: "6m",
    model: "v8_real_fund_2026-09-08",
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
    features_snapshot: features,
    source,
    disclaimer: DISCLAIMER,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, max-age=21600, s-maxage=21600" },
  });
}