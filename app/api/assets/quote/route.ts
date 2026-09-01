/**
 * /api/assets/quote — cotações paginadas por tipo de ativo.
 *
 * Filtra B3_LIST via `classifyB3Ticker` pelo tipo selecionado (stock |
 * fii | etf | bdr), pega a página solicitada (page + pageSize, default
 * page=1 pageSize=50) e retorna rows + `totalPages` + `total`.
 *
 * B3 tem ~1184 tickers — não dá pra puxar tudo de uma vez. Plano Pro do
 * brapi limita a 19 symbols/req, então pra página de 50 são 3 requests
 * paralelas (quote + candles em batch).
 *
 * Cache 60s (quote) + 1h (candles). Servidor-side via `cached()`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBrapiQuoteBatchLight } from "@/lib/brapi-quote-batch";
import { isBrazilianTicker } from "@/lib/brapi";
import { B3_LIST } from "@/lib/b3-list";
import { classifyB3Ticker, type BrAssetType } from "@/lib/b3-classify";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
const TYPE_VALUES = new Set(["stock", "fii", "etf", "bdr"]);

type QuoteBatch = Awaited<ReturnType<typeof getBrapiQuoteBatchLight>>;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const typeParam = (params.get("type") ?? "stock").toLowerCase();
  if (!TYPE_VALUES.has(typeParam)) {
    return NextResponse.json(
      { error: `invalid type: ${typeParam}` },
      { status: 400 },
    );
  }
  const type = typeParam as BrAssetType;

  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const pageSizeRaw = Number(params.get("pageSize") ?? PAGE_SIZE_DEFAULT);
  const pageSize = Math.max(1, Math.min(PAGE_SIZE_MAX, pageSizeRaw));

  // Filtra B3_LIST pelo tipo. Strip ".SA" se vier (B3_LIST é limpo mas
  // alguns callers mandam sufixo).
  const allOfType = B3_LIST.filter((s) => {
    const clean = s.endsWith(".SA") ? s.slice(0, -3) : s;
    return classifyB3Ticker(clean) === type;
  });
  const total = allOfType.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageSymbols = allOfType.slice(start, start + pageSize);

  if (pageSymbols.length === 0) {
    return NextResponse.json({
      rows: [],
      page,
      pageSize,
      total,
      totalPages,
    });
  }

  const quoteMap: QuoteBatch = await getBrapiQuoteBatchLight(pageSymbols);

  try {
    const rows = pageSymbols.map((sym) => {
      const upper = sym.toUpperCase();
      const b = quoteMap.get(upper);
      const isBr = isBrazilianTicker(upper);

      if (!b) {
        return {
          symbol: upper,
          type: "stock" as const,
          sector: IBOV_BY_SYMBOL[upper]?.sector ?? "—",
          quote: null,
          metrics: { marketCap: null },
        };
      }

      const currency = b.currency || (isBr ? "BRL" : "USD");
      const sector = b.sector ?? IBOV_BY_SYMBOL[upper]?.sector ?? "—";

      return {
        symbol: upper,
        type: "stock" as const,
        sector,
        quote: {
          symbol: upper,
          price: b.price ?? 0,
          prevClose: b.prevClose ?? 0,
          change: b.change ?? 0,
          changePercent: b.changePercent ?? 0,
          changePercent7d: b.changePercent7d ?? null,
          changePercent30d: b.changePercent30d ?? null,
          currency,
          dayHigh: b.dayHigh ?? 0,
          dayLow: b.dayLow ?? 0,
          dayOpen: b.dayOpen ?? 0,
          volume: b.volume ?? 0,
          fiftyTwoWeekHigh: b.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: b.fiftyTwoWeekLow ?? 0,
        },
        metrics: {
          marketCap: b.marketCap ?? null,
          pe: null,
          pb: null,
          roe: null,
          roic: null,
          netMargin: null,
          operatingMargin: null,
          eps: null,
          bookValuePerShare: null,
          dividendYield: null,
        },
      };
    });

    return NextResponse.json({
      rows,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}