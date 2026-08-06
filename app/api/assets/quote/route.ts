import { NextRequest, NextResponse } from "next/server";
import { getFundamentalsBatch } from "@/lib/fundamentals";
import { getAssetType } from "@/lib/assets";
import { getFinvizStock } from "@/lib/finviz";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseFinvizMarketCap(value: string | undefined): number | null {
  if (!value || value === "-") return null;
  const match = value.replace(/,/g, "").match(/^(-?[\d.]+)([TBMG])?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const multiplier = { T: 1e12, B: 1e9, M: 1e6, G: 1e9 }[match[2]?.toUpperCase() as "T" | "B" | "M" | "G"] ?? 1;
  return Number.isFinite(amount) ? amount * multiplier : null;
}

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no symbols" }, { status: 400 });
  }

  try {
    const fundMap = await getFundamentalsBatch(symbols);
    const finvizBySymbol = new Map<string, Awaited<ReturnType<typeof getFinvizStock>> | null>();
    const finvizResults = await Promise.allSettled(symbols.map((sym) => getFinvizStock(sym)));
    finvizResults.forEach((result, index) => {
      finvizBySymbol.set(symbols[index].toUpperCase(), result.status === "fulfilled" ? result.value : null);
    });

    const rows = symbols.map((sym) => {
      const upper = sym.toUpperCase();
      const f = fundMap.get(upper);
      return {
        symbol: upper,
        type: getAssetType(upper),
        sector: f?.sector ?? "—",
        quote: f
          ? {
              symbol: upper,
              price: f.price,
              prevClose: f.prevClose,
              change: f.change,
              changePercent: f.changePercent,
              currency: "USD",
              dayHigh: f.dayHigh,
              dayLow: f.dayLow,
              dayOpen: 0,
              volume: f.volume,
              fiftyTwoWeekHigh: f.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: f.fiftyTwoWeekLow,
            }
          : null,
        // Also include metrics for /assets to display
        metrics: f
          ? {
              pe: f.pe,
              pb: f.pb,
              roe: f.roe,
              roic: f.roic,
              netMargin: f.netMargin,
              operatingMargin: f.operatingMargin,
              marketCap: f.marketCap ?? parseFinvizMarketCap(finvizBySymbol.get(upper)?.snapshot["Market Cap"]),
              eps: f.eps,
              bookValuePerShare: f.bookValuePerShare,
              dividendYield: f.ps ? null : null,
            }
          : {
              marketCap: parseFinvizMarketCap(finvizBySymbol.get(upper)?.snapshot["Market Cap"]),
            },
      };
    });

    return NextResponse.json({ rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
