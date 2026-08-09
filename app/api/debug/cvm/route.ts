import { NextResponse } from "next/server";
import { getCnpjToCvmMap, lookupCnpjByTicker, getCvmHistory } from "@/lib/cvm";
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

  // Step 1: cadastro map
  try {
    const map = await getCnpjToCvmMap();
    debug.cadastroSize = Object.keys(map).length;
    debug.cadastroSample = Object.entries(map).slice(0, 3);
  } catch (e) {
    debug.cadastroError = e instanceof Error ? e.message : String(e);
  }

  // Step 2: lookup by ticker
  try {
    const lookup = await lookupCnpjByTicker(ticker);
    debug.lookupResult = lookup;
  } catch (e) {
    debug.lookupError = e instanceof Error ? e.message : String(e);
  }

  // Step 3: full history (only if lookup succeeded)
  if (debug.lookupResult && typeof debug.lookupResult === "object" && "cnpj" in debug.lookupResult) {
    try {
      const hist = await getCvmHistory((debug.lookupResult as { cnpj: string }).cnpj);
      debug.historyQuarters = hist.quarters.size;
      debug.historySample = Array.from(hist.quarters.values()).slice(0, 3);
    } catch (e) {
      debug.historyError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(debug, null, 2);
}
