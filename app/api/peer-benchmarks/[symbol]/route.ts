import { NextRequest, NextResponse } from "next/server";
import { brapiStatistics, brapiFinancialData, type BrapiKeyStatistics } from "@/lib/brapi";

/**
 * /api/peer-benchmarks/[symbol] — benchmarks do subsetor para o scatter
 * qualidade×preço (B4 da spec 2026-08-29).
 *
 * Retorna:
 *   - symbol: ticker pedido
 *   - subSector: subsetor derivado (ex: "Petróleo e Gás Integrado")
 *   - peers: array de { symbol, name, evEbitda, roe, pe }
 *   - medians: { evEbitda, roe, pe } — medianas do subsetor
 *   - asset: { evEbitda, roe, pe } — o próprio ticker
 *   - fetchedAt, source
 *
 * Estratégia (atualizada B4 — spec 2026-08-29):
 *   1. /v2/stocks/profile?symbols={symbol} → sectorDisp do alvo
 *   2. /v2/tickers?limit=100 → lista de candidatos (B3 universe)
 *   3. Batch /v2/stocks/profile?symbols=X,Y,Z → filtra por mesmo subsector
 *      (B4: se subsetor tem <3 peers, aceita sector amplo como fallback)
 *   4. /v2/stocks/statistics?symbols=X,Y,Z&mode=current → P/E, EV/EBITDA
 *   5. /v2/stocks/financial-data?symbols=X,Y,Z&mode=current → returnOnEquity
 *      (B4 spec: X=ROIC, fallback ROE se ROIC não computar — brapi não
 *      expõe NOPAT/equity granular no free tier, então usamos ROE como X)
 *
 * Cache 1h (via brapi wrappers internos).
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
    )) as { results?: Array<{ symbol?: string; subsector?: string; sector?: string }> };
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
        sector?: string;
      }>;
    };
    const allCandidates = (tickersResp?.results ?? []).filter(
      (t) => t.symbol && t.symbol !== symbol,
    );

    // Filtra por mesmo subsetor. Se `subsector` for null (não veio no
    // /tickers), aceita qualquer (fallback).
    // Filtra por mesmo subsetor. Se o subsetor tem <3 peers (caso comum
    // — PETR4 é a única "Petróleo e Gás Integrado" listada), aceita sector
    // amplo como fallback. B4 da spec: mínimo 5 peers; abaixo disso
    // o componente cliente mostra só scatter + mediana sem reta OLS.
    let sameSector = subsector
      ? allCandidates
          .filter((p) => p.subsector === subsector)
          .slice(0, 12)
      : allCandidates.slice(0, 12);
    let sectorFallback = false;
    if (sameSector.length < 3 && subsector && targetTicker) {
      sameSector = allCandidates
        .filter((p) => p.sector === targetTicker.sector)
        .slice(0, 12);
      sectorFallback = true;
    }

    // 3) Statistics por símbolo. brapi `/v2/stocks/statistics?symbols=X,Y,Z`
    // tem bug conhecido: em batch retorna `returnOnEquity=null` pra todos
    // os itens (single endpoint funciona). Workaround: chama single por
    // símbolo em paralelo. Cache interno mitiga custo.
    const allSymbols = [symbol, ...sameSector.map((p) => p.symbol!).filter(Boolean)];

    // 4) Financial data em paralelo (free tier retorna ROE/ROA granular).
    // B4 spec: X=ROIC, fallback ROE. brapi não expõe NOPAT/equity
    // granular no `/statistics` no free tier, mas expõe no
    // `/financial-data`. Usamos ROE como proxy direto (mesma família
    // de retorno sobre capital próprio).
    const [statsEntries, fdEntries] = await Promise.all([
      Promise.all(
        allSymbols.map(
          async (s) =>
            [s, await brapiStatistics({ symbol: s, mode: "current", period: "annual" })] as const,
        ),
      ),
      Promise.all(
        allSymbols.map(
          async (s) =>
            [s, await brapiFinancialData({ symbol: s, mode: "current" })] as const,
        ),
      ),
    ]);
    const statsBySymbol = new Map<string, BrapiKeyStatistics>();
    for (const [s, stats] of statsEntries) {
      if (stats && !Array.isArray(stats)) statsBySymbol.set(s, stats);
    }
    const fdBySymbol = new Map<string, import("@/lib/brapi").BrapiFinancialData>();
    for (const [s, fd] of fdEntries) {
      if (fd && !Array.isArray(fd)) fdBySymbol.set(s, fd);
    }

    // Monta peers com EV/EBITDA + ROE (via financial-data) + P/E.
    const peers = sameSector
      .filter((p) => p.symbol)
      .map((p) => {
        const ks = statsBySymbol.get(p.symbol!);
        const fd = fdBySymbol.get(p.symbol!);
        const evEbitda =
          ks?.enterpriseToEbitda != null && Number.isFinite(ks.enterpriseToEbitda)
            ? ks.enterpriseToEbitda
            : null;
        // ROE vem de financial-data (free tier). Fallback: returnOnEquity
        // do statistics (Pro only, geralmente null).
        const roe =
          fd?.returnOnEquity != null && Number.isFinite(fd.returnOnEquity)
            ? fd.returnOnEquity
            : ks?.returnOnEquity != null && Number.isFinite(ks.returnOnEquity)
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
          roe,
          pe,
        };
      })
      .filter((p) => p.roe != null); // Só peers com ROE conhecido entram no scatter

    // Stats do próprio ticker.
    const selfStats = statsBySymbol.get(symbol);
    const selfFd = fdBySymbol.get(symbol);
    const asset = {
      evEbitda:
        selfStats?.enterpriseToEbitda != null &&
        Number.isFinite(selfStats.enterpriseToEbitda)
          ? selfStats.enterpriseToEbitda
          : null,
      roe:
        selfFd?.returnOnEquity != null && Number.isFinite(selfFd.returnOnEquity)
          ? selfFd.returnOnEquity
          : selfStats?.returnOnEquity != null && Number.isFinite(selfStats.returnOnEquity)
            ? selfStats.returnOnEquity
            : null,
      pe:
        selfStats?.trailingPE != null && Number.isFinite(selfStats.trailingPE)
          ? selfStats.trailingPE
          : null,
    };

    // Medianas do subsetor (excluindo o próprio ticker).
    const evEbitdas = peers.map((p) => p.evEbitda).filter((v): v is number => v != null);
    const roes = peers.map((p) => p.roe).filter((v): v is number => v != null);
    const pes = peers.map((p) => p.pe).filter((v): v is number => v != null);

    return NextResponse.json({
      symbol,
      subSector: sectorFallback ? (targetTicker?.sector ?? null) : subsector,
      peers,
      medians: {
        evEbitda: median(evEbitdas),
        roe: median(roes),
        pe: median(pes),
      },
      asset,
      peerCount: peers.length,
      sectorFallback,
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