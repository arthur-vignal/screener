/**
 * /api/portfolio/[slug] — bundle do portfolio individual.
 *
 * Retorna:
 *   - meta: { name, slug, description, initialValue, createdAt, isPublic }
 *   - summary: { totalValue, changeToday, changeTodayPercent }
 *   - holdings: [{ symbol, weight, price, change, changePercent,
 *                  change1m, change1mPercent, positionValue,
 *                  positionChangeToday, sector }]
 *   - performance: { candles: [{ ts, value }], range: "1D" | ... }
 *     Série histórica do VALOR do portfolio = soma (weight × initial × candle)
 *
 * Auth: obrigatório. User só vê portfolios próprios ou públicos.
 *
 * Fonte: brapi v2 batch (`/v2/stocks/quote`) + `/v2/stocks/historical`
 * (1mo pra change1m e candles diários pra performance chart).
 *
 * Cache: 60s (mesma TTL do quote do asset raiz).
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";
import { brapiHistorical } from "@/lib/brapi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PortfolioRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  initial_value: number;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  owner_id: string;
};

type Holding = {
  symbol: string;
  weight: number;
};

type Range = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "5Y" | "All";

const RANGE_TO_DAYS: Record<Range, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "YTD": 365,
  "1Y": 365,
  "5Y": 1825,
  All: 1825,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pega o portfolio (se for do user OU público).
  const rows = await query<PortfolioRow>(
    `SELECT id, slug, name, description, initial_value, is_public,
            created_at, updated_at, owner_id
     FROM portfolios
     WHERE slug = $1
       AND (owner_id = $2 OR is_public = TRUE)
     LIMIT 1`,
    [slug, user.userId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }
  const portfolio = rows[0]!;

  // Holdings.
  const holdings = await query<Holding>(
    `SELECT symbol, weight FROM portfolio_holdings WHERE portfolio_id = $1`,
    [portfolio.id],
  );

  if (holdings.length === 0) {
    return NextResponse.json({
      meta: {
        name: portfolio.name,
        slug: portfolio.slug,
        description: portfolio.description,
        initialValue: portfolio.initial_value,
        createdAt: portfolio.created_at,
        isPublic: portfolio.is_public,
      },
      summary: {
        totalValue: portfolio.initial_value,
        changeToday: 0,
        changeTodayPercent: 0,
      },
      holdings: [],
      performance: { candles: [], range: "1M" as Range },
    });
  }

  const range = (req.nextUrl.searchParams.get("range") as Range | null) ?? "1M";
  const validRange = (RANGE_TO_DAYS[range] ? range : "1M") as Range;
  const days = RANGE_TO_DAYS[validRange];

  // Fetch em paralelo: quotes + candles 1mo (pra 1m return) + candles
  // por range (pra performance chart).
  const symbols = holdings.map((h) => h.symbol);
  const [quoteMap, hist1mo, histRange] = await Promise.all([
    getBrapiQuoteBatch(symbols),
    // 1m return: precisa de candles dos últimos 30 dias
    fetchCandlesBatch(symbols, "1mo", "1d"),
    // performance: candles por range
    fetchCandlesBatch(
      symbols,
      days <= 90 ? "3mo" : days <= 365 ? "1y" : "5y",
      "1d",
    ),
  ]);

  // ── Holdings enriquecidos ──
  let totalValue = 0;
  let changeToday = 0;
  const enrichedHoldings: Array<{
    symbol: string;
    weight: number;
    sector: string | null;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    change1m: number | null;
    change1mPercent: number | null;
    positionValue: number;
    positionChangeToday: number;
  }> = [];

  for (const h of holdings) {
    const q = quoteMap.get(h.symbol);
    const price = q?.price ?? null;
    const change = q?.change ?? null;
    const changePercent = q?.changePercent ?? null;
    const sector = q?.sector ?? null;

    // 1m return: price hoje vs close ~30 dias atrás.
    let change1m: number | null = null;
    let change1mPercent: number | null = null;
    const hist = hist1mo.get(h.symbol);
    if (hist && hist.length > 0 && price != null) {
      const oldest = hist[0]!;
      if (oldest.close > 0) {
        change1m = price - oldest.close;
        change1mPercent = (change1m / oldest.close) * 100;
      }
    }

    const positionValue = h.weight * portfolio.initial_value;
    let positionChangeToday = 0;
    if (price != null && change != null) {
      positionChangeToday = positionValue * (changePercent ?? 0) / 100;
      totalValue += positionValue;
      changeToday += positionChangeToday;
    }

    enrichedHoldings.push({
      symbol: h.symbol,
      weight: h.weight,
      sector,
      price,
      change,
      changePercent,
      change1m,
      change1mPercent,
      positionValue,
      positionChangeToday,
    });
  }

  if (totalValue === 0) totalValue = portfolio.initial_value;
  const changeTodayPercent =
    totalValue > 0 ? (changeToday / totalValue) * 100 : 0;

  // ── Performance: valor do portfolio ao longo do tempo ──
  // Pra cada timestamp presente em pelo menos 1 candle de qualquer
  // holding, computa valor = soma (weight × initial × candle.close).
  const performanceCandles: Array<{ ts: number; value: number }> = [];
  if (histRange.size > 0) {
    // Coleta todos os timestamps únicos ordenados.
    const tsSet = new Set<number>();
    for (const candles of histRange.values()) {
      for (const c of candles) tsSet.add(c.timestamp);
    }
    const allTs = [...tsSet].sort((a, b) => a - b);
    // Filtra pela janela do range escolhido.
    const cutoff = Date.now() - days * 86_400_000;
    const windowTs =
      validRange === "YTD"
        ? (() => {
            const yearStart = new Date();
            yearStart.setMonth(0, 1);
            yearStart.setHours(0, 0, 0, 0);
            return allTs.filter((t) => t >= yearStart.getTime());
          })()
        : allTs.filter((t) => t >= cutoff);
    for (const ts of windowTs) {
      let value = 0;
      let count = 0;
      for (const h of holdings) {
        const candles = histRange.get(h.symbol);
        if (!candles) continue;
        // candle mais próximo <= ts
        const idx = findCandleAt(candles, ts);
        if (idx === -1) continue;
        value += h.weight * portfolio.initial_value * candles[idx]!.close;
        count += 1;
      }
      if (count > 0) {
        performanceCandles.push({ ts, value });
      }
    }
  }

  return NextResponse.json({
    meta: {
      name: portfolio.name,
      slug: portfolio.slug,
      description: portfolio.description,
      initialValue: portfolio.initial_value,
      createdAt: portfolio.created_at,
      isPublic: portfolio.is_public,
      isOwner: portfolio.owner_id === user.userId,
    },
    summary: {
      totalValue,
      changeToday,
      changeTodayPercent,
    },
    holdings: enrichedHoldings.sort((a, b) => b.positionValue - a.positionValue),
    performance: {
      candles: performanceCandles,
      range: validRange,
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

type Candle = {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
};

/** Busca candles diários pra todos os symbols, retorna Map<symbol, candles ASC>. */
async function fetchCandlesBatch(
  symbols: string[],
  range: "1mo" | "3mo" | "1y" | "5y",
  interval: "1d",
): Promise<Map<string, Candle[]>> {
  const out = new Map<string, Candle[]>();
  // Batches de 5 (limit brapi é 20 mas pra /historical é 20 — vamos
  // com 5 pra reduzir risco de timeout).
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        const candles = await brapiHistorical(sym, { range, interval });
        // Normaliza ASC
        const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
        return { sym, candles: sorted };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        out.set(r.value.sym, r.value.candles);
      }
    }
  }
  return out;
}

/** Binary search: retorna index do candle com timestamp <= ts. */
function findCandleAt(candles: Candle[], ts: number): number {
  if (candles.length === 0) return -1;
  if (candles[candles.length - 1]!.timestamp < ts) {
    // ts é depois do último candle → usa o último
    return candles.length - 1;
  }
  let lo = 0;
  let hi = candles.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid]!.timestamp <= ts) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
