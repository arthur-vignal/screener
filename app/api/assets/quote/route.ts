import { NextRequest, NextResponse } from "next/server";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";
import { isBrazilianTicker } from "@/lib/brapi";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  // Single source of truth: Brapi Pro (covers SP500 + B3).
  // Yahoo/Finnhub only used as fallback inside brapi-quote-batch when
  // Brapi doesn't have a symbol.
  const quoteMap = await getBrapiQuoteBatch(symbols);

  try {
    const rows = symbols.map((sym) => {
      const upper = sym.toUpperCase();
      const b = quoteMap.get(upper);
      const isBr = isBrazilianTicker(upper);

      if (!b) {
        return {
          symbol: upper,
          type: "stock" as const,
          sector: IBOV_BY_SYMBOL[upper]?.sector ?? "—",
          quote: null,
          metrics: { marketCap: null },
        };
      }

      const q = b;
      const currency = q.currency || (isBr ? "BRL" : "USD");
      const sector = q.sector ?? IBOV_BY_SYMBOL[upper]?.sector ?? "—";

      return {
        symbol: upper,
        type: "stock" as const,
        sector,
        quote: {
          symbol: upper,
          price: q.price ?? 0,
          prevClose: q.prevClose ?? 0,
          change: q.change ?? 0,
          changePercent: q.changePercent ?? 0,
          currency,
          dayHigh: q.dayHigh ?? 0,
          dayLow: q.dayLow ?? 0,
          dayOpen: q.dayOpen ?? 0,
          volume: q.volume ?? 0,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
        },
        metrics: {
          marketCap: q.marketCap ?? null,
          pe: null,
          pb: null,
          roe: null,
          roic: null,
          netMargin: null,
          operatingMargin: null,
          eps: null,
          bookValuePerShare: null,
          dividendYield: null,
        },
      };
    });

    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
