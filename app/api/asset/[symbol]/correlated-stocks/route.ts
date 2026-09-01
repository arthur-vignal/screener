/**
 * /api/asset/[symbol]/correlated-stocks — top 4 pares correlatos do
 * subsetor, com market cap + 7d/30d change pra UI de "ações correlatas".
 *
 * Estratégia (Fase 2 / pending fix item 3 — 2026-08-30):
 *   1. Pega peers via /api/peer-benchmarks/[symbol] (subsetor + fallback
 *      setor amplo se <3 peers).
 *   2. Filtra o próprio símbolo + ordena por marketCap desc.
 *   3. Pega top4 símbolos.
 *   4. Enriquece com quotes (price, change, change7d, change30d, mcap).
 *
 * Cache 5min (subsetor não muda; quote 60s reusa getBrapiQuoteBatchLight).
 */

import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { getBrapiQuoteBatchLight } from "@/lib/brapi-quote-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TOP_N = 4;
const PEER_BENCH_URL = (sym: string) => `/api/peer-benchmarks/${sym}`;

type PeerBenchmarkItem = {
  symbol: string;
  name: string;
  evEbitda: number | null;
  roe: number | null;
  pe: number | null;
};

type PeerBenchmarkResponse = {
  symbol: string;
  subSector: string | null;
  peerCount: number;
  peers: PeerBenchmarkItem[];
  medians: { evEbitda: number | null; roe: number | null; pe: number | null };
  asset: { evEbitda: number | null; roe: number | null; pe: number | null };
  sectorFallback: boolean;
};

type QuoteBatch = Awaited<ReturnType<typeof getBrapiQuoteBatchLight>>;

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
    // 1. Pega peers do subsetor (server-side fetch — evita hop extra).
    const peerUrl = PEER_BENCH_URL(symbol);
    const origin = _req.nextUrl.origin;
    const peerRes = await fetch(`${origin}${peerUrl}`, {
      cache: "no-store",
    });
    if (!peerRes.ok) {
      return NextResponse.json(
        { error: "peer-benchmarks upstream failed" },
        { status: 502 },
      );
    }
    const peerData = (await peerRes.json()) as PeerBenchmarkResponse;

    // 2. Filtra próprio símbolo + top N (sem ordenação — vamos
    //    enriquecê-los com marketCap primeiro pra ordenar).
    const candidates = peerData.peers
      .filter((p) => p.symbol !== symbol)
      .slice(0, 12);

    if (candidates.length === 0) {
      return NextResponse.json({ symbol, rows: [], peersTotal: 0 });
    }

    // 3. Enriquece com marketCap (e change 7d/30d) via batch de quotes.
    const quoteMap: QuoteBatch = await cached(
      `correlated-quotes:${symbol}`,
      5 * 60,
      async () => {
        return getBrapiQuoteBatchLight(candidates.map((p) => p.symbol));
      },
    );

    // 4. Combina + ordena por marketCap desc + top N.
    const enriched = candidates
      .map((p) => {
        const q = quoteMap.get(p.symbol);
        return {
          symbol: p.symbol,
          name: p.name,
          price: q?.price ?? null,
          changePercent: q?.changePercent ?? null,
          changePercent7d: q?.changePercent7d ?? null,
          changePercent30d: q?.changePercent30d ?? null,
          marketCap: q?.marketCap ?? null,
          roe: p.roe,
          pe: p.pe,
        };
      })
      .sort((a, b) => {
        // nulls no fim
        const am = a.marketCap ?? 0;
        const bm = b.marketCap ?? 0;
        return bm - am;
      })
      .slice(0, TOP_N);

    return NextResponse.json({
      symbol,
      rows: enriched,
      peersTotal: peerData.peerCount,
      subSector: peerData.subSector,
      sectorFallback: peerData.sectorFallback,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}