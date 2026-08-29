import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/peer-benchmarks/[symbol] — benchmarks do subsetor para o scatter
 * qualidade×preço.
 *
 * Retorna:
 *   - symbol: ticker pedido
 *   - subSector: subsetor derivado (ex: "Petróleo e Gás Integrado")
 *   - peers: array de { symbol, name, evEbitda, roic, pe }
 *   - medians: { evEbitda, roic, pe } — medianas do subsetor
 *   - asset: { evEbitda, roic, pe } — o próprio ticker
 *   - fetchedAt, source
 *
 * Mudança 2026-08-29: refator pra usar `/quote/{t}?modules=summaryProfile`
 * (que funciona pra BR) em vez do antigo
 * `/quote/{t}?modules=defaultKeyStatistics,financialData` (que dá 404).
 *
 * Estratégia:
 *   1. /quote/{symbol}?modules=summaryProfile → sector/industry do alvo
 *   2. /v2/tickers?limit=30 → lista de candidatos
 *   3. Batch /quote/{cand1,cand2,...}?modules=summaryProfile → filtra
 *      por mesmo sectorDisp
 *   4. Batch /stocks/statistics?symbols=X,Y,... → trailingPE, EV/EBITDA,
 *      returnOnEquity
 *
 * Cache 1h — peers não mudam frequentemente.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

type PeerQuote = {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  sector?: string;
  sectorDisp?: string;
  industryDisp?: string;
  type?: string;
  summaryProfile?: { sectorDisp?: string; sector?: string; industryDisp?: string };
};

