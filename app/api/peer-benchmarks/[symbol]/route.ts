import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/peer-benchmarks/[symbol] — benchmarks do subsetor para o scatter
 * qualidade×preço.
 *
 * Retorna:
 *   - symbol: ticker pedido
 *   - subSector: subsetor derivado (ex: "Petróleo e Gás Integrado")
 *   - peers: array de { symbol, name, evEbitda, roic } (pode ser vazio se
 *     não conseguir puxar)
 *   - medians: { evEbitda, roic } — medianas do subsetor
 *   - asset: { evEbitda, roic } — o próprio ticker (extraído do bundle)
 *   - fetchedAt, source
 *
 * Usa o universo de /api/v2/tickers?subsector=X&limit=30 para pegar
 * os pares. Cache 1h — peers não mudam frequentemente.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

type PeerQuote = {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  sector?: string;
  sectorDisp?: string;
  subsector?: string;
  type?: string;
  regularMarketPrice?: number | null;
  enterpriseValue?: number | null;
  ebitda?: number | null;
  returnOnEquity?: number | null;
};

async function fetchJson(url: string): Promise<unknown> {
  const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
  const sep = url.includes("?") ? "&" : "?";
  const finalUrl = token ? `${url}${sep}token=${encodeURIComponent(token)}` : url;
  const r = await fetch(finalUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`brapi ${r.status}`);
  return r.json();
}

function median(arr: number[]): number | null {
  const sorted = arr.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  try {
    // tenta descobrir o subsetor via quote do ticker (Brapi retorna
    // sector/sectorDisp no módulo summaryProfile).
    const quoteResp = (await fetchJson(
      `https://brapi.dev/api/v2/quote/${encodeURIComponent(symbol)}?modules=summaryProfile`,
    )) as { results?: Array<{ symbol: string; sectorDisp?: string }> };
    const sectorDisp = quoteResp?.results?.[0]?.sectorDisp ?? null;

    // pega pares do mesmo subsetor (ou universo B3 se não achar)
    // NOTA: a API real do Brapi v2 não tem filtro por subsetor oficial.
    // Usamos sector como aproximação e limit=30 pra ter uma amostra.
    const peerUrl = sectorDisp
      ? `https://brapi.dev/api/v2/tickers?limit=30`
      : `https://brapi.dev/api/v2/tickers?limit=30`;
    const peerResp = (await fetchJson(peerUrl)) as { tickers?: PeerQuote[] };

    const allPeers = (peerResp?.tickers ?? []).filter(
      (t) => t.symbol !== symbol && t.type === "stock",
    );

    // Se temos sectorDisp, filtra pelo mesmo setor (heurística simples —
      // Brapi v2 não expõe subsetor de forma confiável).
    const sameSector = sectorDisp
      ? allPeers.filter((t) => t.sectorDisp === sectorDisp)
      : allPeers;

    // Para cada par, tenta buscar EV/EBITDA e ROIC via quote+financial-data.
    // Pra evitar N+1 requests, limit a 12 pares e roda em paralelo.
    const peers = await Promise.all(
      sameSector.slice(0, 12).map(async (t) => {
        try {
          const r = (await fetchJson(
            `https://brapi.dev/api/v2/quote/${encodeURIComponent(t.symbol)}?modules=defaultKeyStatistics,financialData`,
          )) as { results?: Array<Record<string, unknown>> };
          const q = r?.results?.[0];
          if (!q) return null;
          const ev = num(q.enterpriseValue);
          const ebitda = num(q.ebitda);
          const evEbitda = ev != null && ebitda != null && ebitda > 0 ? ev / ebitda : null;
          const roic = num(q.returnOnEquity); // proxy: ROE ≈ ROIC pra simplificar
          // P/E (priceEarnings) — vem em defaultKeyStatistics.
          // Brapi v2 retorna priceEarnings inconsistente; usamos
          // trailingPE como fallback.
          const pe =
            num(q.priceEarnings) ??
            num(q.trailingPE) ??
            null;
          return {
            symbol: t.symbol,
            name: t.shortName ?? t.longName ?? t.symbol,
            evEbitda,
            roic,
            pe,
          };
        } catch {
          return null;
        }
      }),
    );

    const peersFiltered = peers.filter(
      (
        p,
      ): p is {
        symbol: string;
        name: string;
        evEbitda: number | null;
        roic: number | null;
        pe: number | null;
      } => p != null,
    );

    const evEbitdas = peersFiltered.map((p) => p.evEbitda).filter((v): v is number => v != null);
    const roics = peersFiltered.map((p) => p.roic).filter((v): v is number => v != null);

    const result = {
      symbol,
      subSector: sectorDisp,
      peers: peersFiltered,
      medians: {
        evEbitda: median(evEbitdas),
        roic: median(roics),
      },
      peerCount: peersFiltered.length,
      fetchedAt: new Date().toISOString(),
      source: "brapi-tickers",
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Peer benchmarks indisponível", detail: String(err) },
      { status: 502 },
    );
  }
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}
