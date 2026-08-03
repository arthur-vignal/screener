import { NextRequest, NextResponse } from "next/server";
import { getAssetQuotes } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MACRO_SYMBOLS: { symbol: string; label: string; description: string }[] = [
  { symbol: "^VIX", label: "VIX", description: "Volatilidade implícita S&P 500" },
  { symbol: "DX-Y.NYB", label: "DXY", description: "Dollar Index" },
  { symbol: "^TNX", label: "US 10Y", description: "Treasury 10 anos" },
  { symbol: "GC=F", label: "Gold", description: "Ouro (USD/oz)" },
  { symbol: "BTC-USD", label: "BTC", description: "Bitcoin" },
  { symbol: "ETH-USD", label: "ETH", description: "Ethereum" },
];

export async function GET(_req: NextRequest) {
  const symbols = MACRO_SYMBOLS.map((m) => m.symbol);
  const quoteMap = await getAssetQuotes(symbols);

  const data = MACRO_SYMBOLS.map((m) => {
    const q = quoteMap.get(m.symbol);
    return {
      symbol: m.symbol,
      label: m.label,
      description: m.description,
      price: q?.price ?? null,
      change: q?.change ?? null,
      changePercent: q?.changePercent ?? null,
    };
  });

  return NextResponse.json({ macro: data, timestamp: Date.now() });
}
