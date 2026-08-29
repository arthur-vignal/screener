import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/asset/[symbol]/stats-history — série histórica de estatísticas (P/L,
 * P/VP, beta, dividend yield, EPS) por quarter.
 *
 * Proxy pra `brapi /api/v2/stocks/statistics?symbols=X&mode=history&period=quarterly`
 *
 * Doc oficial brapi v2:
 *   - endpoint: /api/v2/stocks/statistics
 *   - query: symbols (req), mode=history, period=quarterly, startDate, endDate
 *   - auth: Bearer
 *   - retorna: trailingPE, forwardPE, trailingEps, forwardEps, priceEarnings,
 *     priceToBook, beta, bookValue, earningsGrowth, revenueGrowth, grossMargins,
 *     profitMargins, operatingMargins, ebitdaMargins, returnOnEquity,
 *     returnOnAssets, debtToEquity, currentRatio, quickRatio, freeCashflow,
 *     operatingCashflow, pegRatio, targetHighPrice, targetLowPrice,
 *     targetMeanPrice, targetMedianPrice, recommendationMean,
 *     recommendationKey, numberOfAnalystOpinions
 *
 * Cache: 24h. Cada ticker tem ~16 quarters (4 anos).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

type StatsHistoryRow = {
  endDate?: string;
  trailingPE?: number | null;
  forwardPE?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  priceEarnings?: number | null;
  priceToBook?: number | null;
  beta?: number | null;
  bookValue?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  grossMargins?: number | null;
  profitMargins?: number | null;
  operatingMargins?: number | null;
  ebitdaMargins?: number | null;
  returnOnEquity?: number | null;
  returnOnAssets?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;
  freeCashflow?: number | null;
  operatingCashflow?: number | null;
  pegRatio?: number | null;
  targetHighPrice?: number | null;
  targetLowPrice?: number | null;
  targetMeanPrice?: number | null;
  targetMedianPrice?: number | null;
  recommendationMean?: number | null;
  recommendationKey?: string | null;
  numberOfAnalystOpinions?: number | null;
};

type BrapiResponse = {
  results?: Array<{
    symbol?: string;
    statistics?: StatsHistoryRow[] | { statistics?: StatsHistoryRow[] };
    /** Modo antigo: brapi v2 às vezes retorna o array direto em "results" */
    [key: string]: unknown;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  try {
    const history = await cached(
      `brapi:stats-history:${symbol}`,
      24 * 60 * 60,
      () => fetchBrapiStatsHistory(symbol),
    );
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json(
      { history: [], error: String(err) },
      { status: 500 },
    );
  }
}

async function fetchBrapiStatsHistory(
  symbol: string,
): Promise<StatsHistoryRow[]> {
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
  const params = new URLSearchParams({
    symbols: symbol,
    mode: "history",
    period: "quarterly",
  });
  if (token) params.set("token", token);

  const url = `https://brapi.dev/api/v2/stocks/statistics?${params.toString()}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  const data = (await r.json()) as BrapiResponse;
  const result = data.results?.[0];
  if (!result) return [];
  // O payload pode vir como:
  // - result.statistics (array ou { statistics: array })
  // - result direto como array (em algumas versões da API)
  const stat = result.statistics;
  let arr: StatsHistoryRow[] = [];
  if (Array.isArray(stat)) arr = stat;
  else if (stat && typeof stat === "object" && Array.isArray((stat as { statistics?: StatsHistoryRow[] }).statistics))
    arr = (stat as { statistics?: StatsHistoryRow[] }).statistics ?? [];
  else if (Array.isArray(result as unknown as StatsHistoryRow[]))
    arr = result as unknown as StatsHistoryRow[];
  return arr.filter((r) => r.endDate != null).sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));
}
