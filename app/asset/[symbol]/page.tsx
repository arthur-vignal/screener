import AssetPageClient from "./asset-page-client";

/**
 * /asset/[symbol] — página raiz do ticker.
 *
 * Server component: só resolve params e delega pro client.
 * Toda lógica de UI fica no AssetPageClient.
 */

type Props = {
  params: Promise<{ symbol: string }>;
};

export default async function AssetPage({ params }: Props) {
  const { symbol } = await params;
  return <AssetPageClient symbol={symbol.toUpperCase()} />;
}

export const dynamic = "force-dynamic";
