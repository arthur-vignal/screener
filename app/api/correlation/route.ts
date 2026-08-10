import { NextRequest, NextResponse } from "next/server";
import { getCorrelationMatrix } from "@/lib/brapi-correlation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_SYMBOLS = [
  "PETR4", // Petrobras (commodities)
  "VALE3", // Vale (commodities)
  "ITUB4", // Itaú (financials)
  "BBDC4", // Bradesco (financials)
  "ABEV3", // Ambev (consumption)
  "WEGE3", // WEG (industrials)
  "BOVA11", // ETF Ibovespa (proxy market)
  "MXRF11", // FII popular
];

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20)
    : DEFAULT_SYMBOLS;

  try {
    const result = await getCorrelationMatrix(symbols);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
