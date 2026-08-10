import { NextRequest, NextResponse } from "next/server";
import { SP500, SP500_SECTORS } from "@/lib/snp500";
import { IBOV, IBOV_SECTORS } from "@/lib/ibovespa";
import { B3_LIST } from "@/lib/b3-list";
import { isBrazilianTicker } from "@/lib/brapi";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";
import { classifyB3Ticker } from "@/lib/b3-classify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type AssetType = "stock" | "etf" | "crypto";
type Market = "us" | "br" | "global";

type AssetListItem = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
  market: Market;
};

const ALL_SECTORS: readonly string[] = Array.from(
  new Set([...SP500_SECTORS, ...IBOV_SECTORS]),
).sort();

type ExchangeKey = "all" | "sp500" | "ibov" | "b3" | "etf" | "crypto";

function normalizeExchange(raw: string): ExchangeKey {
  const r = raw.toLowerCase();
  if (r === "us") return "sp500";
  if (r === "br") return "b3";
  if (r === "ibov") return "ibov";
  if (r === "b3") return "b3";
  if (r === "global" || r === "all") return "all";
  if (r === "sp500" || r === "ibov" || r === "etf" || r === "crypto") return r;
  return "all";
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const offset = parseInt(sp.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 500);
  const exchangeRaw = sp.get("exchange") ?? "all";
  const exchange = normalizeExchange(exchangeRaw);
  const sector = sp.get("sector") ?? "all";
  const search = (sp.get("q") ?? "").toLowerCase().trim();

  // ?type filter for B3 (?type=stock|fii|etf|bdr|fractional|all).
  // Default for the dashboard market table is 'stock' only.
  const typeFilter = sp.get("type") ?? "stock";

  let items: AssetListItem[] = [];

  if (exchange === "all" || exchange === "sp500") {
    for (const e of SP500) {
      if (sector !== "all" && e.sector !== sector) continue;
      items.push({
        symbol: e.symbol,
        name: e.name,
        type: "stock",
        sector: e.sector,
        market: "us",
      });
    }
  }

  if (exchange === "all" || exchange === "ibov") {
    for (const e of IBOV) {
      if (sector !== "all" && e.sector !== sector) continue;
      items.push({
        symbol: e.symbol,
        name: e.name,
        type: "stock",
        sector: e.sector,
        market: "br",
      });
    }
  }

  if (exchange === "b3") {
    for (const sym of B3_LIST) {
      const ibovEntry = IBOV.find((e) => e.symbol === sym);
      const t: "stock" | "fii" | "etf" | "bdr" | "fractional" = ibovEntry
        ? "stock"
        : classifyB3Ticker(sym);
      if (typeFilter !== "all" && t !== typeFilter) continue;

      if (ibovEntry) {
        if (sector !== "all" && ibovEntry.sector !== sector) continue;
        items.push({
          symbol: ibovEntry.symbol,
          name: ibovEntry.name,
          type: "stock",
          sector: ibovEntry.sector,
          market: "br",
        });
      } else {
        items.push({
          symbol: sym,
          name: sym,
          type: t === "etf" ? "etf" : "stock",
          sector: "—",
          market: "br",
        });
      }
    }
  }

  if (exchange === "all" || exchange === "etf") {
    // ETFs are out of scope (we dropped them from the universe). Skip.
  }

  if (exchange === "all" || exchange === "crypto") {
    // Crypto is out of scope. Skip.
  }

  if (search) {
    items = items.filter(
      (it) =>
        it.symbol.toLowerCase().includes(search) ||
        it.name.toLowerCase().includes(search),
    );
  }

  items.sort((a, b) => {
    if (sector !== "all") {
      const aMatch = a.sector === sector ? 0 : 1;
      const bMatch = b.sector === sector ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    if (a.type !== b.type) {
      const order: Record<AssetType, number> = { stock: 0, etf: 1, crypto: 2 };
      return order[a.type] - order[b.type];
    }
    if (a.type === "stock" && b.type === "stock" && a.market !== b.market) {
      const marketOrder: Record<Market, number> = { us: 0, br: 1, global: 2 };
      return marketOrder[a.market] - marketOrder[b.market];
    }
    return a.symbol.localeCompare(b.symbol);
  });

  const total = items.length;
  const slice = items.slice(offset, offset + limit);

  // Single source of truth: Brapi for all tickers (covers US + BR).
  if (slice.length > 0) {
    const pageSymbols = slice
      .filter((it) => it.type === "stock" || it.type === "etf")
      .map((it) => it.symbol);
    if (pageSymbols.length > 0) {
      try {
        const quoteMap = await getBrapiQuoteBatch(pageSymbols);
        for (const it of slice) {
          const b = quoteMap.get(it.symbol.toUpperCase());
          if (!b) continue;
          if (it.name === it.symbol && b.longName) {
            it.name = b.longName;
          }
          if ((it.sector === "—" || !it.sector) && b.sector) {
            it.sector = b.sector;
          }
        }
      } catch (err) {
        console.error("[/api/assets/list] enrichment failed:", err);
      }
    }
  }

  const filteredSlice =
    sector === "all" ? slice : slice.filter((it) => it.sector !== "—" && it.sector === sector);

  return NextResponse.json({
    items: filteredSlice,
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
    sectors: ALL_SECTORS,
    exchanges: ["all", "sp500", "ibov", "b3"],
  });
}
