import { NextRequest, NextResponse } from "next/server";
import { query, insert } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAssetQuotes } from "@/lib/assets";

export const dynamic = "force-dynamic";

type WatchEntry = {
  symbol: string;
  created_at: number;
};

type Quote = {
  price: number;
  changePercent: number;
  change: number;
  currency: string;
};

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ entries: [], prices: {} });
  }

  const rows = await query<WatchEntry>(
    "SELECT symbol, EXTRACT(EPOCH FROM created_at)::bigint AS created_at FROM watchlist WHERE user_id = $1 ORDER BY created_at DESC",
    [user.userId],
  );

  const symbols = rows.map((r) => r.symbol);
  const quoteMap = await getAssetQuotes(symbols);
  const prices: Record<string, Quote | null> = {};
  for (const s of symbols) {
    const q = quoteMap.get(s);
    if (q) {
      prices[s] = {
        price: q.price,
        changePercent: q.changePercent,
        change: q.change,
        currency: q.currency,
      };
    } else {
      prices[s] = null;
    }
  }

  return NextResponse.json({
    entries: rows.map((r) => ({ symbol: r.symbol, createdAt: r.created_at })),
    prices,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { symbol?: string };
  const symbol = body.symbol?.toUpperCase().trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    await insert("watchlist", {
      user_id: user.userId,
      symbol,
    });
  } catch (e) {
    // Already exists — no-op
    const msg = (e as Error).message;
    if (!msg.includes("duplicate") && !msg.includes("unique")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, symbol });
}
