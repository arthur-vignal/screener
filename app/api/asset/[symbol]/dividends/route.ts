import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/asset/[symbol]/dividends — historical dividend / JCP events.
 *
 * Migrado pra brapi v2 (2026-08-30): `/api/v2/stocks/dividends?symbols=X`
 * (substitui o antigo `/api/quote/{t}?dividends=true`). Shape mudou —
 * resposta vem em `results[0].data.cashDividends` (objeto) em vez de
 * `results[0].dividendsData.cashDividends` direto.
 *
 * O `rate` da Brapi é uma fração da cotação (não valor absoluto em BRL).
 * Cliente deve multiplicar pelo preço no `paymentDate` pra yield real.
 *
 * Cache: 6h — dividendos não mudam intraday.
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
      `brapi:v2:dividends:${symbol}`,
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
  const params = new URLSearchParams({ symbols: symbol });
  if (token) params.set("token", token);
  const r = await fetch(
    `https://brapi.dev/api/v2/stocks/dividends?${params.toString()}`,
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
      data?: { cashDividends?: CashDividend[] };
    }>;
  };
  return data.results?.[0]?.data?.cashDividends ?? [];
}