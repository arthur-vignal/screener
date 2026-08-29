import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/asset/[symbol]/income-quarterly — DRE trimestral (EPS por quarter,
 * Revenue, grossProfit, netIncome, etc).
 *
 * Proxy pra `brapi /api/v2/stocks/income-statement?symbols=X&period=quarterly`
 *
 * Doc oficial brapi v2:
 *   - endpoint: /api/v2/stocks/income-statement
 *   - query: symbols (req), period=quarterly|annual, startDate, endDate
 *   - auth: Bearer
 *   - retorna: totalRevenue, costOfRevenue, grossProfit, operatingIncome,
 *     netIncome, ebitda, ebit, basicEarningsPerShare, dilutedEarningsPerShare,
 *     earningsPerShare, researchDevelopment, sellingGeneralAdministrative
 *
 * Cache: 24h. Cada ticker tem ~16 quarters (4 anos).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

type IncomeStatementRow = {
  endDate?: string;
  totalRevenue?: number | null;
  costOfRevenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  ebitda?: number | null;
  ebit?: number | null;
  basicEarningsPerShare?: number | null;
  dilutedEarningsPerShare?: number | null;
  earningsPerShare?: number | null;
  researchDevelopment?: number | null;
  sellingGeneralAdministrative?: number | null;
};

type BrapiResponse = {
  results?: Array<{
    symbol?: string;
    incomeStatement?: IncomeStatementRow[] | { incomeStatement?: IncomeStatementRow[] };
    [key: string]: unknown;
  }>;
};

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
    const income = await cached(
      `brapi:income-quarterly:${symbol}`,
      24 * 60 * 60,
      () => fetchBrapiIncomeQuarterly(symbol),
    );
    return NextResponse.json({ income });
  } catch (err) {
    return NextResponse.json(
      { income: [], error: String(err) },
      { status: 500 },
    );
  }
}

async function fetchBrapiIncomeQuarterly(
  symbol: string,
): Promise<IncomeStatementRow[]> {
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
  const params = new URLSearchParams({
    symbols: symbol,
    period: "quarterly",
  });
  if (token) params.set("token", token);

  const url = `https://brapi.dev/api/v2/stocks/income-statement?${params.toString()}`;
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  const data = (await r.json()) as BrapiResponse;
  const result = data.results?.[0];
  if (!result) return [];
  const inc = result.incomeStatement;
  let arr: IncomeStatementRow[] = [];
  if (Array.isArray(inc)) arr = inc;
  else if (inc && typeof inc === "object" && Array.isArray((inc as { incomeStatement?: IncomeStatementRow[] }).incomeStatement))
    arr = (inc as { incomeStatement?: IncomeStatementRow[] }).incomeStatement ?? [];
  return arr.filter((r) => r.endDate != null).sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));
}
