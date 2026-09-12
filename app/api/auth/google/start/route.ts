import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/google/start
 *
 * Google OAuth start. Builds authorization URL with:
 *   client_id, redirect_uri=<request origin>/api/auth/google/callback,
 *   scope=openid email profile
 *
 * Forca o base URL a partir do HOST do request (req.nextUrl.origin),
 * NAO de NEXT_PUBLIC_BASE_URL, pra nao quebrar quando o subdominio
 * Railway muda. Fallback pra env var se origin vier vazia.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";

export const dynamic = "force-dynamic";

function requestBaseUrl(req: NextRequest): string {
  // req.nextUrl.origin ja reflete o host real (com proxy/x-forwarded-host).
  return (
    req.nextUrl.origin ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://screener-production-4f58.up.railway.app"
  );
}

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    // No real OAuth configured. Bounce back to the home with a flash.
    const base = requestBaseUrl(req);
    const url = new URL("/home", base);
    url.searchParams.set("oauth", "google");
    url.searchParams.set("status", "skipped");
    return NextResponse.redirect(url);
  }

  const base = requestBaseUrl(req);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${base}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}