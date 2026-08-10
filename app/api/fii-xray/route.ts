import { NextResponse } from "next/server";
import { getFiiXRay } from "@/lib/brapi-fii-xray";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getFiiXRay();
  return NextResponse.json({ rows });
}
