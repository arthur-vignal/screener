import { PortfolioList } from "@/components/portfolio-list";

export default function SulfurPortfoliosPage() {
  return (
    <PortfolioList
      scope="sulfur"
      title="Sulfur Portfolios"
      description="Portfolios curados pela equipe. Estratégias Damodaran-inspired — Growth Tech, Balanced 60/40, Income & Yield, Deep Value, Small-Cap Quality."
      emptyMessage="Nenhum portfolio curado disponível."
    />
  );
}
