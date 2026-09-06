/**
 * /api/portfolio/summary — resumo agregado dos portfolios do user.
 *
 * Retorna o **portfolio mais recente** (updated_at DESC) com:
 *   - name, slug, holdings count
 *   - totalValue = soma (weight × preço atual) via brapi batch
 *   - changeToday = soma (weight × variação% hoje × valor posição)
 *   - preview: candles intraday do último pregão (5m), normalizado
 *     pelo preço de referência (mesmo critério do
 *     /api/portfolio/[slug]?range=1D — valor patrimonial sobre a
 *     fração do capital alocada a cada holding).
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
import { brapiHistorical, type BrapiCandle } from "@/lib/brapi";

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

type PreviewPoint = { ts: number; value: number };

const HOUR = 3600 * 1000;
const BRT_OFFSET_HOURS = -3;

function isoDateInBRT(timestamp: number): string {
  const d = new Date(timestamp + BRT_OFFSET_HOURS * HOUR);
  return d.toISOString().slice(0, 10);
}

function isIntradayTime(ts: number): boolean {
  const brt = new Date(ts + BRT_OFFSET_HOURS * HOUR);
  const day = brt.getUTCDay();
  if (day === 0 || day === 6) return false;
  const t = brt.getUTCHours() * 60 + brt.getUTCMinutes();
  return t >= 10 * 60 && t <= 17 * 60 + 45;
}

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

  // Sem holdings: devolve shell sem preview nem holdings.
  if (holdings.length === 0) {
    return NextResponse.json({
      hasPortfolio: true,
      name: portfolio.name,
      slug: portfolio.slug,
      initialValue: portfolio.initial_value,
      totalValue: portfolio.initial_value,
      changeToday: 0,
      changeTodayPercent: 0,
      currency: "BRL",
      holdings: [],
      preview: [],
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

  // ── Preview 1 pregão: candles intraday 5m + soma(qty × close) ──
  // Sem normalização: valor patrimonial absoluto por timestamp.
  const preview = await buildPreview(holdings);

  return NextResponse.json({
    hasPortfolio: true,
    name: portfolio.name,
    slug: portfolio.slug,
    initialValue: portfolio.initial_value,
    totalValue,
    changeToday,
    changeTodayPercent,
    currency: "BRL",
    holdings: summaryHoldings,
    preview,
  });
}

/**
 * Constrói a série de preview do último pregão.
 *
 * Retorna array vazio se nenhum holding tem candles intraday
 * disponíveis (ex: fim de semana antes do primeiro pregão útil, ou
 * brapi retornando vazio).
 */
async function buildPreview(
  holdings: Holding[],
): Promise<PreviewPoint[]> {
  // Batches de 5 (limit brapi /historical é menor, então保守).
  const BATCH = 5;
  const candlesBySymbol = new Map<string, BrapiCandle[]>();
  for (let i = 0; i < holdings.length; i += BATCH) {
    const batch = holdings.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (h) => {
        const all = await brapiHistorical(h.symbol, {
          range: "5d",
          interval: "5m",
        });
        const valid = all.filter((c) => isIntradayTime(c.timestamp));
        if (valid.length === 0) return { sym: h.symbol, candles: [] as BrapiCandle[] };
        const lastDay = isoDateInBRT(valid[valid.length - 1]!.timestamp);
        const sameDay = valid
          .filter((c) => isoDateInBRT(c.timestamp) === lastDay)
          .sort((a, b) => a.timestamp - b.timestamp);
        return { sym: h.symbol, candles: sameDay };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") candlesBySymbol.set(r.value.sym, r.value.candles);
    }
  }

  // Filtra holdings que têm candles.
  const usable = holdings.filter(
    (h) => (candlesBySymbol.get(h.symbol)?.length ?? 0) > 1,
  );
  if (usable.length === 0) return [];

  // Intersecção de timestamps: usa o set do primeiro holding que tem
  // candles. Cada ponto = Σ(qty × close(t)) sobre todos os holdings
  // que têm candle naquele timestamp.
  const firstSym = usable[0]!.symbol;
  const tsList = candlesBySymbol.get(firstSym)!.map((c) => c.timestamp);

  // Pré-indexa candles por symbol/timestamp pra lookup O(1).
  const index = new Map<string, Map<number, BrapiCandle>>();
  for (const h of usable) {
    const m = new Map<number, BrapiCandle>();
    for (const c of candlesBySymbol.get(h.symbol)!) m.set(c.timestamp, c);
    index.set(h.symbol, m);
  }

  const out: PreviewPoint[] = [];
  for (const ts of tsList) {
    let value = 0;
    let count = 0;
    for (const h of usable) {
      const c = index.get(h.symbol)?.get(ts);
      if (!c) continue;
      value += h.qty * c.close;
      count += 1;
    }
    // Só inclui ponto onde pelo menos 50% dos holdings têm candle
    // (evita gráfico distorcido quando brapi perdeu tickers no meio).
    if (count >= Math.ceil(usable.length / 2)) {
      out.push({ ts, value });
    }
  }
  return out;
}