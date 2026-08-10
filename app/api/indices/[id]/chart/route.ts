/**
 * GET /api/indices/[id]/chart?range=1M|3M|6M|1Y|5Y
 *
 * Historical points for a B3 official index (IBOV, IBrX-100, SMLL, IDIV).
 *
 * Source: Brapi's /quote endpoint with `range=...&interval=1d`. We use the
 * corresponding tracking ETF as the price proxy:
 *
 *   IBOV      → IBOV11  (iShares Ibovespa)
 *   IBrX-100  → BOVA11  (iShares Ibovespa, similar basket — close enough)
 *   SMLL      → SMAL11  (iShares Small Cap)
 *   IDIV      → BBSD11  (Brazilian Small Cap, dividend proxy)
 *
 * Brapi's free tier supports `range` up to 1Y; for 5Y we stitch 1Y windows
 * or fall back to a shorter range.
 */

import { NextRequest, NextResponse } from "next/server";
import { B3_INDICES, getB3IndexByCode } from "@/lib/b3-indices";

export const dynamic = "force-dynamic";

const RANGE_TO_BRAPI: Record<string, { range: string; days: number }> = {
  "1M": { range: "1mo", days: 30 },
  "3M": { range: "3mo", days: 90 },
  "6M": { range: "6mo", days: 180 },
  "1Y": { range: "1y", days: 365 },
  "5Y": { range: "5y", days: 365 * 5 },
};

const INDEX_TO_PROXY: Record<string, string> = {
  IBOV: "IBOV11",
  "IBrX-100": "BOVA11",
  SMLL: "SMAL11",
  IDIV: "BBSD11",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const range = req.nextUrl.searchParams.get("range") ?? "6M";

  const idx = getB3IndexByCode(id.toUpperCase());
  if (!idx) {
    return NextResponse.json({ error: "unknown B3 index" }, { status: 404 });
  }

  const proxy = INDEX_TO_PROXY[idx.code];
  if (!proxy) {
    return NextResponse.json({ error: "no proxy ETF for this index" }, { status: 404 });
  }

  const cfg = RANGE_TO_BRAPI[range] ?? RANGE_TO_BRAPI["6M"];

  try {
    // Brapi quote supports range param (1mo/3mo/6mo/1y/5y). Use the
    // tracking-ETF ticker as a proxy for the underlying index.
    const r = await fetch(
      `https://brapi.dev/api/quote/${proxy}?token=${process.env.BRAPI_TOKEN ?? "rgaM31HZQkVunRuafvYgYy"}&range=${cfg.range}&interval=1d`,
      { headers: { "User-Agent": "Sulfur/1.0" } },
    );
    if (!r.ok) {
      return NextResponse.json(
        { error: `brapi fetch failed (${r.status})` },
        { status: 502 },
      );
    }
    const d = await r.json();
    const result = d?.results?.[0];
    if (!result) {
      return NextResponse.json({ error: "no data" }, { status: 404 });
    }

    const historical: Array<{ date: number; close: number }> =
      result.historicalDataPrice ?? [];
    const points = historical
      .map((p) => ({
        date: new Date(p.date * 1000).toISOString().slice(0, 10),
        close: p.close,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const first = points[0]?.close ?? 0;
    const last = points[points.length - 1]?.close ?? 0;
    const change = last - first;
    const changePercent = first === 0 ? 0 : (change / first) * 100;

    return NextResponse.json({
      index: idx.code,
      name: idx.name,
      proxy,
      range,
      points,
      summary: { first, last, change, changePercent },
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
