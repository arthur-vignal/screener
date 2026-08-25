import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/macro/selic — Brazilian Selic meta (annual %).
 *
 * Pulls from Brapi's `/v2/prime-rate?country=brazil` and caches for
 * 24h (Selic moves every ~45 days at most).
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await cached("brapiSelic", 24 * 3600, async () => {
      const token = process.env.BRAPI_TOKEN ?? process.env.BRAPI_API_TOKEN ?? "";
      const url = new URL("https://brapi.dev/api/v2/prime-rate");
      url.searchParams.set("country", "brazil");
      if (token) url.searchParams.set("token", token);
      const r = await fetch(url.toString(), {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`brapi ${r.status}`);
      const data = (await r.json()) as {
        "prime-rate"?: Array<{ date: string; value: number; epochDate: number }>;
      };
      const rates = data["prime-rate"] ?? [];
      if (rates.length === 0) return null;
      // Most recent first
      const sorted = rates.slice().sort((a, b) => b.epochDate - a.epochDate);
      return sorted[0];
    });
    return NextResponse.json({ selic: data });
  } catch (err) {
    return NextResponse.json(
      { error: "Selic indisponível", detail: String(err) },
      { status: 502 },
    );
  }
}