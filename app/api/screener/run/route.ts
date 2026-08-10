/**
 * GET /api/screener/run?symbols=PETR4,VALE3,...
 *
 * Returns fundamentals for a list of symbols: P/L, market cap, ROE proxy,
 * dividend yield. All computed from Brapi quote (price, marketCap, eps)
 * + IBOV sector map. Brapi's /quote does NOT return P/VP, EV/EBITDA,
 * debt-to-equity, or proper ROE — those require balance-sheet endpoints
 * that are behind Cloudflare anti-bot. We mark them null in the response
 * and the UI surfaces "n/d" so the limitation is visible.
 */

import { NextRequest, NextResponse } from "next/server";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";
import { ttmDividendsPerShare } from "@/lib/brapi-dividends";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (symbols.length === 0) {
    return NextResponse.json({ results: [], error: "no symbols" }, { status: 400 });
  }

  try {
    const quoteMap = await getBrapiQuoteBatch(symbols);

    // Pull dividends in parallel
    const divMap = new Map<string, number>();
    await Promise.all(
      symbols.map(async (s) => {
        const ttm = await ttmDividendsPerShare(s);
        divMap.set(s.toUpperCase(), ttm);
      }),
    );

    const results: Array<{
      symbol: string;
      name: string | null;
      sector: string | null;
      price: number | null;
      peRatio: number | null;
      marketCap: number | null;
      roeProxy: number | null;
      dividendYield: number | null;
      ttmDividends: number | null;
    }> = [];

    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      const b = quoteMap.get(upper);
      const ttmDiv = divMap.get(upper) ?? 0;
      const price = b?.price ?? null;
      const eps = b?.earningsPerShare ?? null;
      const pe =
        b?.priceEarnings ??
        (price && eps && eps > 0 ? price / eps : null);
      const roe = pe && pe > 0 ? 100 / pe : null;
      const dy = price && ttmDiv > 0 ? (ttmDiv / price) * 100 : null;

      results.push({
        symbol: upper,
        name: b?.longName ?? null,
        sector: b?.sector ?? IBOV_BY_SYMBOL[upper]?.sector ?? null,
        price,
        peRatio: pe ?? null,
        marketCap: b?.marketCap ?? null,
        roeProxy: roe,
        dividendYield: dy,
        ttmDividends: ttmDiv || null,
      });
    }

    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
