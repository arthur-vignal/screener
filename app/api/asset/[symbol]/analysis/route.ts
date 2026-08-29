import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getBrapiFundamentals } from "@/lib/brapi";

/**
 * /api/asset/[symbol]/analysis — bundle consolidado pra página
 * /asset/[symbol]/analysis (drilldown com 8 gráficos analíticos).
 *
 * Retorna em UMA call tudo que a página precisa:
 *   - core: quote + métricas (mesma do /api/asset/[symbol])
 *   - fundamentals: defaultKeyStatistics completo (insider/inst/short/P/B etc)
 *   - marginsHistory: financialDataHistoryQuarterly (margins 8-16 quarters)
 *   - incomeHistory: incomeStatementHistoryQuarterly (revenue/eps 16 quarters)
 *   - macro: SELIC, IPCA 12m, CDI últimos 2 anos
 *
 * Nota: brapi não tem sell-side target pra BR — `targets` retorna null
 * em todos os campos. Price target chart usa mocks.
 *
 * Cache: 30min bundle + 24h macro/financials.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type MacroObs = { date: string; value: number };

async function fetchJson(url: string): Promise<unknown> {
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
  const sep = url.includes("?") ? "&" : "?";
  const finalUrl = token ? `${url}${sep}token=${encodeURIComponent(token)}` : url;
  const r = await fetch(finalUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  return r.json();
}

async function fetchMacroObservations(
  symbols: string[],
  startDate: string,
): Promise<Record<string, MacroObs[]>> {
  if (symbols.length === 0) return {};
  try {
    const url = `https://brapi.dev/api/v2/macro?symbols=${symbols.join(",")}&startDate=${startDate}&sortOrder=asc`;
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
    // Core + fundamentals via lib
    const data = await cached(
      `brapi:full:${symbol}`,
      30 * 60,
      () => getBrapiFundamentals(symbol),
    );
    if (!data) {
      return NextResponse.json({ error: "Ticker inválido" }, { status: 404 });
    }

    // Pull financial history (margins trimestral, 63 quarters)
    // brapi v2 não tem endpoint /stocks/financial-data-history — vem
    // como módulo em /quote/{t}?modules=financialDataHistoryQuarterly
    let marginsHistory: Array<{
      endDate: string;
      grossMargins?: number | null;
      operatingMargins?: number | null;
      profitMargins?: number | null;
      ebitdaMargins?: number | null;
      revenueGrowth?: number | null;
      earningsGrowth?: number | null;
      returnOnEquity?: number | null;
      returnOnAssets?: number | null;
    }> = [];
    try {
      const fdhResp = (await fetchJson(
        `https://brapi.dev/api/quote/${symbol}?modules=financialDataHistoryQuarterly`,
      )) as { results?: Array<{ financialDataHistoryQuarterly?: Array<Record<string, unknown>> }> };
      const arr = fdhResp.results?.[0]?.financialDataHistoryQuarterly ?? [];
      marginsHistory = arr
        .filter((r) => r.endDate != null)
        .map((r) => ({
          endDate: String(r.endDate ?? ""),
          grossMargins: r.grossMargins as number | null,
          operatingMargins: r.operatingMargins as number | null,
          profitMargins: r.profitMargins as number | null,
          ebitdaMargins: r.ebitdaMargins as number | null,
          revenueGrowth: r.revenueGrowth as number | null,
          earningsGrowth: r.earningsGrowth as number | null,
          returnOnEquity: r.returnOnEquity as number | null,
          returnOnAssets: r.returnOnAssets as number | null,
        }))
        .sort((a, b) => a.endDate.localeCompare(b.endDate));
    } catch {
      // ignore
    }

    // Pull income history (revenue/eps trimestral)
    let incomeHistory: Array<{
      endDate: string;
      totalRevenue?: number | null;
      basicEarningsPerShare?: number | null;
      dilutedEarningsPerShare?: number | null;
    }> = [];
    try {
      const incResp = (await fetchJson(
        `https://brapi.dev/api/v2/stocks/income-statement?symbols=${symbol}&period=quarterly`,
      )) as { results?: Array<{ data?: unknown[] }> };
      const arr = incResp.results?.[0]?.data ?? [];
      incomeHistory = (arr as Array<Record<string, unknown>>)
        .filter((r) => r.endDate != null)
        .map((r) => {
          // Mesma heurística do income-quarterly: basicEarningsPerShare null
          // cai pra basicEarningsPerCommonShare / 100 (em centavos).
          const becs = r.basicEarningsPerCommonShare;
          const decs = r.dilutedEarningsPerCommonShare;
          const basicEps =
            r.basicEarningsPerShare != null && Number.isFinite(r.basicEarningsPerShare)
              ? Number(r.basicEarningsPerShare)
              : becs != null && Number.isFinite(becs)
                ? Number(becs) / 100
                : null;
          const dilutedEps =
            r.dilutedEarningsPerShare != null && Number.isFinite(r.dilutedEarningsPerShare)
              ? Number(r.dilutedEarningsPerShare)
              : decs != null && Number.isFinite(decs)
                ? Number(decs) / 100
                : null;
          return {
            endDate: String(r.endDate ?? ""),
            totalRevenue: r.totalRevenue != null ? Number(r.totalRevenue) : null,
            basicEarningsPerShare: basicEps,
            dilutedEarningsPerShare: dilutedEps,
          };
        })
        .sort((a, b) => a.endDate.localeCompare(b.endDate));
    } catch {
      // ignore
    }

    // Macro: SELIC, IPCA 12m, CDI últimos 2 anos
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const startDate = twoYearsAgo.toISOString().slice(0, 10);
    const macro = await cached(
      `brapi:macro:${startDate}`,
      24 * 60 * 60,
      () => fetchMacroObservations(["selic", "ipca12m", "cdi", "ibcbr"], startDate),
    );

    // Resposta consolidada — espelha o que /api/asset/[symbol] retorna
    // + extras pros 8 gráficos de /analysis.
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
        trailingPE: q.trailingPE ?? null,
        forwardPE: (ks as Record<string, unknown>).forwardPE as number | null,
        pegRatio: (ks as Record<string, unknown>).pegRatio as number | null,
        priceToBook: (ks as Record<string, unknown>).priceToBook as number | null,
        bookValue: (ks as Record<string, unknown>).bookValue as number | null,
        enterpriseValue:
          (ks as Record<string, unknown>).enterpriseValue as number | null,
        enterpriseToEbitda:
          (ks as Record<string, unknown>).enterpriseToEbitda as number | null,
        enterpriseToRevenue:
          (ks as Record<string, unknown>).enterpriseToRevenue as number | null,
        heldPercentInsiders:
          (ks as Record<string, unknown>).heldPercentInsiders as number | null,
        heldPercentInstitutions:
          (ks as Record<string, unknown>).heldPercentInstitutions as number | null,
        shortPercentOfFloat:
          (ks as Record<string, unknown>).shortPercentOfFloat as number | null,
        shortRatio: (ks as Record<string, unknown>).shortRatio as number | null,
        sharesOutstanding:
          (ks as Record<string, unknown>).sharesOutstanding as number | null,
        // Sell-side target — brapi schema existe mas dados nulos pra BR.
        targetHighPrice: fd.targetHighPrice ?? null,
        targetLowPrice: fd.targetLowPrice ?? null,
        targetMeanPrice: fd.targetMeanPrice ?? null,
        targetMedianPrice: fd.targetMedianPrice ?? null,
        recommendationMean: fd.recommendationMean ?? null,
        recommendationKey: fd.recommendationKey ?? null,
        numberOfAnalystOpinions: fd.numberOfAnalystOpinions ?? null,
        returnOnEquity: fd.returnOnEquity ?? null,
        returnOnAssets: fd.returnOnAssets ?? null,
        grossMargins: fd.grossMargins ?? null,
        profitMargins: fd.profitMargins ?? null,
        operatingMargins: fd.operatingMargins ?? null,
        ebitdaMargins: fd.ebitdaMargins ?? null,
        revenueGrowth: fd.revenueGrowth ?? null,
        earningsGrowth: fd.earningsGrowth ?? null,
        freeCashflow: fd.freeCashflow ?? null,
        operatingCashflow: fd.operatingCashflow ?? null,
        totalCash: fd.totalCash ?? null,
        totalDebt: fd.totalDebt ?? null,
        debtToEquity: fd.debtToEquity ?? null,
        currentRatio: fd.currentRatio ?? null,
        quickRatio: fd.quickRatio ?? null,
        beta: (ks as Record<string, unknown>).beta as number | null,
        trailingEps: (ks as Record<string, unknown>).trailingEps as number | null,
        forwardEps: (ks as Record<string, unknown>).forwardEps as number | null,
        revenuePerShare: fd.revenuePerShare ?? null,
        totalRevenue: fd.totalRevenue ?? null,
        eps: (ks as Record<string, unknown>).trailingEps as number | null,
        dividendYield: fd.dividendYield ?? null,
      },

      // Históricos
      marginsHistory,
      incomeHistory,

      // Macro BR (SELIC, IPCA 12m, CDI — 2 anos)
      macro,

      // Subsetores / peers (pega via /api/peer-benchmarks separado)
      // — não consolido aqui pra não duplicar request.

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
