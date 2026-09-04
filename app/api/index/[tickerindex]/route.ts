/**
 * /api/index/[tickerindex] — bundle pra página de índice.
 *
 * Mesma estratégia do /api/indexes (brapi v2 com fallback mock),
 * mas só pro símbolo pedido. Inclui série histórica completa pra
 * alimentar o price chart.
 *
 * Quote + historical 1y (5d) em paralelo. YTD recalculado local.
 */

import { NextRequest, NextResponse } from "next/server";

import { brapiHistorical, brapiQuote } from "@/lib/brapi";
import { cached } from "@/lib/cache";
import {
  findIndex,
  type IndexLive,
} from "@/lib/indexes";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tickerindex: string }> },
) {
  const { tickerindex: raw } = await params;
  const symbol = raw.toUpperCase();

  const entry = findIndex(symbol);
  if (!entry) {
    return NextResponse.json(
      { error: "Índice desconhecido" },
      { status: 404 },
    );
  }

  return cached(`brapi:v2:index:${symbol}:v1`, 5 * 60, async () => {
    // Mock fallback
    if (!entry.brapi) {
      const idx: IndexLive = {
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
      return NextResponse.json({
        index: idx,
        candles: generateMockCandles(idx.price, idx.changePercent),
      });
    }

    // Brapi real
    try {
      const [quoteMap, hist1y, hist5y] = await Promise.all([
        brapiQuote([entry.brapi]),
        brapiHistorical(entry.brapi, { range: "1y", interval: "1d" }),
        brapiHistorical(entry.brapi, { range: "5y", interval: "1d" }),
      ]);
      const q = quoteMap.get(entry.brapi);
      if (!q || q.price == null) {
        return NextResponse.json(
          { error: "Ticker sem cotação" },
          { status: 502 },
        );
      }
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const firstOfYear = hist1y.find((c) => c.timestamp >= yearStart.getTime());
      const ytdPercent = firstOfYear && firstOfYear.close > 0
        ? ((q.price - firstOfYear.close) / firstOfYear.close) * 100
        : 0;
      const idx: IndexLive = {
        symbol: entry.symbol,
        name: entry.name,
        country: entry.country,
        brapi: entry.brapi,
        price: q.price,
        change: q.change ?? 0,
        changePercent: q.changePercent ?? 0,
        ytdPercent,
        peRatio: 0,
        divYield: 0,
        marketCap: 0,
        volume: q.volume ?? 0,
        source: "brapi",
      };
      // Usa 5y se tiver histórico suficiente, senão 1y
      const candles = (hist5y.length >= 250 ? hist5y : hist1y).map((c) => ({
        date: c.date,
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        adjClose: c.adjClose,
        volume: c.volume,
      }));
      return NextResponse.json({ index: idx, candles });
    } catch (err) {
      console.error(`[index/${symbol}] brapi failed:`, err);
      return NextResponse.json(
        { error: "Falha brapi" },
        { status: 502 },
      );
    }
  });
}

/** Mock: gera 252 candles (1 ano útil) com pequena variação em torno do preço. */
function generateMockCandles(price: number, changePercent: number) {
  const out = [];
  let value = price / (1 + changePercent / 100); // começa atrás
  const now = Date.now();
  const dayMs = 86_400_000;
  for (let i = 0; i < 252; i++) {
    const drift = (Math.sin(i * 0.13) + Math.cos(i * 0.27)) * 0.0035;
    value *= 1 + drift;
    out.push({
      date: new Date(now - (252 - i) * dayMs).toISOString().slice(0, 10),
      timestamp: now - (252 - i) * dayMs,
      open: value * 0.998,
      high: value * 1.005,
      low: value * 0.995,
      close: value,
      adjClose: value,
      volume: 0,
    });
  }
  // garante que o último candle bata com o preço atual
  out[out.length - 1].close = price;
  out[out.length - 1].adjClose = price;
  return out;
}
