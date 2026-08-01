import { NextRequest, NextResponse } from "next/server";
import { getAssetQuote, getAssetType, getSectorsFor } from "@/lib/assets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  try {
    const [quotes, sectors] = await Promise.all([
      Promise.all(symbols.map((s) => getAssetQuote(s).then((q) => ({ symbol: s.toUpperCase(), quote: q })))),
      getSectorsFor(symbols),
    ]);

    const rows = quotes.map((q) => {
      const upper = q.symbol;
      return {
        symbol: upper,
        type: getAssetType(upper),
        sector: sectors.get(upper) ?? "—",
        quote: q.quote,
      };
    });

    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
