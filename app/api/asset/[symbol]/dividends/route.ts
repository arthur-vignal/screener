import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/asset/[symbol]/dividends — historical dividend / JCP events.
 *
 * Returns `cashDividends` from Brapi's `dividendsData` module. We
 * fetch `?dividends=true` on the same /quote/{symbol} endpoint and
 * pull out the array. The `rate` field is a fraction (not an
 * absolute BRL amount), so clients should treat it as a proxy and
 * multiply by the price at payment date for true yield.
 *
 * Cached for 6h — dividends don't change intraday.
 */

export const dynamic = "force-dynamic";

type CashDividend = {
  paymentDate: string;
  rate: number | null;
  label: string | null; // "DIVIDENDO" | "JCP"
  isinCode?: string;
  lastDatePrior?: string;
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
    const data = await cached(
      `brapiDividends:${symbol}`,
      6 * 3600,
      async () => fetchDividends(symbol),
    );
    return NextResponse.json({ dividends: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Ticker inválido", detail: String(err) },
      { status: 404 },
    );
  }
}

async function fetchDividends(symbol: string): Promise<CashDividend[]> {
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
  const params: Record<string, string> = { dividends: "true" };
  if (token) params.token = token;
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(
    `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?${qs}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!r.ok) return [];
  const data = (await r.json()) as {
    results?: Array<{
      dividendsData?: { cashDividends?: CashDividend[] };
    }>;
  };
  return data.results?.[0]?.dividendsData?.cashDividends ?? [];
}