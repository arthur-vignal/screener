import { RawDataPageClient } from "./raw-data-client";

/**
 * /asset/[symbol]/raw-data — tabela anual com 10 anos de demonstrações
 * financeiras (Receita · Margens · Balanço · Valuation).
 *
 * Server component: resolve params e delega pro client.
 */

type Props = {
  params: Promise<{ symbol: string }>;
};

export default async function RawDataPage({ params }: Props) {
  const { symbol } = await params;
  return (
    <RawDataPageClient
      symbol={symbol.toUpperCase().replace(/\.SA$/, "")}
    />
  );
}

export const dynamic = "force-dynamic";