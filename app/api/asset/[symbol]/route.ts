import { NextRequest, NextResponse } from "next/server";
import {
  brapiQuote,
  brapiProfile,
  brapiStatistics,
  brapiFinancialData,
  brapiBalanceSheet,
  brapiIncomeStatement,
  brapiCashflow,
  brapiHistorical,
  normalizeYield,
} from "@/lib/brapi";

/**
 * /api/asset/[symbol] — single ticker bundle.
 *
 * Migrado pra brapi v2 (2026-08-30): chama os wrappers granulares em paralelo
 * (quote, profile, statistics current, financial-data current, balance annual,
 * income annual, cashflow annual, historical 1Y). v2 separa profile + historical
 * + fundamentals em endpoints próprios (vs antigo `/api/quote/{t}?modules=...`).
 *
 * Cache: 60s pra quote, 30min pra fundamentals current, 6h pra history.
 * Wrapper individual já cacheia — aqui só orquestramos.
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

  // Fan-out em paralelo — v2 endpoints são independentes.
  const [
    quoteMap,
    profile,
    ksCurrentRaw,
    fdCurrentRaw,
    balanceAnnual,
    incomeAnnual,
    cashflowAnnual,
    candles,
  ] = await Promise.all([
    brapiQuote([symbol]),
    brapiProfile(symbol),
    brapiStatistics({ symbol, mode: "current", period: "annual" }),
    brapiFinancialData({ symbol, mode: "current" }),
    brapiBalanceSheet({ symbol, period: "annual" }),
    brapiIncomeStatement({ symbol, period: "annual" }),
    brapiCashflow({ symbol, period: "annual" }),
    brapiHistorical(symbol, { range: "1y", interval: "1d" }),
  ]);

  const q = quoteMap.get(symbol);
  if (!q) {
    return NextResponse.json({ error: "Ticker inválido" }, { status: 404 });
  }

  // ks/fd em modo current são objetos únicos, não array
  const ks = (ksCurrentRaw && !Array.isArray(ksCurrentRaw) ? ksCurrentRaw : {}) as Record<string, unknown>;
  const fd = (fdCurrentRaw && !Array.isArray(fdCurrentRaw) ? fdCurrentRaw : {}) as Record<string, unknown>;

  return NextResponse.json({
    symbol: q.symbol,
    shortName: q.shortName,
    longName: q.longName,
    sector: profile?.sector ?? "—",
    industry: profile?.industry ?? "—",
    currency: q.currency,
    marketState: q.marketState,
    logoUrl: q.logoUrl ?? profile?.logoUrl ?? null,

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
      sector: profile?.sector ?? "—",
      marketCap: q.marketCap,
      // P/L não vem mais no quote v2 (separado em /statistics). ks.trailingPE
      // é o source atual. Fallback null.
      trailingPE: (ks.trailingPE as number | null | undefined) ?? null,
      returnOnEquity:
        (ks.returnOnEquity as number | null | undefined) ??
        (fd.returnOnEquity as number | null | undefined) ??
        null,
      ebitda: (fd.ebitda as number | null | undefined) ?? null,
      freeCashflow:
        (fd.freeCashflow as number | null | undefined) ?? null,
      dividendYield:
        normalizeYield(ks.yield as number | null | undefined) ??
        normalizeYield(ks.dividendYield as number | null | undefined) ??
        null,
      evToSales:
        (ks.enterpriseToRevenue as number | null | undefined) ??
        (fd.enterpriseToRevenue as number | null | undefined) ??
        null,
      revenue: (fd.totalRevenue as number | null | undefined) ?? null,
      eps: (ks.trailingEps as number | null | undefined) ?? null,
      forwardEps: (ks.forwardEps as number | null | undefined) ?? null,
      grossMargin: (fd.grossMargins as number | null | undefined) ?? null,
      profitMargin: (fd.profitMargins as number | null | undefined) ?? null,
      beta: (ks.beta as number | null | undefined) ?? null,
      // Price target — sempre null pra BR (sem sell-side)
      targetHighPrice: (fd.targetHighPrice as number | null | undefined) ?? null,
      targetLowPrice: (fd.targetLowPrice as number | null | undefined) ?? null,
      targetMeanPrice: (fd.targetMeanPrice as number | null | undefined) ?? null,
      targetMedianPrice: (fd.targetMedianPrice as number | null | undefined) ?? null,
      recommendationMean: (fd.recommendationMean as number | null | undefined) ?? null,
      recommendationKey: (fd.recommendationKey as string | null | undefined) ?? null,
      numberOfAnalystOpinions:
        (fd.numberOfAnalystOpinions as number | null | undefined) ?? null,
    },

    // Full payloads — sub-pages pull from these.
    profile: profile ?? {},
    // trailingPE pode estar em ks.current — espelha no objeto final pra
    // consistência com consumers antigos.
    keyStatistics: {
      ...ks,
      trailingPE: (ks.trailingPE as number | null | undefined) ?? null,
    },
    financialData: fd,
    candles: candles ?? [],
    historicals: {
      income: incomeAnnual ?? [],
      incomeQuarterly: [],
      balance: balanceAnnual ?? [],
      cashflow: cashflowAnnual ?? [],
      valueAdded: [],
      keyStatistics: [],
      financialData: [],
    },
  });
}