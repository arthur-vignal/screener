import { NextRequest, NextResponse } from "next/server";
import { getFundamentalsBatch } from "@/lib/fundamentals";
import { getAssetType } from "@/lib/assets";
import { getFinvizStock } from "@/lib/finviz";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";
import { isBrazilianTicker } from "@/lib/brapi";

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

  // Partition: BR tickers go to Brapi (better data for BDRs / B3 specifics),
  // US tickers keep the existing Yahoo/Finnhub/SEC/Finviz pipeline.
  const brSymbols = symbols.filter((s) => isBrazilianTicker(s));
  const usSymbols = symbols.filter((s) => !isBrazilianTicker(s));

  // Fan out the two sources in parallel.
  const [brapiMap, fundMap, finvizResults] = await Promise.all([
    brSymbols.length > 0 ? getBrapiQuoteBatch(brSymbols) : Promise.resolve(new Map()),
    usSymbols.length > 0 ? getFundamentalsBatch(usSymbols) : Promise.resolve(new Map()),
    Promise.allSettled(usSymbols.map((sym) => getFinvizStock(sym))),
  ]);

  const finvizBySymbol = new Map<string, Awaited<ReturnType<typeof getFinvizStock>> | null>();
  finvizResults.forEach((result, index) => {
    finvizBySymbol.set(
      usSymbols[index].toUpperCase(),
      result.status === "fulfilled" ? result.value : null,
    );
  });

  try {
    const rows = symbols.map((sym) => {
      const upper = sym.toUpperCase();
      const isBr = isBrazilianTicker(upper);

      if (isBr) {
        // BR path: Brapi.
        const b = brapiMap.get(upper);
        if (!b) {
          // Brapi failed (no data for this ticker) — return placeholder so the
          // table renders an "—" instead of crashing.
          return {
            symbol: upper,
            type: getAssetType(upper),
            sector: IBOV_BY_SYMBOL[upper]?.sector ?? "—",
            quote: null,
            metrics: { marketCap: null },
          };
        }
        const f = b.quote;
        return {
          symbol: upper,
          type: "stock",
          sector: b.sector ?? IBOV_BY_SYMBOL[upper]?.sector ?? "—",
          quote: f
            ? {
                symbol: upper,
                price: f.price ?? 0,
                prevClose: f.prevClose ?? 0,
                change: f.change ?? 0,
                changePercent: f.changePercent ?? 0,
                currency: f.currency || "BRL",
                dayHigh: f.dayHigh ?? 0,
                dayLow: f.dayLow ?? 0,
                dayOpen: f.dayOpen ?? 0,
                volume: f.volume ?? 0,
                fiftyTwoWeekHigh: f.fiftyTwoWeekHigh ?? 0,
                fiftyTwoWeekLow: f.fiftyTwoWeekLow ?? 0,
              }
            : null,
          metrics: {
            marketCap: b.metrics?.marketCap ?? null,
            pe: b.metrics?.pe ?? null,
            pb: b.metrics?.pb ?? null,
            roe: b.metrics?.roe ?? null,
            roic: null,
            netMargin: null,
            operatingMargin: null,
            eps: null,
            bookValuePerShare: null,
            dividendYield: null,
          },
        };
      }

      // US path: legacy Yahoo/Finnhub/SEC pipeline.
      const f = fundMap.get(upper);
      const sector = f?.sector ?? "—";
      const currency = "USD";
      return {
        symbol: upper,
        type: getAssetType(upper),
        sector,
        quote: f
          ? {
              symbol: upper,
              price: f.price,
              prevClose: f.prevClose,
              change: f.change,
              changePercent: f.changePercent,
              currency,
              dayHigh: f.dayHigh,
              dayLow: f.dayLow,
              dayOpen: 0,
              volume: f.volume,
              fiftyTwoWeekHigh: f.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: f.fiftyTwoWeekLow,
            }
          : null,
        metrics: f
          ? {
              pe: f.pe,
              pb: f.pb,
              roe: f.roe,
              roic: f.roic,
              netMargin: f.netMargin,
              operatingMargin: f.operatingMargin,
              marketCap:
                f.marketCap ?? parseFinvizMarketCap(finvizBySymbol.get(upper)?.snapshot["Market Cap"]),
              eps: f.eps,
              bookValuePerShare: f.bookValuePerShare,
              dividendYield: null,
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
