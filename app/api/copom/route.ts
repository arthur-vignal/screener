import { NextResponse } from "next/server";
import { getInterestCurve } from "@/lib/brapi-curve";

export const dynamic = "force-dynamic";

export async function GET() {
  const curve = await getInterestCurve();
  return NextResponse.json(curve);
}
