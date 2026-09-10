/**
 * /api/portfolio/summary — resumo agregado dos portfolios do user.
 *
 * Retorna o **portfolio mais recente** (updated_at DESC) com:
 *   - name, slug, holdings count
 *   - totalValue = soma (weight × preço atual) via brapi batch
 *   - changeToday = soma (weight × variação% hoje × valor posição)
 *   - change7d / change30d = soma (weight × variação% vs N pregões atrás
 *     × valor posição atual). Usa batch brapi range=1mo e seleciona o
 *     candle de ~7 e ~30 pregões atrás (ajustado por dias úteis).
 *   - holdings: array com symbol/price/changePercent/weight/longName
 *     pra popular a lista top-3 do card "Carteira" na /home.
 *
 * Se o user não tem portfolio, retorna `hasPortfolio: false` (a home
 * renderiza o empty state do PortfolioCard).
 *
 * Cache: preço vem via `lib/brapi-quote-batch.ts` (chunks de 19
 * símbolos, 1 req HTTP por chunk). Holdings ≤ 50, então 3 requests
 * máximo. Wrapper já tem cache 60s, então a home fica rápida.
 *
 * TODO: adicionar seletor de "portfolio ativo" via query param.
 * Por enquanto sempre retorna o mais recente.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";
import { brapiHistorical } from "@/lib/brapi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Holding = {
  symbol: string;
  qty: number;
  avg_price: number;
};

type PortfolioRow = {
  id: number;
  slug: string;
  name: string;
  initial_value: number;
};

type SummaryHolding = {
  symbol: string;
  weight: number;
  price: number | null;
  changePercent: number | null;
  longName: string | null;
};

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ hasPortfolio: false, name: null });
  }

  // Pega o portfolio mais recente do user.
  const portfolios = await query<PortfolioRow>(
    `SELECT id, slug, name, initial_value
     FROM portfolios
     WHERE owner_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [user.userId],
  );

  if (portfolios.length === 0) {
    return NextResponse.json({ hasPortfolio: false, name: null });
  }

  const portfolio = portfolios[0]!;

  // Pega os holdings desse portfolio.
  const holdings = await query<Holding>(
    `SELECT symbol, qty, avg_price FROM portfolio_holdings WHERE portfolio_id = $1`,
    [portfolio.id],
  );

  // Sem holdings: devolve shell sem holdings.
  if (holdings.length === 0) {
    return NextResponse.json({
      hasPortfolio: true,
      name: portfolio.name,
      slug: portfolio.slug,
      initialValue: portfolio.initial_value,
      totalValue: portfolio.initial_value,
      changeToday: 0,
      changeTodayPercent: 0,
      change7d: 0,
      change7dPercent: 0,
      change30d: 0,
      change30dPercent: 0,
      currency: "BRL",
      holdings: [],
    });
  }

  // Busca cotação de todos os símbolos em batch.
  const symbols = holdings.map((h) => h.symbol);
  const quoteMap = await getBrapiQuoteBatch(symbols);

  // ── Calcular valor + variação do dia ──
  // Modelo novo: totalValue = Σ(qty × preço atual). investedValue =
  // Σ(qty × avg_price) pra ter referência pro chart preview.
  let totalValue = 0;
  let changeToday = 0;
  for (const h of holdings) {
    const q = quoteMap.get(h.symbol);
    if (!q?.price) continue;
    const positionValue = h.qty * q.price;
    totalValue += positionValue;
    if (q.change != null) {
      const posChange = (q.change / q.price) * positionValue;
      changeToday += posChange;
    }
  }

  if (totalValue === 0) {
    totalValue = portfolio.initial_value;
  }
  const changeTodayPercent =
    totalValue > 0 ? (changeToday / totalValue) * 100 : 0;

  // ── Calcular variação 7d e 30d ──
  // range=1mo cobre 30 pregões num batch único (mesma request pra todos
  // os holdings). Pega o candle de ~7 pregões atrás e ~30 pregões atrás
  // (contados de trás pra frente na série retornada por brapi).
  const historicalBySymbol = await fetchHistoricalBatch(
    holdings.map((h) => h.symbol),
  );

  let change7d = 0;
  let change30d = 0;
  let valid7d = 0;
  let valid30d = 0;
  for (const h of holdings) {
    const q = quoteMap.get(h.symbol);
    if (!q?.price) continue;
    const candles = historicalBySymbol.get(h.symbol) ?? [];
    const closes = candles.map((c) => c.close);
    // Pega o candle de ~N pregões atrás (fallback se não tiver).
    // 7d: tenta 7 pregões, fallback pra último disponível.
    // 30d: tenta 30 pregões, fallback pra último disponível.
    const ref7 = pickRefClose(closes, 7);
    const ref30 = pickRefClose(closes, 30);
    const positionValue = h.qty * q.price;
    if (ref7 != null) {
      const pct = (q.price - ref7) / ref7;
      change7d += pct * positionValue;
      valid7d++;
    }
    if (ref30 != null) {
      const pct = (q.price - ref30) / ref30;
      change30d += pct * positionValue;
      valid30d++;
    }
  }
  const change7dPercent =
    valid7d > 0 && totalValue > 0 ? (change7d / totalValue) * 100 : 0;
  const change30dPercent =
    valid30d > 0 && totalValue > 0 ? (change30d / totalValue) * 100 : 0;

  // ── Holdings enriquecidos (pra top-3 do card) ──
  const summaryHoldings: SummaryHolding[] = holdings.map((h) => {
    const q = quoteMap.get(h.symbol);
    const invested = h.qty * h.avg_price;
    const current = q?.price != null ? h.qty * q.price : null;
    const weight = totalValue > 0 && current != null ? current / totalValue : 0;
    return {
      symbol: h.symbol,
      weight,
      price: q?.price ?? null,
      changePercent: q?.changePercent ?? null,
      longName: q?.longName ?? null,
    };
  });

  return NextResponse.json({
    hasPortfolio: true,
    name: portfolio.name,
    slug: portfolio.slug,
    initialValue: portfolio.initial_value,
    totalValue,
    changeToday,
    changeTodayPercent,
    change7d,
    change7dPercent,
    change30d,
    change30dPercent,
    currency: "BRL",
    holdings: summaryHoldings,
  });
}

/**
 * Pega o candle de referência de N pregões atrás na série (1d por pregão).
 * Fallback: se a série tem menos candles, retorna o último disponível.
 * Retorna null se a série está vazia.
 */
function pickRefClose(closes: number[], daysAgo: number): number | null {
  if (closes.length === 0) return null;
  // candles vêm da brapi em ordem DESC (mais recente primeiro).
  // index daysAgo = posição contando do final. Se daysAgo >= length,
  // retorna o último (mais antigo) que ainda tem dado utilizável.
  const idx = Math.min(daysAgo, closes.length - 1);
  return closes[closes.length - 1 - idx] ?? null;
}

/**
 * Batch fetch de candles 1d para os símbolos. range=1mo cobre ~30 pregões.
 * Falhas individuais viram Map sem entry; a função não explode.
 */
async function fetchHistoricalBatch(
  symbols: string[],
): Promise<Map<string, Array<{ close: number }>>> {
  const out = new Map<string, Array<{ close: number }>>();
  if (symbols.length === 0) return out;
  const BATCH = 5;
  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        const candles = await brapiHistorical(sym, {
          range: "1mo",
          interval: "1d",
        });
        return { sym, candles };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        out.set(
          r.value.sym,
          r.value.candles.map((c) => ({ close: c.close })),
        );
      }
    }
  }
  return out;
}