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
  /**
   * Em CENTAVOS (dividir por 100 pra ter R$). Algumas versões da brapi
   * retornam o EPS populado nesse campo quando basicEarningsPerShare é null.
   * Heurística: se basicEarningsPerShare for null, usa esse / 100.
   */
  basicEarningsPerCommonShare?: number | null;
  dilutedEarningsPerShare?: number | null;
  dilutedEarningsPerCommonShare?: number | null;
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
  // brapi v2 retorna os dados em results[0].data (array)
  // ou, em algumas versões, em incomeStatement como array ou { incomeStatement: [...] }
  const dataField = (result as { data?: IncomeStatementRow[] }).data;
  const incField = result.incomeStatement;
  let arr: IncomeStatementRow[] = [];
  if (Array.isArray(dataField)) arr = dataField;
  else if (Array.isArray(incField)) arr = incField;
  else if (incField && typeof incField === "object" && Array.isArray((incField as { incomeStatement?: IncomeStatementRow[] }).incomeStatement))
    arr = (incField as { incomeStatement?: IncomeStatementRow[] }).incomeStatement ?? [];

  // Normalização: brapi retorna EPS em campos diferentes dependendo da
  // versão do payload. Heurística:
  //   1. Se basicEarningsPerShare tem valor, usa ele.
  //   2. Se for null mas basicEarningsPerCommonShare tem valor (em centavos),
  //      divide por 100.
  //   3. Senão null.
  //   Mesma lógica pra diluted.
  const normalized = arr
    .filter((r) => r.endDate != null)
    .map((r) => {
      const basicCommon = r.basicEarningsPerCommonShare;
      const basicEps =
        r.basicEarningsPerShare != null && Number.isFinite(r.basicEarningsPerShare)
          ? r.basicEarningsPerShare
          : basicCommon != null && Number.isFinite(basicCommon)
            ? basicCommon / 100
            : null;
      const dilutedCommon = r.dilutedEarningsPerCommonShare;
      const dilutedEps =
        r.dilutedEarningsPerShare != null && Number.isFinite(r.dilutedEarningsPerShare)
          ? r.dilutedEarningsPerShare
          : dilutedCommon != null && Number.isFinite(dilutedCommon)
            ? dilutedCommon / 100
            : null;
      return {
        ...r,
        basicEarningsPerShare: basicEps,
        dilutedEarningsPerShare: dilutedEps,
      };
    })
    .sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));

  return normalized;
}
