import PortfolioDetailClient from "./page-client";

/**
 * /portfolio/[slug] — server component.
 *
 * Resolve `params` (Next 16 retorna Promise) e delega pro client
 * component. O client não recebe `params` diretamente porque o
 * "use client" boundary exige tipos serializáveis.
 */

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PortfolioDetailPage({ params }: Props) {
  const { slug } = await params;
  return <PortfolioDetailClient slug={slug} />;
}

export const dynamic = "force-dynamic";
