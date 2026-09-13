/**
 * Auth middleware (2026-09-13).
 *
 * Protege todas as rotas em (app)/* — redireciona pra /login se
 * o cookie de sessão (screener_session) não existir.
 *
 * Whitelist:
 *   - /, /login, /signup, /asset/[symbol], /asset/[symbol]/* (públicas)
 *   - /api/auth/* (auth callbacks — não redirecionar)
 *   - arquivos estáticos (_next/*, favicon, etc)
 *
 * O cookie screener_session é httpOnly + sameSite=lax; middleware
 * só verifica existência (não valida JWT — isso é feito pelo
 * `getCurrentUser()` nas server actions/routes).
 *
 * Implementação leve: sem `jose`, sem decrypt. Edge runtime é OK.
 */

import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "screener_session";

// Prefixos públicos (não exigem auth)
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/asset",
  "/index", // /index/[tickerindex] é público
  "/api/auth",
  "/api/news", // feeds públicos (Google News etc)
  "/_next",
  "/favicon",
];

function isPublic(path: string): boolean {
  if (path === "/") return true; // landing é pública
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass static / public paths
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Rotas em (app)/* — checam via cookie. Outras rotas públicas
  // como /asset/[symbol] também passam.
  const sessionCookie = req.cookies.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    // Sem sessão → redireciona pra /login com param `next` pra
    // retornar depois do login.
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // tudo exceto _next/static, _next/image, favicon, robots.txt
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