type StatsRow = {
  symbol?: string;
  trailingPE?: number | null;
  priceEarnings?: number | null;
  returnOnEquity?: number | null;
  earningsPerShare?: number | null;
  priceToBook?: number | null;
  beta?: number | null;
  dividendYield?: number | null;
  yield?: number | null;
  enterpriseToEbitda?: number | null;
  enterpriseToRevenue?: number | null;
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
    // 1) Descobre subsetor via /quote/{t}?modules=summaryProfile.
    // Note: sectorDisp vem em `summaryProfile.sectorDisp` (não no nível raiz).
    const targetQuote = (await fetchJson(
      `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?modules=summaryProfile`,
    )) as { results?: Array<PeerQuote> };
    const target = targetQuote?.results?.[0];
    const sectorDisp =
      target?.sectorDisp ??
      target?.summaryProfile?.sectorDisp ??
      target?.summaryProfile?.sector ??
      null;

    // 2) Lista todos os tickers (B3 universo).
    // /v2/tickers retorna `results[]` (não `tickers[]`).
    const tickersResp = (await fetchJson(
      `https://brapi.dev/api/v2/tickers?limit=100`,
    )) as { results?: PeerQuote[] };
    const allCandidates = (tickersResp?.results ?? []).filter(
      (t) => t.symbol && t.symbol !== symbol,
    );

    // 3) Batch fetch summaryProfile de todos os candidatos pra filtrar
    // por mesmo sectorDisp. Limite de 20 tickers por request (plano Pro).
    // 19 candidatos por batch (1 slot livre).
    const candidatesSymbols = allCandidates
      .slice(0, 19)
      .map((t) => t.symbol)
      .join(",");
    const candidatesResp = (await fetchJson(
      `https://brapi.dev/api/quote/${encodeURIComponent(
        candidatesSymbols,
      )}?modules=summaryProfile`,
    )) as { results?: PeerQuote[] };

    // Segunda leva de 19 (pega mais peers se o subsetor for raro).
    let candidates: PeerQuote[] = candidatesResp?.results ?? [];
    if (allCandidates.length > 19) {
      const moreSymbols = allCandidates
        .slice(19, 38)
        .map((t) => t.symbol)
        .join(",");
      try {
        const moreResp = (await fetchJson(
          `https://brapi.dev/api/quote/${encodeURIComponent(
            moreSymbols,
          )}?modules=summaryProfile`,
        )) as { results?: PeerQuote[] };
        candidates = candidates.concat(moreResp?.results ?? []);
      } catch {
        // ignore — first batch é suficiente
      }
    }

    // sectorDisp vem em `summaryProfile.sectorDisp` (não no nível raiz).
    const sameSector = sectorDisp
      ? candidates
          .filter(
            (c) => c.sectorDisp === sectorDisp ||
              c.summaryProfile?.sectorDisp === sectorDisp,
          )
          .slice(0, 12)
      : candidates.slice(0, 12);

    if (sameSector.length === 0) {
      // Sem peers do mesmo subsetor — retorna com arrays vazios em vez de erro.
      const targetStats = await fetchSelfStats(symbol);
      return NextResponse.json({
        symbol,
        subSector: sectorDisp,
        peers: [],
        medians: { evEbitda: null, roic: null, pe: null },
        asset: targetStats,
        peerCount: 0,
        fetchedAt: new Date().toISOString(),
        source: "brapi-batch",
      });
    }

    // 4) Batch fetch statistics dos peers + ticker alvo.
    const symbolsParam = [symbol, ...sameSector.map((p) => p.symbol)]
      .filter(Boolean)
      .join(",");
    const statsResp = (await fetchJson(
      `https://brapi.dev/api/v2/stocks/statistics?symbols=${encodeURIComponent(
        symbolsParam,
      )}&mode=current`,
    )) as { results?: Array<{ symbol?: string; data?: StatsRow }> };

    const statsBySymbol = new Map<string, StatsRow>();
    for (const r of statsResp?.results ?? []) {
      if (r.symbol && r.data) statsBySymbol.set(r.symbol, r.data);
    }

    // Monta peers com EV/EBITDA + ROIC (proxy: ROE) + P/E (dados REAIS).
    const peers: Array<{
      symbol: string;
      name: string;
      evEbitda: number | null;
      roic: number | null;
      pe: number | null;
    }> = sameSector.map((p) => {
      const ks = statsBySymbol.get(p.symbol);
      const evEbitda =
        ks?.enterpriseToEbitda != null && Number.isFinite(ks.enterpriseToEbitda)
          ? ks.enterpriseToEbitda
          : null;
      const roic =
        ks?.returnOnEquity != null && Number.isFinite(ks.returnOnEquity)
          ? ks.returnOnEquity
          : null;
      const pe =
        ks?.trailingPE != null && Number.isFinite(ks.trailingPE)
          ? ks.trailingPE
          : null;
      return {
        symbol: p.symbol,
        name: p.shortName ?? p.longName ?? p.symbol,
        evEbitda,
        roic,
        pe,
      };
    });

    // Stats do próprio ticker.
    const selfStats = statsBySymbol.get(symbol);
    const asset = {
      evEbitda:
        selfStats?.enterpriseToEbitda != null &&
        Number.isFinite(selfStats.enterpriseToEbitda)
          ? selfStats.enterpriseToEbitda
          : null,
      roic:
        selfStats?.returnOnEquity != null && Number.isFinite(selfStats.returnOnEquity)
          ? selfStats.returnOnEquity
          : null,
      pe:
        selfStats?.trailingPE != null && Number.isFinite(selfStats.trailingPE)
          ? selfStats.trailingPE
          : null,
    };

    // Medianas do subsetor (excluindo o próprio ticker).
    const evEbitdas = peers.map((p) => p.evEbitda).filter((v): v is number => v != null);
    const roics = peers.map((p) => p.roic).filter((v): v is number => v != null);
    const pes = peers.map((p) => p.pe).filter((v): v is number => v != null);

    const result = {
      symbol,
      subSector: sectorDisp,
      peers,
      medians: {
        evEbitda: median(evEbitdas),
        roic: median(roics),
        pe: median(pes),
      },
      asset,
      peerCount: peers.length,
      fetchedAt: new Date().toISOString(),
      source: "brapi-batch",
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Peer benchmarks indisponível", detail: String(err) },
      { status: 502 },
    );
  }
}

async function fetchSelfStats(symbol: string): Promise<{
  evEbitda: number | null;
  roic: number | null;
  pe: number | null;
}> {
  try {
    const resp = (await fetchJson(
      `https://brapi.dev/api/v2/stocks/statistics?symbols=${encodeURIComponent(symbol)}&mode=current`,
    )) as { results?: Array<{ data?: StatsRow }> };
    const ks = resp?.results?.[0]?.data;
    return {
      evEbitda:
        ks?.enterpriseToEbitda != null && Number.isFinite(ks.enterpriseToEbitda)
          ? ks.enterpriseToEbitda
          : null,
      roic:
        ks?.returnOnEquity != null && Number.isFinite(ks.returnOnEquity)
          ? ks.returnOnEquity
          : null,
      pe:
        ks?.trailingPE != null && Number.isFinite(ks.trailingPE)
          ? ks.trailingPE
          : null,
    };
  } catch {
    return { evEbitda: null, roic: null, pe: null };
  }
}
