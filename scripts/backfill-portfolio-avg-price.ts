/**
 * backfill-portfolio-avg-price.ts — corrige holdings com avg_price=1
 * que foram preenchidos pelo backfill "burro" da migration 0006.
 *
 * Pra cada holding com `avg_price = 1` (sinal de que veio do fallback),
 * busca no brapi o candle mais próximo do `purchased_at` (que era o
 * `created_at` do portfolio na época) e:
 *   - avg_price = close do candle mais próximo (≤ 7 dias de distância)
 *   - qty = max(1, round((weight × initial_value) / avg_price))
 *   - purchased_at = ts do candle escolhido (mais realista que created_at)
 *
 * Se brapi não retornar dado pra aquele símbolo/data, mantém os valores
 * atuais e loga um aviso (user pode editar via UI).
 *
 * Idempotente: só processa holdings com avg_price = 1. Roda2x = sem efeito.
 *
 * Run: `npx tsx scripts/backfill-portfolio-avg-price.ts`
 *      ou `npm run backfill:portfolio`
 *
 * Custo: ~1 request brapi /holding (50 holdings ≈ 50 requests). Roda em
 * ~30 segundos pra portfolio médio.
 */

import { query } from "../lib/db";
import { brapiHistorical, type BrapiCandle } from "../lib/brapi";

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

const TOKEN = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";

function findClosestCandle(
  candles: BrapiCandle[],
  targetTs: number,
): BrapiCandle | null {
  if (candles.length === 0) return null;
  // Binary search pelo candle mais próximo (mín |ts - target|).
  // candles deve estar ordenado ASC.
  // Edge case: target antes do primeiro candle → retorna o primeiro.
  if (targetTs <= candles[0]!.timestamp) return candles[0]!;
  // Edge case: target depois do último → retorna o último.
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
  // Após o loop, lo aponta pro primeiro candle com ts > target. O mais
  // próximo é entre candles[lo-1] (último com ts < target) e candles[lo].
  const before = candles[lo - 1]!;
  const after = candles[lo]!;
  const distBefore = targetTs - before.timestamp;
  const distAfter = after.timestamp - targetTs;
  return distBefore <= distAfter ? before : after;
}

async function backfillOne(h: Holding, p: Portfolio): Promise<string> {
  // Pega candles diários de 1 ano cobrindo purchased_at ± 1 ano.
  // brapi retorna DESC por padrão — reordena ASC pra binary search funcionar.
  const rawCandles = await brapiHistorical(h.symbol, {
    range: "1y",
    interval: "1d",
  });
  const candles = [...rawCandles].sort((a, b) => a.timestamp - b.timestamp);
  if (candles.length === 0) {
    return `⚠ ${p.slug}/${h.symbol}: brapi retornou vazio, mantendo avg_price=1`;
  }
  const closest = findClosestCandle(candles, h.purchased_at * 1000);
  if (!closest) {
    return `⚠ ${p.slug}/${h.symbol}: sem candle próximo de ${new Date(h.purchased_at * 1000).toISOString()}`;
  }
  // Rejeita se a distância for > 7 dias (ticker novo demais ou data muito antiga).
  const distDays = Math.abs(closest.timestamp - h.purchased_at * 1000) / 86_400_000;
  if (distDays > 7) {
    return `⚠ ${p.slug}/${h.symbol}: candle mais próximo está a ${distDays.toFixed(1)} dias, ignorando`;
  }

  const newAvgPrice = closest.close;
  // qty = round((weight × initial_value) / avg_price) — garante ≥ 1 unidade.
  const newQty = Math.max(1, Math.round((h.weight * p.initial_value) / newAvgPrice));
  const newPurchasedAt = Math.floor(closest.timestamp / 1000);

  // Update via REST do Supabase.
  const { supabaseAdmin } = await import("../lib/supabase");
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
    return `✗ ${p.slug}/${h.symbol}: update falhou: ${error.message}`;
  }

  const oldValue = h.qty * h.avg_price;
  const newValue = newQty * newAvgPrice;
  return `✓ ${p.slug}/${h.symbol}: avg_price ${h.avg_price.toFixed(2)} → ${newAvgPrice.toFixed(2)}, qty ${h.qty} → ${newQty}, posição R$ ${oldValue.toFixed(2)} → R$ ${newValue.toFixed(2)}`;
}

async function main(): Promise<void> {
  if (!TOKEN) {
    console.warn(
      "[backfill] BRAPI_TOKEN não setado — vai bater no brapi free tier (rate limit pode ser agressivo)",
    );
  }

  // 1. Busca portfolios (precisamos do initial_value pra calcular qty).
  const portfolios = await query<Portfolio>(
    `SELECT id, name, slug, initial_value FROM portfolios`,
  );
  const portfolioMap = new Map(portfolios.map((p) => [p.id, p]));

  // 2. Holdings com avg_price = 1 (sinal do backfill burro).
  const targets = await query<Holding>(
    `SELECT portfolio_id, symbol, weight, avg_price, qty, purchased_at
     FROM portfolio_holdings
     WHERE avg_price = 1.0 AND qty > 0`,
  );

  if (targets.length === 0) {
    console.log("[backfill] Nenhum holding com avg_price=1. Nada a fazer.");
    return;
  }

  console.log(
    `[backfill] ${targets.length} holdings com avg_price=1. Processando em batches de 5...`,
  );

  // 3. Processa em batches de 5 (limite prático do brapi).
  const BATCH = 5;
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((h) => {
        const p = portfolioMap.get(h.portfolio_id);
        if (!p) return Promise.resolve(`✗ holding órfão: ${h.symbol} (portfolio_id=${h.portfolio_id})`);
        return backfillOne(h, p);
      }),
    );
    for (const r of results) {
      const msg = r.status === "fulfilled" ? r.value : `✗ exception: ${(r.reason as Error).message}`;
      console.log(`  ${msg}`);
      if (msg.startsWith("✓")) success += 1;
      else if (msg.startsWith("⚠")) skipped += 1;
      else failed += 1;
    }
    // Rate limit: 200ms entre batches pra ser gentil com o brapi.
    if (i + BATCH < targets.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n[backfill] Done. ${success} atualizados, ${skipped} ignorados, ${failed} erros.`);
  if (skipped > 0) {
    console.log(
      "[backfill] Holdings ignorados precisam de edição manual via UI (/portfolio/[slug] → Add items).",
    );
  }
}

main().catch((err) => {
  console.error("[backfill] Erro fatal:", err);
  process.exit(1);
});