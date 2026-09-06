/**
 * /api/admin/backfill-portfolio — endpoint server-side pra corrigir
 * holdings legados com avg_price=1.
 *
 * Equivalente ao `scripts/backfill-portfolio-avg-price.ts`, mas executa
 * in-process (sem spawn de subprocess). Chamada via:
 *
 *   curl -X POST 'https://screener-production-4f58.up.railway.app/api/admin/backfill-portfolio?key=<SECRET>'
 *
 * Auth: query param `key` precisa bater com ADMIN_BACKFILL_KEY do env
 * (default: desabilita o endpoint se não setado).
 *
 * Retorna: { success, total, succeeded, skipped, failed, items }
 */

import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { brapiHistorical, type BrapiCandle } from "@/lib/brapi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Holding = {
  portfolio_id: number;
  symbol: string;
  weight: number;
  avg_price: number;
  qty: number;
  purchased_at: number;
};

type Portfolio = {
  id: number;
  name: string;
  slug: string;
  initial_value: number;
};

type BackfillItem = {
  symbol: string;
  portfolio: string;
  status: "ok" | "skip" | "fail";
  oldValue: number;
  newValue: number | null;
  avgPrice: number | null;
  qty: number | null;
  message: string;
};

function findClosestCandle(
  candles: BrapiCandle[],
  targetTs: number,
): BrapiCandle | null {
  if (candles.length === 0) return null;
  if (targetTs <= candles[0]!.timestamp) return candles[0]!;
  if (targetTs >= candles[candles.length - 1]!.timestamp) {
    return candles[candles.length - 1]!;
  }
  let lo = 0;
  let hi = candles.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = candles[mid]!;
    if (c.timestamp === targetTs) return c;
    if (c.timestamp < targetTs) lo = mid + 1;
    else hi = mid - 1;
  }
  const before = candles[lo - 1]!;
  const after = candles[lo]!;
  const distBefore = targetTs - before.timestamp;
  const distAfter = after.timestamp - targetTs;
  return distBefore <= distAfter ? before : after;
}

async function backfillOne(
  h: Holding,
  p: Portfolio,
): Promise<BackfillItem> {
  const oldValue = h.qty * h.avg_price;
  const rawCandles = await brapiHistorical(h.symbol, {
    range: "1y",
    interval: "1d",
  });
  const candles = [...rawCandles].sort((a, b) => a.timestamp - b.timestamp);
  if (candles.length === 0) {
    return {
      symbol: h.symbol,
      portfolio: p.slug,
      status: "skip",
      oldValue,
      newValue: null,
      avgPrice: null,
      qty: null,
      message: "brapi retornou vazio",
    };
  }
  const closest = findClosestCandle(candles, h.purchased_at * 1000);
  if (!closest) {
    return {
      symbol: h.symbol,
      portfolio: p.slug,
      status: "skip",
      oldValue,
      newValue: null,
      avgPrice: null,
      qty: null,
      message: `sem candle próximo de ${new Date(h.purchased_at * 1000).toISOString()}`,
    };
  }
  const distDays =
    Math.abs(closest.timestamp - h.purchased_at * 1000) / 86_400_000;
  if (distDays > 7) {
    return {
      symbol: h.symbol,
      portfolio: p.slug,
      status: "skip",
      oldValue,
      newValue: null,
      avgPrice: null,
      qty: null,
      message: `candle mais próximo a ${distDays.toFixed(1)} dias`,
    };
  }

  const newAvgPrice = closest.close;
  const newQty = Math.max(
    1,
    Math.round((h.weight * p.initial_value) / newAvgPrice),
  );
  const newPurchasedAt = Math.floor(closest.timestamp / 1000);

  const { supabaseAdmin } = await import("@/lib/supabase");
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("portfolio_holdings")
    .update({
      qty: newQty,
      avg_price: newAvgPrice,
      purchased_at: newPurchasedAt,
    })
    .eq("portfolio_id", h.portfolio_id)
    .eq("symbol", h.symbol);
  if (error) {
    return {
      symbol: h.symbol,
      portfolio: p.slug,
      status: "fail",
      oldValue,
      newValue: null,
      avgPrice: null,
      qty: null,
      message: error.message,
    };
  }
  return {
    symbol: h.symbol,
    portfolio: p.slug,
    status: "ok",
    oldValue,
    newValue: newQty * newAvgPrice,
    avgPrice: newAvgPrice,
    qty: newQty,
    message: `avg_price 1 → ${newAvgPrice.toFixed(2)}, qty ${h.qty} → ${newQty}`,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth: ?key= precisa bater com ADMIN_BACKFILL_KEY.
  const expected = process.env.ADMIN_BACKFILL_KEY ?? "";
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_BACKFILL_KEY não configurada no servidor" },
      { status: 503 },
    );
  }
  const provided = req.nextUrl.searchParams.get("key") ?? "";
  if (provided !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Carrega portfolios e holdings com avg_price=1.
  const portfolios = await query<Portfolio>(
    `SELECT id, name, slug, initial_value FROM portfolios`,
  );
  const portfolioMap = new Map(portfolios.map((p) => [p.id, p]));

  const targets = await query<Holding>(
    `SELECT portfolio_id, symbol, weight, avg_price, qty, purchased_at
     FROM portfolio_holdings
     WHERE avg_price = 1.0 AND qty > 0`,
  );

  if (targets.length === 0) {
    return NextResponse.json({
      success: true,
      total: 0,
      succeeded: 0,
      skipped: 0,
      failed: 0,
      items: [],
      message: "Nenhum holding com avg_price=1. Nada a fazer.",
    });
  }

  const items: BackfillItem[] = [];
  const BATCH = 5;
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((h) => {
        const p = portfolioMap.get(h.portfolio_id);
        if (!p) {
          return Promise.resolve({
            symbol: h.symbol,
            portfolio: "órfão",
            status: "fail" as const,
            oldValue: h.qty * h.avg_price,
            newValue: null,
            avgPrice: null,
            qty: null,
            message: `portfolio_id=${h.portfolio_id} não existe`,
          });
        }
        return backfillOne(h, p);
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") items.push(r.value);
      else
        items.push({
          symbol: "?",
          portfolio: "?",
          status: "fail",
          oldValue: 0,
          newValue: null,
          avgPrice: null,
          qty: null,
          message: `exception: ${(r.reason as Error).message}`,
        });
    }
    // Rate limit gentil com brapi.
    if (i + BATCH < targets.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const succeeded = items.filter((i) => i.status === "ok").length;
  const skipped = items.filter((i) => i.status === "skip").length;
  const failed = items.filter((i) => i.status === "fail").length;

  return NextResponse.json({
    success: failed === 0,
    total: targets.length,
    succeeded,
    skipped,
    failed,
    items,
  });
}

// GET: testa se endpoint está configurado (não roda backfill).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.ADMIN_BACKFILL_KEY ?? "";
  const configured = expected.length > 0;
  return NextResponse.json({
    endpoint: "backfill-portfolio",
    configured,
    method: "POST",
    usage: "POST /api/admin/backfill-portfolio?key=<ADMIN_BACKFILL_KEY>",
  });
}