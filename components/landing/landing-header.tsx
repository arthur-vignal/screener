"use client";

/**
 * LandingHeader — sticky transparent → black/60 ao scrollar.
 *
 * Estrutura:
 *   - Logo Sulfur (esquerda) — círculo azul + label uppercase tracking-wide
 *   - Nav central: Hero / Features / Planos (smooth scroll pra âncora)
 *   - Botão Login (direita, pill branco)
 *
 * Estilo: Linear-like (header minimal dark, sem pill preto destacado extra).
 * Auth: botão Entrar único que encaminha /login (regra explícita do Arthur).
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Hero", href: "#hero" },
  { label: "Features", href: "#features" },
  { label: "Planos", href: "#planos" },
] as const;

export function LandingHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full",
        "border-b border-transparent",
        "backdrop-blur-md transition-colors duration-300",
        "bg-black/30 supports-[backdrop-filter]:bg-black/20",
        "[&.scrolled]:border-white/[0.06] [&.scrolled]:bg-black/70",
      )}
      data-scrolled="false"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6 lg:h-20">
        {/* Logo */}
        <a
          href="#hero"
          aria-label="Sulfur — Início"
          className="inline-flex items-center font-display font-bold tracking-[-0.02em] text-foreground text-[16px]"
        >
          /Sulfur
        </a>

        {/* Nav central */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground/85 transition-colors hover:bg-white/[0.04] hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Login */}
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-[13px] font-semibold tracking-tight text-background transition-opacity hover:opacity-90"
        >
          Login
        </Link>
      </div>
    </header>
  );
}
