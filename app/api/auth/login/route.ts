import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "username e password obrigatórios" },
        { status: 400 },
      );
    }
    const result = await login({ username: body.username, password: body.password });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
