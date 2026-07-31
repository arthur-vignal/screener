import { NextRequest, NextResponse } from "next/server";
import { getFinancials, getProfile, getQuote } from "@/lib/finnhub";
import { getYahooQuote } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  try {
    const metrics = await Promise.allSettled(
      symbols.map(async (ticker) => {
        const [quote, profile, fins, yahoo] = await Promise.allSettled([
          getQuote(ticker),
          getProfile(ticker),
          getFinancials(ticker),
          getYahooQuote(ticker),
        ]);
        const q = quote.status === "fulfilled" ? quote.value : null;
        const p = profile.status === "fulfilled" ? profile.value : null;
        const f = fins.status === "fulfilled" ? fins.value : null;
        const y = yahoo.status === "fulfilled" ? yahoo.value : null;
        const m = f?.metric ?? {};
        return {
          ticker,
          price: y?.price ?? q?.c ?? 0,
          changePercent: y?.changePercent ?? q?.dp ?? 0,
          marketCap: p?.marketCapitalization ?? null,
          peRatio: m.peBasicExtraTTM ?? null,
          priceToBook: m.priceToBookRatio ?? null,
          roe: m.roeTTM ? m.roeTTM * 100 : null,
          dividendYield: m.dividendYieldIndicatedAnnual ?? null,
          beta: m.beta ?? null,
        };
      }),
    );
    const out: Array<{
      ticker: string;
      price: number;
      changePercent: number;
      marketCap: number | null;
      peRatio: number | null;
      priceToBook: number | null;
      roe: number | null;
      dividendYield: number | null;
      beta: number | null;
    }> = [];
    for (const r of metrics) {
      if (r.status === "fulfilled") out.push(r.value);
    }
    return NextResponse.json({ metrics: out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
