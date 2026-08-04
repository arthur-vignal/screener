import { NextResponse } from "next/server";
import { getAssetQuotes } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

type Ticker = {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  href: string;
};

// Cross-market symbols: crypto + traditional + brazilian + macro + fees
const TICKER_SYMBOLS: { symbol: string; label: string; href: string }[] = [
  { symbol: "BTC-USD", label: "BTC", href: "/crypto" },
  { symbol: "ETH-USD", label: "ETH", href: "/crypto" },
  { symbol: "SOL-USD", label: "SOL", href: "/crypto" },
  { symbol: "^GSPC", label: "S&P 500", href: "/assets?q=spy" },
  { symbol: "^DJI", label: "Dow", href: "/assets?q=dia" },
  { symbol: "^IXIC", label: "Nasdaq", href: "/assets?q=qqq" },
  { symbol: "^BVSP", label: "Ibovespa", href: "/assets?q=ewz" },
  { symbol: "^TNX", label: "US 10Y", href: "/analysis/stats" },
  { symbol: "^VIX", label: "VIX", href: "/analysis/stats" },
  { symbol: "GC=F", label: "Gold", href: "/analysis/stats" },
  { symbol: "CL=F", label: "Oil", href: "/analysis/stats" },
  { symbol: "DX-Y.NYB", label: "DXY", href: "/analysis/stats" },
];

export async function GET() {
  const symbols = TICKER_SYMBOLS.map((t) => t.symbol);
  const quoteMap = await getAssetQuotes(symbols);

  const tickers: Ticker[] = TICKER_SYMBOLS.map((t) => {
    const q = quoteMap.get(t.symbol);
    return {
      symbol: t.symbol,
      label: t.label,
      price: q?.price ?? null,
      change: q?.change ?? null,
      changePercent: q?.changePercent ?? null,
      href: t.href,
    };
  });

  return NextResponse.json({ tickers, timestamp: Date.now() });
}
