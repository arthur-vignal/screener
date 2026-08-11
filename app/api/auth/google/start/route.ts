import { NextResponse } from "next/server";

/**
 * GET /api/auth/google/start
 *
 * Google OAuth start. In production this would redirect to
 * https://accounts.google.com/o/oauth2/v2/auth?... (with
 *   client_id, redirect_uri=/api/auth/google/callback, scope=openid email profile)
 *
 * For now, if GOOGLE_CLIENT_ID is not set, we redirect to /home
 * with a flash message so the rest of the flow is testable.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://screener-production.up.railway.app";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!CLIENT_ID) {
    // No real OAuth configured. Bounce back to the home with a flash.
    const url = new URL("/home", BASE_URL);
    url.searchParams.set("oauth", "google");
    url.searchParams.set("status", "skipped");
    return NextResponse.redirect(url);
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${BASE_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}