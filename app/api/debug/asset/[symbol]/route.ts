import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/debug/asset/[symbol] — endpoint de debug que retorna o que está
 * REALMENTE chegando no bundle do brapi, sem máscara.
 *
 * Use pra ver:
 *   - historicals.keyStatistics.length (P/E histórico)
 *   - historicals.incomeQuarterly.length (EPS trimestral)
 *   - metrics.eps, metrics.trailingPE, metrics.forwardEps
 *
 * Sem cache (pra ver mudanças imediatamente).
 *
 * ⚠️ DELETE DEPOIS DE DEBUG — não expor em produção.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type BrapiFullResponse = {
  results?: Array<{
    symbol: string;
    defaultKeyStatistics?: Record<string, unknown>;
    financialData?: Record<string, unknown>;
    incomeStatementHistory?: unknown;
    incomeStatementHistoryQuarterly?: unknown;
    balanceSheetHistory?: unknown;
    cashflowHistory?: unknown;
    defaultKeyStatisticsHistory?: unknown;
    financialDataHistory?: unknown;
    valueAddedHistory?: unknown;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";

  const moduleList = [
    "defaultKeyStatistics",
    "financialData",
    "summaryProfile",
    "incomeStatementHistory",
    "incomeStatementHistoryQuarterly",
    "balanceSheetHistory",
    "cashflowHistory",
    "valueAddedHistory",
    "defaultKeyStatisticsHistory",
    "financialDataHistory",
  ];
  const modulesParam = moduleList.join(",");
  const url = `https://brapi.dev/api/v2/quote/${symbol}?modules=${modulesParam}&token=${encodeURIComponent(token)}`;

  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!r.ok) {
    return NextResponse.json(
      { error: `brapi ${r.status}`, body: await r.text().catch(() => null) },
      { status: 502 },
    );
  }

  const data = (await r.json()) as BrapiFullResponse;
  const raw = data.results?.[0];

  if (!raw) {
    return NextResponse.json({ error: "no results" }, { status: 404 });
  }

  // Tally: pra cada módulo, conta quantas entradas tem
  const tally = {
    defaultKeyStatistics: Object.keys(raw.defaultKeyStatistics ?? {}).length,
    financialData: Object.keys(raw.financialData ?? {}).length,
    incomeStatementHistory: Array.isArray(raw.incomeStatementHistory)
      ? raw.incomeStatementHistory.length
      : Object.keys(raw.incomeStatementHistory ?? {}).length,
    incomeStatementHistoryQuarterly: Array.isArray(
      raw.incomeStatementHistoryQuarterly,
    )
      ? raw.incomeStatementHistoryQuarterly.length
      : Object.keys(raw.incomeStatementHistoryQuarterly ?? {}).length,
    balanceSheetHistory: Array.isArray(raw.balanceSheetHistory)
      ? raw.balanceSheetHistory.length
      : Object.keys(raw.balanceSheetHistory ?? {}).length,
    cashflowHistory: Array.isArray(raw.cashflowHistory)
      ? raw.cashflowHistory.length
      : Object.keys(raw.cashflowHistory ?? {}).length,
    valueAddedHistory: Array.isArray(raw.valueAddedHistory)
      ? raw.valueAddedHistory.length
      : Object.keys(raw.valueAddedHistory ?? {}).length,
    defaultKeyStatisticsHistory: Array.isArray(raw.defaultKeyStatisticsHistory)
      ? raw.defaultKeyStatisticsHistory.length
      : Object.keys(raw.defaultKeyStatisticsHistory ?? {}).length,
    financialDataHistory: Array.isArray(raw.financialDataHistory)
      ? raw.financialDataHistory.length
      : Object.keys(raw.financialDataHistory ?? {}).length,
  };

  // Sample: 1 entrada de cada (pra ver shape real)
  const sample = {
    incomeStatementHistoryQuarterly: Array.isArray(
      raw.incomeStatementHistoryQuarterly,
    )
      ? raw.incomeStatementHistoryQuarterly.slice(0, 1)
      : raw.incomeStatementHistoryQuarterly,
    defaultKeyStatisticsHistory: Array.isArray(raw.defaultKeyStatisticsHistory)
      ? raw.defaultKeyStatisticsHistory.slice(0, 1)
      : raw.defaultKeyStatisticsHistory,
  };

  // Key metrics
  const ks = raw.defaultKeyStatistics as Record<string, unknown> | undefined;
  const fd = raw.financialData as Record<string, unknown> | undefined;

  return NextResponse.json(
    {
      symbol,
      url_called: url.replace(/token=[^&]+/, "token=***"),
      tally,
      sample,
      key_metrics: {
        trailingPE: ks?.trailingPE ?? null,
        priceEarnings: ks?.priceEarnings ?? null,
        forwardPE: ks?.forwardPE ?? null,
        trailingEps: ks?.trailingEps ?? null,
        forwardEps: ks?.forwardEps ?? null,
        beta: ks?.beta ?? null,
        totalRevenue: fd?.totalRevenue ?? null,
        ebitda: fd?.ebitda ?? null,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
