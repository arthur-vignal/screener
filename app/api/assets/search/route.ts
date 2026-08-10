import { NextRequest, NextResponse } from "next/server";
import { searchAssets, AssetType } from "@/lib/assets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const typesParam = searchParams.get("types") ?? "stock,etf";
  const types = typesParam.split(",") as AssetType[];

  if (!q.trim()) {
    return NextResponse.json({ results: [], count: 0 });
  }

  const results = searchAssets(q, types);

  // Each result gets an /asset/<symbol> href so the SearchBar can navigate.
  const enriched = results.map((r) => ({
    ...r,
    href: `/asset/${encodeURIComponent(r.symbol)}`,
  }));

  return NextResponse.json({ results: enriched, count: enriched.length });
}
