import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/asset/[symbol]/pe-history — série histórica de P/L (estatísticas).
 *
 * Proxy direto pra `brapi /api/v2/stocks/statistics?symbols=X&mode=history&period=quarterly`
 * Retorna a série histórica de P/L e campos relacionados (priceEarnings, eps, etc)
 * pra permitir bandas de "caro/barato vs história" no /asset/[symbol].
 *
 * Cache: 24h. Cada ticker tem ~16 quarters de histórico (4 anos).
 *
 * Resposta: { history: Array<{ endDate, trailingPE, priceEarnings, ... }> }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

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
      `brapi:pe-history:${symbol}`,
      24 * 60 * 60,
      () => fetchBrapiPEHistory(symbol),
    );
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json(
      { history: [], error: String(err) },
      { status: 500 },
    );
  }
}

type BrapiHistoryRow = {
  endDate?: string;
  trailingPE?: number | null;
  priceEarnings?: number | null;
  forwardPE?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  priceToBook?: number | null;
  beta?: number | null;
  bookValue?: number | null;
  earningsGrowth?: number | null;
  revenueGrowth?: number | null;
  grossMargins?: number | null;
  profitMargins?: number | null;
  returnOnEquity?: number | null;
  debtToEquity?: number | null;
};

type BrapiStatsHistoryResponse = {
  results?: Array<{
    defaultKeyStatisticsHistory?: {
      defaultKeyStatisticsHistory?: BrapiHistoryRow[];
    } | BrapiHistoryRow[];
  }>;
};

async function fetchBrapiPEHistory(
  symbol: string,
): Promise<BrapiHistoryRow[]> {
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
  const params = new URLSearchParams({ symbols: symbol });
  if (token) params.set("token", token);

  const url = `https://brapi.dev/api/v2/stocks/statistics?${params.toString()}&mode=history&period=quarterly`;
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  const data = (await r.json()) as BrapiStatsHistoryResponse;
  const raw = data.results?.[0]?.defaultKeyStatisticsHistory;
  const arr: BrapiHistoryRow[] = Array.isArray(raw)
    ? raw
    : (raw as { defaultKeyStatisticsHistory?: BrapiHistoryRow[] })
        ?.defaultKeyStatisticsHistory ?? [];
  // Filtra só entries com endDate e ordena asc
  return arr
    .filter((r) => r.endDate != null)
    .sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));
}
