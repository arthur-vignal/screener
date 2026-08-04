/**
 * CoinMarketCap API client.
 * Free tier: 333 calls/day, 10k/month.
 * Docs: https://coinmarketcap.com/api/documentation/v1/
 *
 * Endpoints used:
 * - /v1/cryptocurrency/listings/latest — top N by market cap
 * - /v1/global-metrics/quotes/latest — total market cap, BTC dominance, etc.
 *
 * All requests are cached (5 min) to stay within quota.
 */

const BASE = "https://pro-api.coinmarketcap.com";

type CmcError = {
  status: { error_code: number; error_message: string };
};

async function fetchCmc<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const key = process.env.CMC_API_KEY;
  if (!key) {
    throw new Error("CMC_API_KEY not set");
  }
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-CMC_PRO_API_KEY": key,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null) as CmcError | null;
    throw new Error(
      `CMC ${res.status}: ${err?.status?.error_message ?? res.statusText}`,
    );
  }

  return (await res.json()) as T;
}

// Cache simples — 5 min. Free tier é limitado.
const cache = new Map<string, { expires: number; data: unknown }>();

async function withCache<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.data as T;
  const data = await fetcher();
  cache.set(key, { expires: now + ttl, data });
  return data;
}

// ---------- Types ----------

export type CmcQuote = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  num_market_pairs: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  infinite_supply: boolean;
  last_updated: string;
  date_added: string;
  tags: string[];
  platform: { id: number; name: string; symbol: string; slug: string } | null;
  self_reported_circulating_supply: number | null;
  self_reported_market_cap: number | null;
  quote: Record<string, {
    price: number;
    volume_24h: number;
    volume_change_24h: number;
    percent_change_1h: number;
    percent_change_24h: number;
    percent_change_7d: number;
    percent_change_30d: number;
    percent_change_60d: number;
    percent_change_90d: number;
    market_cap: number;
    market_cap_dominance: number;
    fully_diluted_market_cap: number;
    tvl: number | null;
    last_updated: string;
  }>;
};

export type CmcGlobal = {
  active_cryptocurrencies: number;
  total_cryptocurrencies: number;
  active_market_pairs: number;
  active_exchanges: number;
  total_exchanges: number;
  eth_dominance: number;
  btc_dominance: number;
  eth_dominance_yesterday: number;
  btc_dominance_yesterday: number;
  eth_dominance_24h_percentage_change: number;
  btc_dominance_24h_percentage_change: number;
  defi_volume_24h: number;
  defi_volume_24h_reported: number;
  defi_market_cap: number;
  defi_24h_percentage_change: number;
  stablecoin_volume_24h: number;
  stablecoin_volume_24h_reported: number;
  stablecoin_market_cap: number;
  stablecoin_24h_percentage_change: number;
  derivatives_volume_24h: number;
  derivatives_volume_24h_reported: number;
  derivatives_24h_percentage_change: number;
  total_market_cap: number;
  total_volume_24h: number;
  total_volume_24h_reported: number;
  total_volume_24h_yesterday: number;
  total_market_cap_yesterday: number;
  total_market_cap_yesterday_percentage_change: number;
  total_volume_24h_yesterday_percentage_change: number;
  altcoin_volume_24h: number;
  altcoin_volume_24h_reported: number;
  altcoin_market_cap: number;
  altcoin_24h_percentage_change: number;
  last_updated: string;
};

export type CmcGlobalResponse = {
  // The CMC API returns a hybrid structure: some fields at top level,
  // others inside quote.USD. We flatten them here.
  data: CmcGlobal;
};


// ---------- Public API ----------

export async function getTopCryptos(
  limit = 20,
  convert = "USD",
): Promise<CmcQuote[]> {
  return withCache(
    `cmc:listings:${limit}:${convert}`,
    5 * 60 * 1000,
    async () => {
      const data = await fetchCmc<{ data: CmcQuote[] }>(
        "/v1/cryptocurrency/listings/latest",
        { limit, convert, aux: "num_market_pairs,cmc_rank" },
      );
      return data.data;
    },
  );
}

export async function getGlobalMetrics(convert = "USD"): Promise<CmcGlobal | null> {
  return withCache(
    `cmc:global:${convert}`,
    5 * 60 * 1000,
    async () => {
      const data = await fetchCmc<CmcGlobalResponse>(
        "/v1/global-metrics/quotes/latest",
        { convert },
      );
      const flat = data.data as unknown as Record<string, unknown> | null;
      if (!flat) return null;
      const usd = (flat.quote as Record<string, Record<string, number>> | undefined)?.USD;
      if (!usd) return null;
      // Merge top-level meta with USD quote fields into a flat object
      return {
        ...flat,
        ...usd,
      } as CmcGlobal;
    },
  );
}

export function isCmcConfigured(): boolean {
  return !!process.env.CMC_API_KEY;
}
