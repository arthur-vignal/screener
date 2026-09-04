import IndexPageClient from "./index-page-client";

/**
 * /index/[tickerindex] — página de índice B3.
 *
 * Server component: só resolve params e delega pro client.
 *
 * Diferenças vs /asset/[symbol]:
 *   - Sem métricas fundamentalistas (P/E, receita, etc) — índice
 *     não tem earnings próprio.
 *   - Sem os 11 gráficos analíticos do /analysis.
 *   - Mantém: header + price chart (mesmo componente) + métricas
 *     macro do índice (YTD, P/L LTM, div yield, vol, 52w, composição).
 *   - Glow de fundo pela cor da bandeira do país (Brazil = verde).
 */

type Props = {
  params: Promise<{ tickerindex: string }>;
};

export default async function IndexPage({ params }: Props) {
  const { tickerindex } = await params;
  return <IndexPageClient symbol={tickerindex.toUpperCase()} />;
}

export const dynamic = "force-dynamic";
