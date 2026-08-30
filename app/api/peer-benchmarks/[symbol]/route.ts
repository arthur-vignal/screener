import { NextRequest, NextResponse } from "next/server";
import { brapiStatistics, type BrapiKeyStatistics } from "@/lib/brapi";

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
 * Migrado pra v2 (2026-08-30): substitui `/quote/{t}?modules=summaryProfile`
 * (que agora exige token Pro) por `/v2/stocks/profile?symbols=X` (free tier)
 * + `/v2/stocks/statistics?symbols=X,Y,Z` (já era v2).
 *
 * Estratégia:
 *   1. /v2/stocks/profile?symbols={symbol} → sectorDisp do alvo
 *   2. /v2/tickers?limit=100 → lista de candidatos (B3 universe)
 *   3. Batch /v2/stocks/profile?symbols=X,Y,Z → filtra por mesmo sectorDisp
 *   4. /v2/stocks/statistics?symbols=X,Y,Z&mode=current → trailingPE,
 *      EV/EBITDA, ROE dos peers + alvo
 *
 * Cache 1h (via brapiStatisticsBatch + brapiProfile internos).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 25;

type StatsRow = {
  symbol?: string;
  trailingPE?: number | null;
  returnOnEquity?: number | null;
  enterpriseToEbitda?: number | null;
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
    // 1) Descobre subsetor via `/v2/tickers`. NOTA: brapi tem 3 representações
    // de subsetor diferentes e inconsistentes entre endpoints —
    //   /v2/stocks/profile?symbols=X → sectorDisp (setor amplo, ex: "Energia")
    //   /v2/tickers → subsector (subsetor granular, ex: "Petróleo e Gás Integrado")
    //   /api/quote/{t}?modules=summaryProfile → industryDisp (subsetor granular)
    // O subsetor granular só existe em `/v2/tickers` e no legacy `/quote`.
    // Aqui usamos `/v2/tickers` pra ficar no v2.
    const targetTickersResp = (await fetchJson(
      `https://brapi.dev/api/v2/tickers?search=${encodeURIComponent(symbol)}`,
    )) as { results?: Array<{ symbol?: string; subsector?: string }> };
    const targetTicker = targetTickersResp.results?.find(
      (t) => t.symbol === symbol,
    );
    const subsector = targetTicker?.subsector ?? null;

    // 2) Lista todos os tickers (B3 universo). Cada item já traz tudo que
    // precisamos: `subsector` (filtro de subsetor), `name`/`longName`
    // (label do peer). Não precisa de round-trip extra em /profile.
    const tickersResp = (await fetchJson(
      `https://brapi.dev/api/v2/tickers?limit=200`,
    )) as {
      results?: Array<{
        symbol?: string;
        name?: string;
        longName?: string;
        subsector?: string;
      }>;
    };
    const allCandidates = (tickersResp?.results ?? []).filter(
      (t) => t.symbol && t.symbol !== symbol,
    );

    // Filtra por mesmo subsetor. Se `subsector` for null (não veio no
    // /tickers), aceita qualquer (fallback).
    const sameSector = subsector
      ? allCandidates
          .filter((p) => p.subsector === subsector)
          .slice(0, 12)
      : allCandidates.slice(0, 12);

    // 3) Statistics por símbolo. brapi `/v2/stocks/statistics?symbols=X,Y,Z`
    // tem bug conhecido: em batch retorna `returnOnEquity=null` pra todos
    // os itens (single endpoint funciona). Workaround: chama single por
    // símbolo em paralelo. Cache interno mitiga custo.
    const allSymbols = [symbol, ...sameSector.map((p) => p.symbol!).filter(Boolean)];
    const statsEntries = await Promise.all(
      allSymbols.map(async (s) => [s, await brapiStatistics({ symbol: s, mode: "current", period: "annual" })] as const),
    );
    const statsBySymbol = new Map<string, BrapiKeyStatistics>();
    for (const [s, stats] of statsEntries) {
      if (stats && !Array.isArray(stats)) statsBySymbol.set(s, stats);
    }

    // Monta peers com EV/EBITDA + ROIC (proxy: ROE) + P/E.
    const peers = sameSector
      .filter((p) => p.symbol)
      .map((p) => {
        const ks = statsBySymbol.get(p.symbol!);
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
          symbol: p.symbol!,
          name: p.name ?? p.longName ?? p.symbol!,
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

    return NextResponse.json({
      symbol,
      subSector: subsector,
      peers,
      medians: {
        evEbitda: median(evEbitdas),
        roic: median(roics),
        pe: median(pes),
      },
      asset,
      peerCount: peers.length,
      fetchedAt: new Date().toISOString(),
      source: "brapi-v2-batch",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Peer benchmarks indisponível", detail: String(err) },
      { status: 502 },
    );
  }
}