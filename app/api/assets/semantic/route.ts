import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/semantic-search";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [], explanation: "", mode: "keyword" });
  }
  try {
    const result = await semanticSearch(q);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
