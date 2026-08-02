import { NextRequest, NextResponse } from "next/server";
import { signup } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { username?: string; email?: string; password?: string };
    if (!body.username || !body.email || !body.password) {
      return NextResponse.json(
        { error: "username, email e password são obrigatórios" },
        { status: 400 },
      );
    }
    const result = await signup({
      username: body.username,
      email: body.email,
      password: body.password,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
