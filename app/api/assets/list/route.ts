import { NextRequest, NextResponse } from "next/server";
import { SP500, SP500_SECTORS } from "@/lib/snp500";
import { ETFS, CRYPTOS } from "@/lib/universe";
import { IBOV, IBOV_SECTORS } from "@/lib/ibovespa";
import { B3_LIST } from "@/lib/b3-list";
import { isBrazilianTicker } from "@/lib/brapi";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type AssetType = "stock" | "etf" | "crypto";
type Market = "us" | "br" | "global";

type AssetListItem = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
  market: Market; // "us" | "br" — crypto is treated as its own bucket
};

// All GICS sectors from S&P 500 + all B3 sectors from IBOV.
// We present the union so the user can filter by either taxonomy.
const ALL_SECTORS: readonly string[] = Array.from(
  new Set([...SP500_SECTORS, ...IBOV_SECTORS]),
).sort();

type ExchangeKey = "all" | "sp500" | "ibov" | "b3" | "etf" | "crypto";

function normalizeExchange(raw: string): ExchangeKey {
  const r = raw.toLowerCase();
  if (r === "us") return "sp500";
  if (r === "br") return "b3"; // /market/br uses 'br' -> full B3 list
  if (r === "ibov") return "ibov";
  if (r === "b3") return "b3";
  if (r === "global" || r === "all") return "all";
  if (r === "sp500" || r === "ibov" || r === "etf" || r === "crypto") return r;
  return "all";
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // Filters
  const offset = parseInt(sp.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 500);
  const exchangeRaw = sp.get("exchange") ?? "all";
  const exchange = normalizeExchange(exchangeRaw);
  const sector = sp.get("sector") ?? "all";
  const search = (sp.get("q") ?? "").toLowerCase().trim();

  // Build the symbol list for the requested exchange first, with rich data
  // baked in (name + sector) from the static universe. B3-only entries are
  // placeholders — they'll be enriched from Brapi in a second pass.
  let items: AssetListItem[] = [];

  // US stocks (S&P 500)
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

  // Brazil stocks (IBOV — carteira teorica vigente)
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

  // Brazil stocks (full B3 list — broader than IBOV). IBOV entries above
  // already have rich data; B3-only entries get placeholder name/sector here
  // and are enriched from Brapi below.
  if (exchange === "b3") {
    for (const sym of B3_LIST) {
      const ibovEntry = IBOV.find((e) => e.symbol === sym);
      if (ibovEntry) {
        // IBOV entries have a known sector; honor the sector filter here.
        if (sector !== "all" && ibovEntry.sector !== sector) continue;
        items.push({
          symbol: ibovEntry.symbol,
          name: ibovEntry.name,
          type: "stock",
          sector: ibovEntry.sector,
          market: "br",
        });
      } else {
        // B3-only entries get a real sector via Brapi below. The filter is
        // applied AFTER enrichment so the sector param can be honored.
        items.push({
          symbol: sym,
          name: sym, // enriched from Brapi below
          type: "stock",
          sector: "—", // enriched from Brapi below
          market: "br",
        });
      }
    }
  }

  if (exchange === "all" || exchange === "etf") {
    for (const sym of ETFS) {
      items.push({
        symbol: sym,
        name: sym, // ETFs need separate name lookup; use symbol for now
        type: "etf",
        sector: "ETF",
        market: "us",
      });
    }
  }

  if (exchange === "all" || exchange === "crypto") {
    for (const sym of CRYPTOS) {
      const name = CRYPTO_NAMES[sym] ?? sym;
      items.push({
        symbol: sym,
        name,
        type: "crypto",
        sector: "Cryptocurrency",
        market: "global",
      });
    }
  }

  // Apply text search
  if (search) {
    items = items.filter(
      (it) =>
        it.symbol.toLowerCase().includes(search) ||
        it.name.toLowerCase().includes(search),
    );
  }

  // Sort: stocks first (alphabetic), then ETFs, then cryptos.
  // Within stocks: US first (alphabetic), then BR (alphabetic).
  items.sort((a, b) => {
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

  // Enrichment pass: for the current page of B3 items, hit Brapi once to
  // fill in name + sector. Only the page slice is enriched (max 30) to keep
  // this fast; pagination re-triggers the fetch as the user pages.
  const total = items.length;
  const slice = items.slice(offset, offset + limit);
  if (slice.length > 0) {
    const pageBrSymbols = slice
      .filter((it) => it.type === "stock" && isBrazilianTicker(it.symbol))
      .map((it) => it.symbol);
    if (pageBrSymbols.length > 0) {
      try {
        const brapiMap = await getBrapiQuoteBatch(pageBrSymbols);
        for (const it of slice) {
          const b = brapiMap.get(it.symbol.toUpperCase());
          if (!b) continue;
          if (it.name === it.symbol && b.longName) {
            it.name = b.longName;
          }
          if ((it.sector === "—" || !it.sector) && b.sector) {
            it.sector = b.sector;
          }
        }
      } catch (err) {
        console.error("[/api/assets/list] brapi enrichment failed:", err);
      }
    }
  }

  return NextResponse.json({
    items: slice,
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
    sectors: ALL_SECTORS,
    exchanges: ["all", "sp500", "ibov", "b3", "etf", "crypto"],
  });
}

const CRYPTO_NAMES: Record<string, string> = {
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "USDT-USD": "Tether",
  "BNB-USD": "Binance Coin",
  "SOL-USD": "Solana",
  "XRP-USD": "XRP",
  "USDC-USD": "USD Coin",
  "ADA-USD": "Cardano",
  "AVAX-USD": "Avalanche",
  "DOGE-USD": "Dogecoin",
  "TRX-USD": "TRON",
  "LINK-USD": "Chainlink",
  "DOT-USD": "Polkadot",
  "MATIC-USD": "Polygon",
  "SHIB-USD": "Shiba Inu",
  "LTC-USD": "Litecoin",
  "BCH-USD": "Bitcoin Cash",
  "ETC-USD": "Ethereum Classic",
  "NEAR-USD": "NEAR Protocol",
  "ATOM-USD": "Cosmos",
  "UNI-USD": "Uniswap",
  "XLM-USD": "Stellar",
  "FIL-USD": "Filecoin",
  "APT-USD": "Aptos",
  "ARB-USD": "Arbitrum",
  "OP-USD": "Optimism",
  "AAVE-USD": "Aave",
  "GRT-USD": "The Graph",
  "MKR-USD": "Maker",
  "ALGO-USD": "Algorand",
  "FTM-USD": "Fantom",
  "SAND-USD": "The Sandbox",
  "MANA-USD": "Decentraland",
  "AXS-USD": "Axie Infinity",
  "CRV-USD": "Curve DAO",
  "COMP-USD": "Compound",
  "SNX-USD": "Synthetix",
  "SUSHI-USD": "SushiSwap",
  "YFI-USD": "Yearn.finance",
  "BAL-USD": "Balancer",
  "REN-USD": "Ren",
  "KNC-USD": "Kyber Network",
  "ZRX-USD": "0x",
  "BAT-USD": "Basic Attention Token",
  "ENJ-USD": "Enjin Coin",
  "CHZ-USD": "Chiliz",
  "FLOW-USD": "Flow",
  "ICP-USD": "Internet Computer",
  "GRASS-USD": "Grass",
  "HONEY-USD": "Honey",
  "PEPE-USD": "Pepe",
  "WIF-USD": "dogwifhat",
};
