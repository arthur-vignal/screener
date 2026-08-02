import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  // unused param for linter
  await logout();
  return NextResponse.json({ ok: true });
}
