import { NextRequest, NextResponse } from "next/server";
import { searchAssets, getAllSymbols, AssetType } from "@/lib/assets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const typesParam = searchParams.get("types") ?? "stock,etf,crypto";
  const types = typesParam.split(",") as AssetType[];

  if (!q.trim()) {
    return NextResponse.json({
      results: getAllSymbols().slice(0, 30).map((s) => ({ symbol: s, name: s })),
      count: 0,
    });
  }

  const results = searchAssets(q, types);
  return NextResponse.json({ results, count: results.length });
}
