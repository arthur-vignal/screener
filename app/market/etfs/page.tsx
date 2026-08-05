import { AssetListPage } from "@/components/asset-list-page";
import { BarChart3 } from "lucide-react";

export default function ETFsPage() {
  return (
    <AssetListPage
      endpoint="etf"
      title="ETFs"
      description="ETFs listados com preços ao vivo, variação de 24h e volume. Setoriais, geográficos, temáticos — todos aqui."
      icon="chart"
      accent="cyan"
    />
  );
}
