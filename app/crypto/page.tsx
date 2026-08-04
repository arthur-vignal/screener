import { CryptoMarket } from "@/components/crypto-market";
import { PageHeader } from "@/components/page-header";
import { Bitcoin } from "lucide-react";

export const dynamic = "force-dynamic";

export default function CryptoMarketPage() {
  return (
    <div className="px-6 md:px-10 py-10 md:py-14 max-w-7xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Bitcoin className="w-8 h-8 text-brand-deep" />
            Crypto market
          </span>
        }
        description="Top 20 cryptos por market cap, com dados em tempo real via CoinMarketCap. Métricas globais: dominância BTC/ETH, DeFi, stablecoins."
      />
      <CryptoMarket />
    </div>
  );
}
