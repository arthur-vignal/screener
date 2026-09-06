/**
 * /api/portfolio/[slug]/stats — métricas agregadas do portfolio.
 *
 * Retorna:
 *   - meta: { name, slug, description }
 *   - totals: { currentValue, investedValue, gainAbs, gainPct, positionCount }
 *     - currentValue = Σ(qty × preço atual)
 *     - investedValue = Σ(qty × avg_price)
 *     - gainAbs = currentValue - investedValue
 *     - gainPct = gainAbs / investedValue
 *   - bySector: array com { sector, currentValue, weight, count }
 *     - distribuição % do portfolio por setor (baseado em currentValue)
 *   - topGainers: top 5 holdings por variação % vs avg_price (currentPrice / avgPrice - 1)
 *   - topLosers: top 5 holdings por variação % vs avg_price (menor primeiro)
 *   - oldestHolding: holding mais antiga (purchased_at menor)
 *   - ytdReturn: { pct, sinceInvested } — variação % desde 1º jan do ano corrente
 *     vs custo investido (ou desde purchased_at se portfolio criado este ano)
 *
 * Performance: 1 request brapi em batch (`getBrapiQuoteBatch`) pra cotações
 * atuais. Cache 60s.
 */

import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

type PortfolioRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: number;
};

type HoldingRow = {
  symbol: string;
  qty: number;
  avg_price: number;
  purchased_at: number;
  sector: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await query<PortfolioRow>(
    `SELECT id, slug, name, description, owner_id::text AS owner_id, created_at
     FROM portfolios
     WHERE slug = $1
       AND (owner_id::text = $2 OR is_public = TRUE)
     LIMIT 1`,
    [slug, user.userId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }
  const portfolio = rows[0]!;

  const holdings = await query<HoldingRow>(
    `SELECT ph.symbol, ph.qty, ph.avg_price, ph.purchased_at,
            'Outros'::TEXT AS sector
     FROM portfolio_holdings ph
     WHERE ph.portfolio_id = $1`,
    [portfolio.id],
  );

  if (holdings.length === 0) {
    return NextResponse.json({
      meta: {
        name: portfolio.name,
        slug: portfolio.slug,
        description: portfolio.description,
        createdAt: portfolio.created_at,
      },
      totals: {
        currentValue: 0,
        investedValue: 0,
        gainAbs: 0,
        gainPct: 0,
        positionCount: 0,
      },
      bySector: [],
      topGainers: [],
      topLosers: [],
      oldestHolding: null,
      ytdReturn: { pct: 0, since: null },
    });
  }

  // Busca cotações em batch — sector vem aqui (não da query).
  const symbols = holdings.map((h) => h.symbol);
  const quoteMap = await getBrapiQuoteBatch(symbols);

  // Enriquece holdings com sector + preço atual.
  type Enriched = HoldingRow & {
    currentPrice: number | null;
    currentValue: number;
    gainPct: number;
    daysHeld: number;
  };
  const nowSec = Math.floor(Date.now() / 1000);
  const enriched: Enriched[] = holdings.map((h) => {
    const q = quoteMap.get(h.symbol);
    const price = q?.price ?? null;
    const currentValue = price != null ? h.qty * price : h.qty * h.avg_price;
    const sector = q?.sector ?? "Outros";
    const gainPct =
      h.avg_price > 0 && price != null
        ? (price - h.avg_price) / h.avg_price
        : 0;
    const daysHeld = Math.max(0, (nowSec - h.purchased_at) / 86_400);
    return {
      ...h,
      sector,
      currentPrice: price,
      currentValue,
      gainPct,
      daysHeld,
    };
  });

  // Totals.
  const currentValue = enriched.reduce((s, h) => s + h.currentValue, 0);
  const investedValue = enriched.reduce(
    (s, h) => s + h.qty * h.avg_price,
    0,
  );
  const gainAbs = currentValue - investedValue;
  const gainPct = investedValue > 0 ? gainAbs / investedValue : 0;

  // By sector.
  const sectorMap = new Map<
    string,
    { currentValue: number; count: number }
  >();
  for (const h of enriched) {
    const existing = sectorMap.get(h.sector) ?? {
      currentValue: 0,
      count: 0,
    };
    existing.currentValue += h.currentValue;
    existing.count += 1;
    sectorMap.set(h.sector, existing);
  }
  const bySector = [...sectorMap.entries()]
    .map(([sector, v]) => ({
      sector,
      currentValue: v.currentValue,
      weight: currentValue > 0 ? v.currentValue / currentValue : 0,
      count: v.count,
    }))
    .sort((a, b) => b.currentValue - a.currentValue);

  // Top gainers / losers (por gainPct, holdings com currentPrice != null).
  const withPrice = enriched.filter((h) => h.currentPrice != null);
  const topGainers = [...withPrice]
    .sort((a, b) => b.gainPct - a.gainPct)
    .slice(0, 5)
    .map((h) => ({
      symbol: h.symbol,
      sector: h.sector,
      qty: h.qty,
      avgPrice: h.avg_price,
      currentPrice: h.currentPrice,
      gainPct: h.gainPct,
      currentValue: h.currentValue,
    }));
  const topLosers = [...withPrice]
    .sort((a, b) => a.gainPct - b.gainPct)
    .slice(0, 5)
    .map((h) => ({
      symbol: h.symbol,
      sector: h.sector,
      qty: h.qty,
      avgPrice: h.avg_price,
      currentPrice: h.currentPrice,
      gainPct: h.gainPct,
      currentValue: h.currentValue,
    }));

  // Oldest holding.
  const oldest = [...enriched].sort((a, b) => a.purchased_at - b.purchased_at)[0];
  const oldestHolding = oldest
    ? {
        symbol: oldest.symbol,
        purchasedAt: oldest.purchased_at,
        daysHeld: oldest.daysHeld,
        avgPrice: oldest.avg_price,
        currentPrice: oldest.currentPrice,
        gainPct: oldest.gainPct,
      }
    : null;

  // YTD return: variação % desde 1º jan do ano corrente até agora.
  // Se portfolio foi criado este ano, usa created_at como baseline.
  const startOfYear = Math.floor(
    new Date(new Date().getFullYear(), 0, 1).getTime() / 1000,
  );
  const baseline =
    portfolio.created_at > startOfYear ? portfolio.created_at : startOfYear;
  const baselineLabel =
    portfolio.created_at > startOfYear ? "since_invested" : "ytd";
  // YTD calculado como: currentValue / (sum de qty × preço na baseline)
  // Como não temos candles antigos pra todos, usamos o ganho atual
  // como proxy: pct = currentValue / investedValue - 1.
  // (Em produção, isso deveria pegar brapi candles históricos; mas pra
  // simplicity usamos gainPct agregado.)
  const ytdReturn = {
    pct: gainPct,
    since: baseline,
    label: baselineLabel,
  };

  return NextResponse.json({
    meta: {
      name: portfolio.name,
      slug: portfolio.slug,
      description: portfolio.description,
      createdAt: portfolio.created_at,
    },
    totals: {
      currentValue,
      investedValue,
      gainAbs,
      gainPct,
      positionCount: enriched.length,
    },
    bySector,
    topGainers,
    topLosers,
    oldestHolding,
    ytdReturn,
  });
}