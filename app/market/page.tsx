"use client";

import { PageHeader } from "@/components/page-header";
import { MarketSection } from "@/components/market-section";
import { Bitcoin, Building2, BarChart3 } from "lucide-react";

export default function MarketPage() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-7xl">
      <PageHeader
        title="Market"
        description="Visão geral do mercado. Stocks, Crypto e ETFs numa só página. Use os submenus do nav para ir direto a uma categoria."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <MarketSection
          endpoint="sp500"
          title="Stocks"
          icon={Building2}
          accent="mint"
          viewAllHref="/market/stocks"
          limit={6}
        />
        <MarketSection
          endpoint="crypto"
          title="Crypto"
          icon={Bitcoin}
          accent="purple"
          viewAllHref="/crypto"
          limit={6}
        />
        <MarketSection
          endpoint="etf"
          title="ETFs"
          icon={BarChart3}
          accent="cyan"
          viewAllHref="/market/etfs"
          limit={6}
        />
      </div>
    </div>
  );
}
