import { NextResponse } from "next/server";
import { getMacroSeries } from "@/lib/brapi-macro";

export const dynamic = "force-dynamic";

export async function GET() {
  const series = await getMacroSeries();
  return NextResponse.json({ series });
}
