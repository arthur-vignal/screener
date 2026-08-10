import { PortfolioList } from "@/components/portfolio-list";

export default function MyPortfoliosPage() {
  return (
    <PortfolioList
      scope="mine"
      title="My Portfolios"
      description="Seus portfolios. São privados — só você vê. Crie novos a partir de qualquer asset de /market."
      emptyMessage="Você ainda não criou portfolios."
    />
  );
}
