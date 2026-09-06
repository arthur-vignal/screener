/**
 * Server wrapper pra `/portfolio/[slug]/statistics`.
 * Next 16 com rota dinâmica precisa de server component que faz await params
 * e delega pro client com a prop serializável.
 */

import PortfolioStatisticsPage from "./page-client";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PortfolioStatisticsPage slug={slug} />;
}