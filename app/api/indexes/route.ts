/**
 * /api/indexes — bundle de índices B3 pro painel Macro.
 *
 * Fonte primária: brapi v2. Brapi cobre ^BVSP (Ibovespa) e IFIX.SA
 * (IFIX) como índice direto — verificado 2026-09-04 com token Pro.
 * Os outros 7 índices (SMLL, IDIV, BDRX, IEE, IVBX-2, IBXL-2, IBRA)
 * não estão na brapi como índice. Proxy via ETF foi descontinuado
 * (preço do ETF diverge da pontuação do índice, Arthur pediu 2026-09-04).
 *
 * YTD: calculado a partir de candles anuais.
 */

import { NextResponse } from "next/server";

import { brapiHistorical, brapiQuote } from "@/lib/brapi";
import { cached } from "@/lib/cache";
import { INDEX_REGISTRY, type IndexLive } from "@/lib/indexes";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(): Promise<NextResponse<{ indexes: IndexLive[] }>> {
  return cached("brapi:v2:indexes:all:v4", 5 * 60, async () => {
    const out: IndexLive[] = [];

    for (const entry of INDEX_REGISTRY) {
      // ── Mock (brapi null) ──
      if (!entry.brapi) {
        out.push({
          symbol: entry.symbol,
          name: entry.name,
          country: entry.country,
          source: null,
          price: entry.mock.price,
          change: entry.mock.changePercent * entry.mock.price / 100,
          changePercent: entry.mock.changePercent,
          ytdPercent: entry.mock.ytdPercent,
          peRatio: entry.mock.peRatio,
          divYield: entry.mock.divYield,
          marketCap: entry.mock.marketCap,
          volume: entry.mock.volume,
          sourceKind: "mock",
        });
        continue;
      }

      // ── Brapi real ──
      try {
        const [quoteMap, hist1y] = await Promise.all([
          brapiQuote([entry.brapi]),
          brapiHistorical(entry.brapi, { range: "1y", interval: "1d" }),
        ]);
        const q = quoteMap.get(entry.brapi);
        if (!q || q.price == null) {
          out.push(fallbackToMock(entry));
          continue;
        }
        // Brapi v2 retorna candles em ordem decrescente (newest first).
        // Normaliza pra ascendente antes de qualquer lookup.
        const sorted = [...hist1y].sort((a, b) => a.timestamp - b.timestamp);
        const yearStart = new Date();
        yearStart.setMonth(0, 1);
        yearStart.setHours(0, 0, 0, 0);
        const firstOfYear = sorted.find((c) => c.timestamp >= yearStart.getTime());
        const ytdPercent = firstOfYear && firstOfYear.close > 0
          ? ((q.price - firstOfYear.close) / firstOfYear.close) * 100
          : 0;
        out.push({
          symbol: entry.symbol,
          name: entry.name,
          country: entry.country,
          source: entry.brapi,
          price: q.price,
          change: q.change ?? 0,
          changePercent: q.changePercent ?? 0,
          ytdPercent,
          peRatio: 0,
          divYield: 0,
          marketCap: 0,
          volume: q.volume ?? 0,
          sourceKind: "brapi",
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
    source: null,
    price: entry.mock.price,
    change: entry.mock.changePercent * entry.mock.price / 100,
    changePercent: entry.mock.changePercent,
    ytdPercent: entry.mock.ytdPercent,
    peRatio: entry.mock.peRatio,
    divYield: entry.mock.divYield,
    marketCap: entry.mock.marketCap,
    volume: entry.mock.volume,
    sourceKind: "mock",
  };
}
