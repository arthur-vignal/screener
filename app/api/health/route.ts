import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Lightweight liveness probe used by Railway (see railway.toml
 * healthcheckPath). Returns 200 as long as the Node process is
 * running and the Next.js route handler is mounted. Does not touch
 * Brapi, Supabase, or any external service.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}