import { NextRequest, NextResponse } from "next/server";
import { getBrapiFundamentals, normalizeYield } from "@/lib/brapi";

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
      // P/L unificado: prioriza o trailingPE do quote (normalizado de
      // raw.priceEarnings no lib/brapi.ts), cai pra ks.trailingPE (snapshot).
      // Sobrescreve ks.trailingPE pra que toda UI leia o mesmo número.
      trailingPE: q.trailingPE ?? ks.trailingPE ?? null,
      returnOnEquity: ks.returnOnEquity ?? fd.returnOnEquity ?? null,
      ebitda: fd.ebitda ?? null,
      freeCashflow: fd.freeCashflow ?? ks.freeCashflow ?? null,
      // Dividend Yield: a Brapi v2 retorna `yield` E `dividendYield` como
      // decimais (fração 0-1) na prática, embora o `/dictionary` diga
      // `unit='%'` para `yield`. Heurística: se o valor for < 0.5, trata
      // como decimal e multiplica por 100; senão, deixa como está.
      // (PETR4 paga ~9%, mas o bundle retorna 0.09 — bug da Brapi.)
      dividendYield: normalizeYield(ks.yield) ?? normalizeYield(ks.dividendYield) ?? null,
      // Métricas extras pra /asset/[symbol] MetricStrip (estilo Fey TSLA)
      // Brapi v2 retorna EV/Sales em defaultKeyStatistics.enterpriseToRevenue
      // ou como campo raw no payload (algumas versões). Cobre ambos.
      evToSales:
        (ks as Record<string, unknown>).enterpriseToRevenue as
          | number
          | null
          | undefined ??
        (fd as Record<string, unknown>).enterpriseToRevenue as
          | number
          | null
          | undefined ??
        null,
      revenue: fd.totalRevenue ?? null,
      eps: ks.trailingEps ?? null,
      forwardEps: ks.forwardEps ?? null,
      grossMargin: fd.grossMargins ?? null,
      profitMargin: fd.profitMargins ?? null,
      beta: ks.beta ?? null,
      // Price target (vem de financialData na Brapi v2)
      targetHighPrice: fd.targetHighPrice ?? null,
      targetLowPrice: fd.targetLowPrice ?? null,
      targetMeanPrice: fd.targetMeanPrice ?? null,
      targetMedianPrice: fd.targetMedianPrice ?? null,
      recommendationMean: fd.recommendationMean ?? null,
      recommendationKey: fd.recommendationKey ?? null,
      numberOfAnalystOpinions: fd.numberOfAnalystOpinions ?? null,
    },

    // Full payloads — sub-pages pull from these.
        profile,
        // Sobrescreve keyStatistics.trailingPE com o valor unificado
        // para que toda UI (metrics-strip, /valuation, MetricsTable)
        // leia o mesmo número. Sem isso, /valuation via metrics.trailingPE
        // = 4.14 (live) e MetricsTable via ks.trailingPE = 7.99 (snapshot).
        keyStatistics: {
          ...ks,
          trailingPE: q.trailingPE ?? ks.trailingPE ?? null,
        },
        financialData: fd,
        candles: data.candles ?? [],
        historicals: data.historicals ?? {
          income: [],
          incomeQuarterly: [],
          balance: [],
          cashflow: [],
          valueAdded: [],
          keyStatistics: [],
          financialData: [],
        },
      });
    }