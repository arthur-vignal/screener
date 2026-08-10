import { NextResponse } from "next/server";
import { getBreakevenCurve } from "@/lib/brapi-breakeven";

export const dynamic = "force-dynamic";

export async function GET() {
  const curve = await getBreakevenCurve();
  return NextResponse.json(curve);
}
