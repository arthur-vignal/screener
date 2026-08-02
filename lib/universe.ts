/**
 * Asset universe constants — safe to import in client components.
 * For S&P 500 constituents, see lib/snp500.ts.
 */
/**
 * Asset universe constants — safe to import in client components.
 * For server-side Yahoo fetching, see lib/assets.ts.
 */

export const STOCKS: readonly string[] = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  "AVGO", "ORCL", "CRM", "AMD", "INTC", "CSCO", "ADBE", "NFLX",
  "JPM", "BAC", "WFC", "GS", "MS", "BLK", "AXP", "C",
  "UNH", "JNJ", "LLY", "PFE", "ABBV", "TMO", "MRK",
  "WMT", "HD", "PG", "KO", "PEP", "COST", "MCD", "NKE", "DIS", "SBUX",
  "XOM", "CVX", "COP", "SLB",
  "BA", "CAT", "GE", "HON", "RTX",
  "VZ", "T", "TMUS", "CMCSA",
  "NEE", "DUK", "SO",
  "PLD", "AMT", "EQIX",
  "BRK.B", "V", "MA", "PYPL",
  "GME", "AMC", "PLTR", "SOFI", "RIVN", "LCID", "NIO", "XPEV", "BABA",
  "TSM", "ASML", "SAP", "SHOP",
];

export const ETFS: readonly string[] = [
  "SPY", "VOO", "IVV", "VTI", "QQQ", "VEA", "VTV", "IEFA",
  "VWO", "IEMG", "IJR", "VUG", "IWF", "BNDX", "IWM", "VIG",
  "IJH", "VGT", "VXUS", "ITOT", "SCHB", "EFA", "VB", "SCHD",
  "VV", "TLT", "IEF", "SHY", "BND", "AGG", "LQD", "HYG",
  "GLD", "SLV", "IAU", "USO",
];

export const CRYPTOS: readonly string[] = [
  "BTC-USD", "ETH-USD", "USDT-USD", "BNB-USD", "SOL-USD", "XRP-USD",
  "USDC-USD", "ADA-USD", "AVAX-USD", "DOGE-USD", "TRX-USD", "LINK-USD",
  "DOT-USD", "MATIC-USD", "SHIB-USD", "LTC-USD", "BCH-USD", "ETC-USD",
  "NEAR-USD", "ATOM-USD", "UNI-USD", "XLM-USD", "FIL-USD", "APT-USD",
  "ARB-USD", "OP-USD", "AAVE-USD", "GRT-USD", "MKR-USD", "ALGO-USD",
  "FTM-USD", "SAND-USD", "MANA-USD", "AXS-USD", "CRV-USD", "COMP-USD",
  "SNX-USD", "SUSHI-USD", "YFI-USD", "BAL-USD", "REN-USD", "KNC-USD",
  "ZRX-USD", "BAT-USD", "ENJ-USD", "CHZ-USD", "FLOW-USD", "ICP-USD",
  "GRASS-USD", "HONEY-USD", "PEPE-USD", "WIF-USD",
];

// Re-export S&P 500 from dedicated module
export { SP500, SP500_SECTORS, SP500_BY_SECTOR } from "./snp500";
export type { SP500Entry } from "./snp500";
