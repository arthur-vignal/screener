import { NextRequest, NextResponse } from "next/server";
import { getYahooSummary } from "@/lib/yahoo";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Batch fundamentals for multiple symbols.
 * Used by the rich portfolio table to fetch fundamentals for all holdings at once.
 */
export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "").split(",").filter(Boolean);
  if (symbols.length === 0) {
    return NextResponse.json({});
  }

  // Fetch all in parallel
  const results = await Promise.all(
    symbols.map(async (sym) => {
      const upper = sym.toUpperCase();
      const data = await cached(
        `fund:${upper}`,
        6 * 3600,
        async () => {
          const summary = await getYahooSummary(upper);
          return summary ? { ticker: upper, current: summary, sparklines: {} } : null;
        },
      );
      return [upper, data] as const;
    }),
  );

  const map: Record<string, unknown> = {};
  for (const [sym, data] of results) {
    if (data) map[sym] = data;
  }
  return NextResponse.json(map);
}