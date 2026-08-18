import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AssetPageClient } from "./asset-page-client";

/**
 * /asset/[symbol] — server component.
 *
 *  - Auth gate: redirect to /login if no session.
 *  - Hydrates the client shell with the symbol; the client then
 *    fetches /api/asset/[symbol] (which bundles quote + fundamentals
 *    + a default candle series) and renders the chart, metrics and
 *    news card.
 *
 *  We don't pre-fetch the bundle here — the bundle endpoint already
 *  caches, and we want the page to render instantly even when the
 *  Brapi upstream is slow.
 */

export const dynamic = "force-dynamic";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const { symbol: raw } = await params;
    const symbol = raw.toUpperCase().replace(/\.SA$/, "");
    redirect(`/login?next=/asset/${encodeURIComponent(symbol)}`);
  }

  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  return <AssetPageClient symbol={symbol} />;
}