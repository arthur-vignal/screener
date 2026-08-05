import { AssetListPage } from "@/components/asset-list-page";
import { Building2 } from "lucide-react";

export default function StocksPage() {
  return (
    <AssetListPage
      endpoint="sp500"
      title="Stocks"
      description="Ações do S&P 500 com preços em tempo real, variação de 24h e volume. Filtre, ordene e abra cada ativo para análise fundamentalista completa."
      icon="building"
      accent="mint"
    />
  );
}
