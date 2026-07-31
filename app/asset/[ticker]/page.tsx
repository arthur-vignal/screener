import { AssetDetail } from "@/components/asset-detail";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return <AssetDetail ticker={ticker} />;
}
