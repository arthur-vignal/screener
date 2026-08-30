import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import {
  brapiQuote,
  brapiProfile,
  brapiStatistics,
  brapiFinancialData,
  brapiBalanceSheet,
  brapiIncomeStatement,
  brapiCashflow,
  brapiHistorical,
  brapiTreasuryHistory,
} from "@/lib/brapi";
import {
  computeEarningsYieldHistory,
} from "@/lib/analytics/earnings-yield-history";
import {
  computeValuationBands,
  type MultiplesBands,
} from "@/lib/analytics/valuation-bands";
import { computeROICvsWACC, type ROICWACCSummary, type ROICWACCPoint } from "@/lib/analytics/roic-wacc";
import { computeLeverage, type LeverageSummary, type LeveragePoint } from "@/lib/analytics/leverage";
import { computeYieldComparison, type YieldPoint, type YieldSummary } from "@/lib/analytics/yield-comparison";
import { computeEquityRiskPremium, type EquityRiskPremiumPoint, type EquityRiskPremiumSummary, NTNB_LONG_SYMBOL } from "@/lib/analytics/equity-risk-premium";

/**
 * /api/asset/[symbol]/analysis — bundle consolidado pra página
 * /asset/[symbol]/analysis (drilldown com gráficos analíticos).
 *
 * Migrado pra brapi v2 (2026-08-30): usa wrappers granulares
 * (`brapiQuote`, `brapiProfile`, `brapiStatistics`, `brapiFinancialData`,
 * `brapiIncomeStatement`, etc) em vez do antigo `getBrapiFundamentals` +
 * módulos `?modules=financialDataHistoryQuarterly`.
 *
 * v2 já retorna histórico trimestral nativo em `mode=history&period=quarterly`
 * — substitui a chamada legacy `financialDataHistoryQuarterly` e simplifica
 * o pipeline. Antes era: v1 quote + v2 statistics + v1 module override;
 * agora é só v2.
 *
 * Cache: 30min bundle + 24h macro.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type MacroObs = { date: string; value: number };

// computeEarningsYieldHistory + EarningsYieldHistoryPoint foram movidos
// pra /lib/analytics/earnings-yield-history.ts — usado tanto aqui quanto
// em /api/asset/[symbol] (raiz) pra alimentar FairValueChart (A7).

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
} as const;

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, {
    headers: COMMON_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  return r.json();
}

async function fetchMacroObservations(
  symbols: string[],
): Promise<Record<string, MacroObs[]>> {
  if (symbols.length === 0) return {};
  try {
    // brapi limita ~20 obs sem filtros. Com `sortOrder=desc&limit=500`
    // retorna as 500 MAIS RECENTES — cobre ~1.5 anos pra SELIC/CDI e
    // 40 anos pra IBC-Br (mensal).
    const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
    const url = `https://brapi.dev/api/v2/macro?symbols=${symbols.join(",")}&sortOrder=desc&limit=500${token ? `&token=${encodeURIComponent(token)}` : ""}`;
    const data = (await fetchJson(url)) as {
      results?: Array<{
        series?: { slug?: string };
        observations?: MacroObs[];
      }>;
    };
    const out: Record<string, MacroObs[]> = {};
    for (const r of data.results ?? []) {
      if (r.series?.slug) {
        out[r.series.slug] = r.observations ?? [];
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  try {
    // Fan-out em paralelo: quote, profile, fundamentals current,
    // history trimestral (margins via financial-data history, income,
    // balance, cashflow), candles 1Y, stats history (price + trailingPE).
    // Cada wrapper cacheia independentemente — aqui só orquestramos.
    const [
      quoteMap,
      profile,
      ksCurrent,
      fdCurrent,
      fdHistoryRaw,
      incomeHistoryRaw,
      balanceHistoryRaw,
      cashflowHistoryRaw,
      candles,
      statsHistoryRaw,
      ntnbHistoryRaw,
    ] = await Promise.all([
      brapiQuote([symbol]),
      brapiProfile(symbol),
      brapiStatistics({ symbol, mode: "current", period: "annual" }),
      brapiFinancialData({ symbol, mode: "current" }),
      brapiFinancialData({ symbol, mode: "history", period: "quarterly" }),
      brapiIncomeStatement({ symbol, period: "quarterly" }),
      brapiBalanceSheet({ symbol, period: "quarterly" }),
      brapiCashflow({ symbol, period: "quarterly" }),
      brapiHistorical(symbol, { range: "1y", interval: "1d" }),
      brapiStatistics({ symbol, mode: "history", period: "quarterly" }),
      // B5: NTN-B 2045 (mais longa líquida listada, 19.7a duration)
      brapiTreasuryHistory(NTNB_LONG_SYMBOL),
    ]);

    const q = quoteMap.get(symbol);
    if (!q) {
      return NextResponse.json({ error: "Ticker inválido" }, { status: 404 });
    }

    // ks/fd em mode=current são objeto único
    const ks = (ksCurrent && !Array.isArray(ksCurrent) ? ksCurrent : {}) as Record<string, unknown>;
    const fd = (fdCurrent && !Array.isArray(fdCurrent) ? fdCurrent : {}) as Record<string, unknown>;

    // fdHistory é array de períodos
    const fdHistory = Array.isArray(fdHistoryRaw) ? fdHistoryRaw : [];
    const marginsHistory = fdHistory
      .filter((r) => r.endDate != null)
      .map((r) => ({
        endDate: r.endDate,
        grossMargins: r.grossMargins,
        operatingMargins: r.operatingMargins,
        profitMargins: r.profitMargins,
        ebitdaMargins: r.ebitdaMargins,
        revenueGrowth: r.revenueGrowth,
        earningsGrowth: r.earningsGrowth,
        returnOnEquity: r.returnOnEquity,
        returnOnAssets: r.returnOnAssets,
      }))
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    // incomeHistory com normalização de EPS em centavos (legado brapi quirk)
    const incomeHistory = incomeHistoryRaw
      .filter((r) => r.endDate != null)
      .map((r) => {
        const becs = r.basicEarningsPerCommonShare;
        const decs = r.dilutedEarningsPerCommonShare;
        const basicEps =
          r.basicEarningsPerShare != null && Number.isFinite(r.basicEarningsPerShare)
            ? r.basicEarningsPerShare
            : becs != null && Number.isFinite(becs)
              ? becs / 100
              : null;
        const dilutedEps =
          r.dilutedEarningsPerShare != null && Number.isFinite(r.dilutedEarningsPerShare)
            ? r.dilutedEarningsPerShare
            : decs != null && Number.isFinite(decs)
              ? decs / 100
              : null;
        return {
          endDate: r.endDate,
          totalRevenue: r.totalRevenue,
          basicEarningsPerShare: basicEps,
          dilutedEarningsPerShare: dilutedEps,
        };
      })
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    // Macro: SELIC, IPCA 12m, CDI, IBC-Br.
    // Cache 24h. brapi limita ~20 obs sem filtros; com limit=500 retorna
    // ~1.5 ano de SELIC/CDI (diário) e anos de IBC-Br (mensal).
    const macro = await cached(
      `brapi:macro:v3`,
      24 * 60 * 60,
      () => fetchMacroObservations(["selic", "ipca12m", "cdi", "ibcbr"]),
    );

    // Resposta consolidada — espelha o que /api/asset/[symbol] retorna
    // + extras pros gráficos de /analysis.
    // Earnings yield history (re-computado aqui para passar adiante pros
    // B3/B5 que precisam do formato EarningsYieldHistoryPoint).
    const earningsHistory = computeEarningsYieldHistory(
      Array.isArray(statsHistoryRaw) ? statsHistoryRaw : null,
    );

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
        priceToBook: (ks.priceToBook as number | null | undefined) ?? null,
        bookValue: (ks.bookValue as number | null | undefined) ?? null,
        enterpriseValue: (ks.enterpriseValue as number | null | undefined) ?? null,
        enterpriseToEbitda: (ks.enterpriseToEbitda as number | null | undefined) ?? null,
        enterpriseToRevenue: (ks.enterpriseToRevenue as number | null | undefined) ?? null,
        heldPercentInsiders: (ks.heldPercentInsiders as number | null | undefined) ?? null,
        heldPercentInstitutions:
          (ks.heldPercentInstitutions as number | null | undefined) ?? null,
        shortPercentOfFloat: (ks.shortPercentOfFloat as number | null | undefined) ?? null,
        shortRatio: (ks.shortRatio as number | null | undefined) ?? null,
        sharesOutstanding: (ks.sharesOutstanding as number | null | undefined) ?? null,
        // Sell-side target — brapi schema existe mas dados nulos pra BR.
        targetHighPrice: (fd.targetHighPrice as number | null | undefined) ?? null,
        targetLowPrice: (fd.targetLowPrice as number | null | undefined) ?? null,
        targetMeanPrice: (fd.targetMeanPrice as number | null | undefined) ?? null,
        targetMedianPrice: (fd.targetMedianPrice as number | null | undefined) ?? null,
        recommendationMean: (fd.recommendationMean as number | null | undefined) ?? null,
        recommendationKey: (fd.recommendationKey as string | null | undefined) ?? null,
        numberOfAnalystOpinions:
          (fd.numberOfAnalystOpinions as number | null | undefined) ?? null,
        returnOnEquity: (fd.returnOnEquity as number | null | undefined) ?? null,
        returnOnAssets: (fd.returnOnAssets as number | null | undefined) ?? null,
        grossMargins: (fd.grossMargins as number | null | undefined) ?? null,
        profitMargins: (fd.profitMargins as number | null | undefined) ?? null,
        operatingMargins: (fd.operatingMargins as number | null | undefined) ?? null,
        ebitdaMargins: (fd.ebitdaMargins as number | null | undefined) ?? null,
        revenueGrowth: (fd.revenueGrowth as number | null | undefined) ?? null,
        earningsGrowth: (fd.earningsGrowth as number | null | undefined) ?? null,
        freeCashflow: (fd.freeCashflow as number | null | undefined) ?? null,
        operatingCashflow: (fd.operatingCashflow as number | null | undefined) ?? null,
        totalCash: (fd.totalCash as number | null | undefined) ?? null,
        totalDebt: (fd.totalDebt as number | null | undefined) ?? null,
        debtToEquity: (fd.debtToEquity as number | null | undefined) ?? null,
        currentRatio: (fd.currentRatio as number | null | undefined) ?? null,
        quickRatio: (fd.quickRatio as number | null | undefined) ?? null,
        beta: (ks.beta as number | null | undefined) ?? null,
        trailingEps: (ks.trailingEps as number | null | undefined) ?? null,
        forwardEps: (ks.forwardEps as number | null | undefined) ?? null,
        revenuePerShare: (fd.revenuePerShare as number | null | undefined) ?? null,
        totalRevenue: (fd.totalRevenue as number | null | undefined) ?? null,
        eps: (ks.trailingEps as number | null | undefined) ?? null,
        dividendYield: (fd.dividendYield as number | null | undefined) ?? null,
      },

      // Históricos
      marginsHistory,
      incomeHistory,
      balanceHistory: balanceHistoryRaw,
      cashflowHistory: cashflowHistoryRaw,

      // Earnings yield histórico (A1 — fix do bug de usar preço atual em
      // períodos passados). Usa `eps` do stats-history (já é netIncome /
      // sharesOutstanding — equivalente ao TTM usado pela brapi no
      // trailingPE). `earnings_yield[t] = eps[t] / price[t] × 100`.
      // Logar outliers >40% pra review.
      // Vantagem: usa a MESMA definição de EPS que entra no trailingPE
      // da brapi — equivale a `1/trailingPE[t]` mas com campo explícito.
      earningsYieldHistory: computeEarningsYieldHistory(
        Array.isArray(statsHistoryRaw) ? statsHistoryRaw : null,
      ),

      // B3: 3 yields (EY + FCFY + DY) no mesmo eixo.
      // FCF yield = (FCO LTM - CapEx LTM) / market_cap.
      // DY = proventos 12m / preço. Sem dados de dividendos brapi no
      // payload atual, DY fica null (provavelmente virá de cache).
      yieldComparison: computeYieldComparison(
        earningsHistory,
        cashflowHistoryRaw,
        q.marketCap,
        null, // dividendos histórico — virá via endpoint /dividends separado
        q.price,
      ),

      // B5: prêmio de equity vs NTN-B 2045 real.
      equityRiskPremium: computeEquityRiskPremium(
        earningsHistory,
        ntnbHistoryRaw,
        NTNB_LONG_SYMBOL,
      ),

      // Bandas de múltiplo histórico (B1 — feature principal da spec).
      // P/L, EV/EBITDA, P/VP com winsorização p1/p99, percentil atual,
      // e média do P/L 5a pra fair value.
      valuationBands: computeValuationBands(
        Array.isArray(statsHistoryRaw) ? statsHistoryRaw : null,
      ),

      // ROIC vs WACC (A4) — substitui o antigo ROE vs SELIC.
      // Calcula NOPAT, capital investido, Kd via despesa financeira LTM,
      // Ke via CAPM (NTN-B + beta × ERP 5.5%), WACC.
      roicWacc: computeROICvsWACC(
        incomeHistoryRaw,
        balanceHistoryRaw,
        cashflowHistoryRaw,
        fdHistory,
        Array.isArray(statsHistoryRaw) ? statsHistoryRaw : null,
        { sectorDisp: profile?.sectorDisp ?? null },
      ),

      // Alavancagem (B2) — dívida líquida / EBITDA LTM + cobertura de juros.
      // Empty state pra Financial Services (capital regulatório ≠ operacional).
      leverage: computeLeverage(
        incomeHistoryRaw,
        balanceHistoryRaw,
        { sectorDisp: profile?.sectorDisp ?? null },
      ),

      // Macro BR (SELIC, IPCA 12m, CDI — 2 anos)
      macro,

      // Data de fetch
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Analysis indisponível", detail: String(err) },
      { status: 502 },
    );
  }
}