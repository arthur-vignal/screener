/**
 * /api/index/[tickerindex] — bundle pra página de índice.
 *
 * Estratégia por índice (definida em lib/indexes.ts):
 *   1. Se `entry.brapi` existir → brapi v2 (5y de histórico)
 *   2. Senão → mock (dados + candles sintéticos)
 *
 * Brapi v2 cobre ^BVSP (Ibovespa) e IFIX.SA (IFIX) como índice
 * direto. Os outros 7 (SMLL, IDIV, BDRX, IEE, IVBX-2, IBXL-2, IBRA)
 * não estão na brapi como índice. Proxy via ETF foi descontinuado
 * em 2026-09-04 (preço do ETF diverge da pontuação do índice).
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

  return cached(`brapi:v2:index:${symbol}:v2`, 5 * 60, async () => {
    // Mock fallback (brapi null)
    if (!entry.brapi) {
      const idx: IndexLive = {
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
      return NextResponse.json({
        index: idx,
        candles: generateMockCandles(idx.price, idx.changePercent),
      });
    }

    // Brapi real (5y)
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
      // Brapi v2 retorna candles em ordem decrescente (newest first).
      // Normaliza pra ascendente (oldest first) antes de qualquer
      // lookup ou retorno — senão YTD pega candle errado e o chart
      // fica espelhado no eixo X.
      const sorted1y = [...hist1y].sort((a, b) => a.timestamp - b.timestamp);
      const sorted5y = [...hist5y].sort((a, b) => a.timestamp - b.timestamp);
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const firstOfYear = sorted1y.find((c) => c.timestamp >= yearStart.getTime());
      const ytdPercent = firstOfYear && firstOfYear.close > 0
        ? ((q.price - firstOfYear.close) / firstOfYear.close) * 100
        : 0;
      const idx: IndexLive = {
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
      };
      // Escolhe 5y se tiver histórico razoável (>= 250 candles ASC), senão 1y.
      const source = sorted5y.length >= 250 ? sorted5y : sorted1y;
      const candles = source.map((c) => ({
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
  let value = price / (1 + changePercent / 100);
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
  out[out.length - 1].close = price;
  out[out.length - 1].adjClose = price;
  return out;
}
