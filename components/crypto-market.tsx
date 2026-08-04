import { getTopCryptos, getGlobalMetrics, isCmcConfigured } from "@/lib/cmc";
import { CryptoMarketLive } from "@/components/crypto-market-live";

/**
 * Server-rendered wrapper for crypto market data.
 * Falls back to a setup banner if CMC API key is missing.
 */
export async function CryptoMarket() {
  if (!isCmcConfigured()) {
    return (
      <div className="panel p-6 text-sm text-muted">
        CoinMarketCap API key não configurada. Adicione
        <code className="mx-1 px-1.5 py-0.5 bg-surface-elevated">CMC_API_KEY</code>
        ao ambiente para ver dados crypto.
      </div>
    );
  }

  let quotes: Awaited<ReturnType<typeof getTopCryptos>> = [];
  let global: Awaited<ReturnType<typeof getGlobalMetrics>> = null;
  let error: string | null = null;

  try {
    const [q, g] = await Promise.all([getTopCryptos(20), getGlobalMetrics()]);
    quotes = q;
    global = g;
  } catch (e) {
    error = String(e);
  }

  if (error) {
    return (
      <div className="panel p-6 text-sm text-negative">
        Erro ao carregar dados CoinMarketCap: {error}
      </div>
    );
  }

  return <CryptoMarketLive initialQuotes={quotes} initialGlobal={global} />;
}
