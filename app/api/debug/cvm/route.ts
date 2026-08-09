import { NextResponse } from "next/server";
import { lookupCnpjByTicker, getCvmHistory } from "@/lib/cvm";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") || "PETR4").toUpperCase();

  const debug: Record<string, unknown> = {
    ticker,
    ibovEntry: IBOV_BY_SYMBOL[ticker] ?? null,
    timestamp: new Date().toISOString(),
  };

  // Step 1: lookup by ticker (uses internal cadastro map)
  try {
    const lookup = await lookupCnpjByTicker(ticker);
    debug.lookupResult = lookup;
  } catch (e) {
    debug.lookupError = e instanceof Error ? e.message : String(e);
  }

  // Step 2: full history (only if lookup succeeded)
  const lookup = debug.lookupResult as { cnpj: string } | null;
  if (lookup && lookup.cnpj) {
    try {
      const hist = await getCvmHistory(lookup.cnpj);
      debug.historyQuarters = hist.quarters.size;
      debug.historySample = Array.from(hist.quarters.values()).slice(0, 3);
    } catch (e) {
      debug.historyError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(debug);
}
