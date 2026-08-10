import { PortfolioList } from "@/components/portfolio-list";

export default function PortfoliosPage() {
  return (
    <PortfolioList
      scope="all"
      title="Portfolios"
      description="Visão geral de portfolios. Use os submenus do nav para filtrar por categoria: Sulfur (curados), My Portfolios (seus), Public (de outros usuários)."
      emptyMessage="Nenhum portfolio encontrado. Comece criando um."
    />
  );
}
