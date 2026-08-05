import { NextResponse } from "next/server";
import { computeFearGreed } from "@/lib/fear-greed";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const result = await cached(
      "fear-greed:current",
      10 * 60 * 1000, // 10 min cache
      () => computeFearGreed(),
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to compute: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
