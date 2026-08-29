import { AnalysisPageClient } from "./analysis-page-client";

/**
 * /asset/[symbol]/analysis — drilldown com 8 gráficos analíticos.
 *
 * Server component: resolve params e delega pro client.
 */

type Props = {
  params: Promise<{ symbol: string }>;
};

export default async function AnalysisPage({ params }: Props) {
  const { symbol } = await params;
  return <AnalysisPageClient symbol={symbol.toUpperCase()} />;
}

export const dynamic = "force-dynamic";
