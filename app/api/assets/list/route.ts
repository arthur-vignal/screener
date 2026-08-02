import { NextRequest, NextResponse } from "next/server";
import { SP500, SP500_SECTORS } from "@/lib/snp500";
import { ETFS, CRYPTOS } from "@/lib/universe";

export const dynamic = "force-dynamic";

type AssetType = "stock" | "etf" | "crypto";

type AssetListItem = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // Filters
  const offset = parseInt(sp.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 500);
  const exchange = sp.get("exchange") ?? "all"; // all | sp500 | etf | crypto
  const sector = sp.get("sector") ?? "all"; // GICS sector for stocks
  const search = (sp.get("q") ?? "").toLowerCase().trim();

  // Build unified universe
  let items: AssetListItem[] = [];

  if (exchange === "all" || exchange === "sp500") {
    for (const e of SP500) {
      if (sector !== "all" && e.sector !== sector) continue;
      items.push({
        symbol: e.symbol,
        name: e.name,
        type: "stock",
        sector: e.sector,
      });
    }
  }

  if (exchange === "all" || exchange === "etf") {
    for (const sym of ETFS) {
      items.push({
        symbol: sym,
        name: sym, // ETFs need separate name lookup; use symbol for now
        type: "etf",
        sector: "ETF",
      });
    }
  }

  if (exchange === "all" || exchange === "crypto") {
    for (const sym of CRYPTOS) {
      // Map common crypto to names
      const name = CRYPTO_NAMES[sym] ?? sym;
      items.push({
        symbol: sym,
        name,
        type: "crypto",
        sector: "Cryptocurrency",
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

  // Sort: stocks first (alphabetic), then ETFs, then cryptos
  items.sort((a, b) => {
    if (a.type !== b.type) {
      const order: Record<AssetType, number> = { stock: 0, etf: 1, crypto: 2 };
      return order[a.type] - order[b.type];
    }
    return a.symbol.localeCompare(b.symbol);
  });

  const total = items.length;
  const slice = items.slice(offset, offset + limit);

  return NextResponse.json({
    items: slice,
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
    sectors: SP500_SECTORS,
    exchanges: ["all", "sp500", "etf", "crypto"],
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
