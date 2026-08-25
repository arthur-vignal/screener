import { NextRequest, NextResponse } from "next/server";
import { getBrapiFundamentals } from "@/lib/brapi";

/**
 * /api/asset/[symbol] — single ticker bundle.
 *
 * Returns the quote + fundamentals. The candle series is fetched
 * separately via /api/asset/[symbol]/candles?range=… so the
 * per-range cache can be sliced independently.
 *
 * Cache: 60s for the bundle (quote can change intraday; fundamentals
 * are stable but we re-validate the ticker exists on every refresh).
 *
 * Returns 404 when the ticker doesn't exist (no Brapi results).
 *
 * Response shape (2026-08-24 — drill-down F1):
 *   quote        — live price + 52w + volume
 *   metrics      — the small set the home strip uses
 *   profile      — full summaryProfile (sector, industry, summary, …)
 *   keyStatistics — full defaultKeyStatistics (beta, forwardPE, P/B, …)
 *   financialData — full financialData (margins, growth, balance basics, …)
 *   historicals  — yearly incomeStatementHistory + balanceSheetHistory
 *                  (16 entries — used by /profitability, /income, etc)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const data = await getBrapiFundamentals(symbol);
  if (!data) {
    return NextResponse.json({ error: "Ticker inválido" }, { status: 404 });
  }

  const q = data.quote;
  const ks = data.keyStatistics ?? {};
  const fd = data.financialData ?? {};
  const profile = data.profile ?? {};

  return NextResponse.json({
    symbol: q.symbol,
    shortName: q.shortName,
    longName: q.longName,
    sector: profile.sector ?? "—",
    industry: profile.industry ?? "—",
    currency: q.currency,
    marketState: q.marketState,
    logoUrl: q.logoUrl ?? profile.logoUrl ?? null,

    quote: {
      price: q.price,
      prevClose: q.prevClose,
      change: q.change,
      changePercent: q.changePercent,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      dayOpen: q.dayOpen,
      volume: q.volume,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      marketCap: q.marketCap,
      marketTime: q.marketTime,
    },

    metrics: {
      sector: profile.sector ?? "—",
      marketCap: q.marketCap,
      trailingPE: q.trailingPE,
      returnOnEquity: ks.returnOnEquity ?? fd.returnOnEquity ?? null,
      ebitda: fd.ebitda ?? null,
      freeCashflow: fd.freeCashflow ?? ks.freeCashflow ?? null,
      dividendYield: ks.trailingAnnualDividendYield ?? null,
    },

    // Full payloads — sub-pages pull from these.
        profile,
        keyStatistics: ks,
        financialData: fd,
        candles: data.candles ?? [],
        historicals: data.historicals ?? {
          income: [],
          balance: [],
          cashflow: [],
          valueAdded: [],
          keyStatistics: [],
          financialData: [],
        },
      });
    }