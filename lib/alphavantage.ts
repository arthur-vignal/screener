/**
 * Alpha Vantage ETF profiles client.
 * Free tier: 25 req/day. We use the SYMBOL_SEARCH endpoint once to get
 * a list of popular ETFs (returned as a "best matches" list), then
 * fetch OVERVIEW for each to get yield/expense/AUM.
 *
 * Cache aggressively (24h) since this is expensive.
 */

import { cached } from "./cache";

const BASE = "https://www.alphavantage.co/query";

function getKey(): string {
  const k = process.env.ALPHAVANTAGE_API_KEY;
  if (!k) throw new Error("ALPHAVANTAGE_API_KEY not configured");
  return k;
}

export type ETFProfile = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  country: string;
  sector: string;
  industry: string;
  marketCap: number;
  ebitda: number;
  peRatio: number;
  pegRatio: number;
  bookValue: number;
  dividendPerShare: number;
  dividendYield: number;
  eps: number;
  revenuePerShareTTM: number;
  profitMargin: number;
  operatingMarginTTM: number;
  returnOnAssetsTTM: number;
  returnOnEquityTTM: number;
  revenueTTM: number;
  grossProfitTTM: number;
  dilutedEpsTTM: number;
  quarterlyEarningsGrowthYOY: number;
  quarterlyRevenueGrowthYOY: number;
  analystTargetPrice: number;
  trailingPE: number;
  forwardPE: number;
  priceToSalesRatioTTM: number;
  priceToBookRatio: number;
  evToRevenue: number;
  evToEbitda: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayMovingAverage: number;
  twoHundredDayMovingAverage: number;
  sharesOutstanding: number;
};

// Curated list of top ETFs by AUM. Avoids the 25/day limit
// by not querying the symbol search endpoint.
const TOP_ETFS = [
  "SPY", "VOO", "IVV", "VTI", "QQQ", "VEA", "VTV", "IEFA",
  "AGG", "VWO", "IEMG", "IJR", "BND", "VUG", "IWF", "BNDX",
  "IWM", "VIG", "IJH", "VGT", "VXUS", "ITOT", "SCHB", "EFA",
  "VB", "SCHD", "BND", "VEA", "IWD", "VV", "TLT", "BIV",
  "GLD", "VO", "IVE", "QUAL", "DIA", "VYM", "MGV", "SCHF",
  "MBB", "LQD", "HYG", "EMB", "TIP", "IEI", "SHY", "BSV",
];

export async function getETFList(limit = 50): Promise<ETFProfile[]> {
  return cached(`etf:list:${limit}`, 24 * 3600, async () => {
    const symbols = TOP_ETFS.slice(0, limit);
    // Fetch in series with a small delay to avoid rate limit.
    const out: ETFProfile[] = [];
    for (const sym of symbols) {
      try {
        const r = await fetch(
          `${BASE}?function=OVERVIEW&symbol=${sym}&apikey=${getKey()}`,
        );
        if (!r.ok) continue;
        const data = (await r.json()) as Record<string, string>;
        if (!data.Symbol || data.Symbol !== sym) continue;
        out.push(parseOverview(data));
      } catch {
        continue;
      }
      // Throttle to stay under 25 req/min free tier
      await new Promise((res) => setTimeout(res, 200));
    }
    return out;
  });
}

function parseOverview(d: Record<string, string>): ETFProfile {
  return {
    symbol: d.Symbol ?? "",
    name: d.Name ?? "",
    exchange: d.Exchange ?? "",
    currency: d.Currency ?? "USD",
    country: d.Country ?? "",
    sector: d.Sector ?? "ETF",
    industry: d.Industry ?? "ETF",
    marketCap: Number(d.MarketCapitalization) || 0,
    ebitda: Number(d.EBITDA) || 0,
    peRatio: Number(d.PERatio) || 0,
    pegRatio: Number(d.PEGRatio) || 0,
    bookValue: Number(d.BookValue) || 0,
    dividendPerShare: Number(d.DividendPerShare) || 0,
    dividendYield: Number(d.DividendYield) || 0,
    eps: Number(d.EPS) || 0,
    revenuePerShareTTM: Number(d.RevenuePerShareTTM) || 0,
    profitMargin: Number(d.ProfitMargin) || 0,
    operatingMarginTTM: Number(d.OperatingMarginTTM) || 0,
    returnOnAssetsTTM: Number(d.ReturnOnAssetsTTM) || 0,
    returnOnEquityTTM: Number(d.ReturnOnEquityTTM) || 0,
    revenueTTM: Number(d.RevenueTTM) || 0,
    grossProfitTTM: Number(d.GrossProfitTTM) || 0,
    dilutedEpsTTM: Number(d.DilutedEPSTTM) || 0,
    quarterlyEarningsGrowthYOY: Number(d.QuarterlyEarningsGrowthYOY) || 0,
    quarterlyRevenueGrowthYOY: Number(d.QuarterlyRevenueGrowthYOY) || 0,
    analystTargetPrice: Number(d.AnalystTargetPrice) || 0,
    trailingPE: Number(d.TrailingPE) || 0,
    forwardPE: Number(d.ForwardPE) || 0,
    priceToSalesRatioTTM: Number(d.PriceToSalesRatioTTM) || 0,
    priceToBookRatio: Number(d.PriceToBookRatio) || 0,
    evToRevenue: Number(d.EVToRevenue) || 0,
    evToEbitda: Number(d.EVToEBITDA) || 0,
    beta: Number(d.Beta) || 0,
    fiftyTwoWeekHigh: Number(d["52WeekHigh"]) || 0,
    fiftyTwoWeekLow: Number(d["52WeekLow"]) || 0,
    fiftyDayMovingAverage: Number(d["50DayMovingAverage"]) || 0,
    twoHundredDayMovingAverage: Number(d["200DayMovingAverage"]) || 0,
    sharesOutstanding: Number(d.SharesOutstanding) || 0,
  };
}
