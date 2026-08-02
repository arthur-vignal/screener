import { NextRequest, NextResponse } from "next/server";
import { getAssetQuotes, getAssetType, getSectorsFor } from "@/lib/assets";

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
    // Single batch request via Spark endpoint (was N parallel requests before)
    const [quoteMap, sectors] = await Promise.all([
      getAssetQuotes(symbols),
      getSectorsFor(symbols),
    ]);

    const rows = symbols.map((sym) => {
      const upper = sym.toUpperCase();
      return {
        symbol: upper,
        type: getAssetType(upper),
        sector: sectors.get(upper) ?? "—",
        quote: quoteMap.get(upper) ?? null,
      };
    });

    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
