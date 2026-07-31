/**
 * CoinPaprika API client (https://api.coinpaprika.com).
 * No auth required for free tier. Returns top coins with market data.
 * Limit: we throttle to avoid rate limit issues.
 */

import { cached } from "./cache";

const BASE = "https://api.coinpaprika.com/v1";

export type CoinTicker = {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  price_usd: number;
  percent_change_24h: number;
  percent_change_7d: number;
  market_cap_usd: number;
  volume24: number;
  circulating_supply: number;
};

export async function getTopCryptos(limit = 50): Promise<CoinTicker[]> {
  return cached(`crypto:top:${limit}`, 300, async () => {
    const r = await fetch(`${BASE}/tickers?limit=${limit}`);
    if (!r.ok) throw new Error(`coinpaprika ${r.status}`);
    const data = (await r.json()) as Array<{
      id: string;
      name: string;
      symbol: string;
      rank: number;
      quotes: {
        USD: {
          price: number;
          percent_change_24h: number;
          percent_change_7d: number;
          market_cap: number;
          volume_24h: number;
        };
      };
      circulating_supply: number;
    }>;
    return data.map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      rank: c.rank,
      price_usd: c.quotes.USD.price,
      percent_change_24h: c.quotes.USD.percent_change_24h,
      percent_change_7d: c.quotes.USD.percent_change_7d,
      market_cap_usd: c.quotes.USD.market_cap,
      volume24: c.quotes.USD.volume_24h,
      circulating_supply: c.circulating_supply,
    }));
  });
}
