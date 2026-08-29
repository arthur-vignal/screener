import { NextRequest, NextResponse } from "next/server";

/**
 * /api/debug/smoke/[symbol] — smoke test que mostra RAW response de cada
 * endpoint brapi oficial, sem cache, sem transformação.
 *
 * Roda em paralelo as chamadas que o projeto usa:
 *   - /stocks/{symbol}                    → core
 *   - /stocks/statistics?mode=current     → múltiplos atuais
 *   - /stocks/statistics?mode=history     → histórico trimestral
 *   - /stocks/financial-data              → margins + debt
 *   - /stocks/income-statement?period=quarterly → EPS trimestral
 *
 * Retorna 1 row com:
 *   - url_called
 *   - status (200, 404, 401, 429, 500…)
 *   - top_keys (shape: lista de chaves do objeto raiz)
 *   - data_summary (se results[0].data é array, conta + sample[0] keys)
 *   - sample_value (1ª entrada completa, truncada em 2000 chars pra debug)
 *
 * ⚠️ DELETE depois do debug.
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
  const authHeaders = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
  };

  async function probe(
    url: string,
    label: string,
  ): Promise<{
    label: string;
    url: string;
    status: number;
    top_keys: string[];
    data_length: number | null;
    sample_keys: string[];
    sample_value: string | null;
    error: string | null;
  }> {
    try {
      const r = await fetch(url, {
        headers: authHeaders,
        signal: AbortSignal.timeout(20000),
      });
      const status = r.status;
      const text = await r.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return {
          label,
          url: url.replace(/token=[^&]+/, "token=***"),
          status,
          top_keys: [],
          data_length: null,
          sample_keys: [],
          sample_value: text.slice(0, 500),
          error: null,
        };
      }
      // Top keys do body
      const topKeys = body && typeof body === "object" ? Object.keys(body) : [];
      // Tenta achar data[]
      let dataLength: number | null = null;
      let sampleKeys: string[] = [];
      let sampleValue: string | null = null;
      const obj = body as Record<string, unknown> | null;
      const results = obj?.results;
      if (Array.isArray(results) && results.length > 0) {
        const r0 = results[0] as Record<string, unknown>;
        if (Array.isArray(r0.data)) {
          dataLength = r0.data.length;
          if (dataLength > 0) {
            sampleKeys = Object.keys(r0.data[0] as object).sort();
            sampleValue = JSON.stringify(r0.data[0], null, 2).slice(0, 2000);
          }
        }
      }
      return {
        label,
        url: url.replace(/token=[^&]+/, "token=***"),
        status,
        top_keys: topKeys,
        data_length: dataLength,
        sample_keys: sampleKeys,
        sample_value: sampleValue,
        error: null,
      };
    } catch (err) {
      return {
        label,
        url: url.replace(/token=[^&]+/, "token=***"),
        status: 0,
        top_keys: [],
        data_length: null,
        sample_keys: [],
        sample_value: null,
        error: String(err),
      };
    }
  }

  const authQuery = token ? `&token=${encodeURIComponent(token)}` : "";

  const probes = await Promise.all([
    probe(
      `https://brapi.dev/api/v2/stocks/${encodeURIComponent(symbol)}${token ? `?token=${encodeURIComponent(token)}` : ""}`,
      "stocks/{symbol}",
    ),
    probe(
      `https://brapi.dev/api/v2/stocks/statistics?symbols=${encodeURIComponent(symbol)}&mode=current${authQuery}`,
      "statistics?mode=current",
    ),
    probe(
      `https://brapi.dev/api/v2/stocks/statistics?symbols=${encodeURIComponent(symbol)}&mode=history&period=quarterly${authQuery}`,
      "statistics?mode=history&period=quarterly",
    ),
    probe(
      `https://brapi.dev/api/v2/stocks/financial-data?symbols=${encodeURIComponent(symbol)}${authQuery}`,
      "financial-data",
    ),
    probe(
      `https://brapi.dev/api/v2/stocks/income-statement?symbols=${encodeURIComponent(symbol)}&period=quarterly${authQuery}`,
      "income-statement?period=quarterly",
    ),
    probe(
      `https://brapi.dev/api/v2/stocks/balance-sheet?symbols=${encodeURIComponent(symbol)}${authQuery}`,
      "balance-sheet",
    ),
  ]);

  return NextResponse.json(
    { symbol, probes },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
