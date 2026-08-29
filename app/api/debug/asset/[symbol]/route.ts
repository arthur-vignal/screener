import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/debug/asset/[symbol] — endpoint de debug que mostra TUDO.
 *
 * Faz:
 *   1. Chama brapi /api/v2/stocks/statistics?mode=history&period=quarterly
 *      (que é o que o stats-history wrapper chama)
 *   2. Chama brapi /api/v2/stocks/income-statement?period=quarterly
 *      (que é o que o income-quarterly wrapper chama)
 *   3. Chama brapi /api/v2/quote/{symbol}?modules=... (que é o que o
 *      getBrapiFundamentals chama)
 *
 * Retorna um JSON com o response RAW de cada um. SEM CACHE.
 *
 * Use pra ver EXATAMENTE o que tá chegando da brapi pro PRO token.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";

  async function fetchUrl(url: string, label: string) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20000),
      });
      const status = r.status;
      const text = await r.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = text.slice(0, 500);
      }
      // Sumariza: conta quantas entradas em cada array típico
      let summary: Record<string, unknown> = {};
      if (body && typeof body === "object" && "results" in body) {
        const results = (body as { results: unknown[] }).results;
        const r0 = results?.[0];
        if (r0 && typeof r0 === "object") {
          const obj = r0 as Record<string, unknown>;
          for (const [k, v] of Object.entries(obj)) {
            if (Array.isArray(v)) {
              summary[`results[0].${k}.length`] = v.length;
              // sample 1 entrada
              if (v.length > 0) {
                summary[`results[0].${k}[0]`] = JSON.stringify(v[0]).slice(0, 400);
              }
            } else if (v && typeof v === "object" && !Array.isArray(v)) {
              // pode ser { statistics: [...] }
              const inner = v as Record<string, unknown>;
              for (const [k2, v2] of Object.entries(inner)) {
                if (Array.isArray(v2)) {
                  summary[`results[0].${k}.${k2}.length`] = v2.length;
                  if (v2.length > 0) {
                    summary[`results[0].${k}.${k2}[0]`] = JSON.stringify(v2[0]).slice(0, 400);
                  }
                }
              }
            }
          }
        }
        summary["results.length"] = results?.length ?? 0;
      }
      return { label, url: url.replace(/token=[^&]+/, "token=***"), status, summary };
    } catch (err) {
      return { label, url, error: String(err) };
    }
  }

  // 1. /api/v2/stocks/statistics?mode=history&period=quarterly
  const statsHistoryUrl = `https://brapi.dev/api/v2/stocks/statistics?symbols=${symbol}&mode=history&period=quarterly${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  // 2. /api/v2/stocks/income-statement?period=quarterly
  const incomeQuarterlyUrl = `https://brapi.dev/api/v2/stocks/income-statement?symbols=${symbol}&period=quarterly${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  // 3. /api/v2/quote/{symbol}?modules=...
  const quoteModules = [
    "defaultKeyStatistics",
    "financialData",
    "summaryProfile",
    "incomeStatementHistory",
    "balanceSheetHistory",
    "cashflowHistory",
    "valueAddedHistory",
    "financialDataHistory",
  ].join(",");
  const quoteUrl = `https://brapi.dev/api/v2/quote/${encodeURIComponent(symbol)}?modules=${quoteModules}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

  const [stats, income, quote] = await Promise.all([
    fetchUrl(statsHistoryUrl, "stats-history"),
    fetchUrl(incomeQuarterlyUrl, "income-quarterly"),
    fetchUrl(quoteUrl, "quote-with-modules"),
  ]);

  return NextResponse.json(
    { symbol, calls: [stats, income, quote] },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
