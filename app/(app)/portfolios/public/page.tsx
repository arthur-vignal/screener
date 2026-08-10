import { PortfolioList } from "@/components/portfolio-list";

export default function PublicPortfoliosPage() {
  return (
    <PortfolioList
      scope="public"
      title="Public Portfolios"
      description="Portfolios compartilhados pela comunidade. Cada portfolio é um experimento que você pode estudar e clonar."
      emptyMessage="Nenhum portfolio público na biblioteca."
    />
  );
}
