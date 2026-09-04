/**
 * /api/indexes — bundle de índices B3 pro painel Macro.
 *
 * Estratégia por índice (definida em lib/indexes.ts):
 *   1. Se `entry.brapi` existir → brapi v2 quote + historical 1mo
 *   2. Senão → mock (sem request)
 *
 * Brapi v2 só tem 2 índices B3: ^BVSP (IBOV) e IFIX.SA. Os outros
 * 7 que aparecem na UI hoje são mockados (mesmo critério do estado
 * anterior). Quando plugar yfinance, basta popular `entry.brapi` em
 * lib/indexes.ts e remover o fallback.
 *
 * YTD%: calculado client-side a partir de candles históricos anuais
 * (quando brapi tem) ou do mock (quando não tem).
 */

import { NextResponse } from "next/server";

import { brapiHistorical, brapiQuote } from "@/lib/brapi";
import { INDEX_REGISTRY, type IndexLive } from "@/lib/indexes";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

const ONE_DAY_MS = 86_400_000;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;

export async function GET(): Promise<NextResponse<{ indexes: IndexLive[] }>> {
  // Cache 5min — alinha com o TTL de cotação.
  return cached("brapi:v2:indexes:all:v3", 5 * 60, async () => {
    const now = Date.now();
    const out: IndexLive[] = [];

    for (const entry of INDEX_REGISTRY) {
      // ── Mock (brapi null) ──
      if (!entry.brapi) {
        out.push({
          symbol: entry.symbol,
          name: entry.name,
          country: entry.country,
          brapi: null,
          price: entry.mock.price,
          change: entry.mock.changePercent * entry.mock.price / 100,
          changePercent: entry.mock.changePercent,
          ytdPercent: entry.mock.ytdPercent,
          peRatio: entry.mock.peRatio,
          divYield: entry.mock.divYield,
          marketCap: entry.mock.marketCap,
          volume: entry.mock.volume,
          source: "mock",
        });
        continue;
      }

      // ── Brapi real ──
      try {
        const [quoteMap, hist60d, hist1y] = await Promise.all([
          brapiQuote([entry.brapi]),
          brapiHistorical(entry.brapi, { range: "1mo", interval: "1d" }),
          brapiHistorical(entry.brapi, { range: "1y", interval: "1d" }),
        ]);
        const q = quoteMap.get(entry.brapi);
        if (!q || q.price == null) {
          out.push(fallbackToMock(entry));
          continue;
        }
        const price = q.price;
        const change = q.change ?? 0;
        const changePercent = q.changePercent ?? 0;
        // recent = últimos 2 dias pra sparkline
        const recent = hist60d
          .filter((c) => c.timestamp <= now)
          .slice(-2)
          .map((c) => ({ ts: c.timestamp, close: c.close }));
        // ytd: primeiro candle do ano vs preço atual
        const yearStart = new Date();
        yearStart.setMonth(0, 1);
        yearStart.setHours(0, 0, 0, 0);
        const firstOfYear = hist1y.find((c) => c.timestamp >= yearStart.getTime());
        const ytdPercent = firstOfYear && firstOfYear.close > 0
          ? ((price - firstOfYear.close) / firstOfYear.close) * 100
          : 0;
        out.push({
          symbol: entry.symbol,
          name: entry.name,
          country: entry.country,
          brapi: entry.brapi,
          price,
          change,
          changePercent,
          ytdPercent,
          peRatio: 0,    // brapi não tem pra índice
          divYield: 0,   // brapi não tem pra índice
          marketCap: 0,  // brapi não tem pra índice
          volume: q.volume ?? 0,
          source: "brapi",
        });
      } catch (err) {
        console.error(`[indexes] brapi failed for ${entry.brapi}:`, err);
        out.push(fallbackToMock(entry));
      }
    }

    return NextResponse.json({ indexes: out });
  });
}

function fallbackToMock(entry: typeof INDEX_REGISTRY[number]): IndexLive {
  return {
    symbol: entry.symbol,
    name: entry.name,
    country: entry.country,
    brapi: null,
    price: entry.mock.price,
    change: entry.mock.changePercent * entry.mock.price / 100,
    changePercent: entry.mock.changePercent,
    ytdPercent: entry.mock.ytdPercent,
    peRatio: entry.mock.peRatio,
    divYield: entry.mock.divYield,
    marketCap: entry.mock.marketCap,
    volume: entry.mock.volume,
    source: "mock",
  };
}
