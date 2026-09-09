"use client";

/**
 * LandingNavbar — header minimal, sem backdrop sticky (full section background cobre ela).
 *
 * Tokens:
 * - Logo "Sulfur" Michroma (já carregado em app/layout.tsx via next/font)
 * - Menu vertical pills simples, alinhados à esquerda da coluna direita
 * - CTA "Entrar" outline + "Criar conta" solid white
 *
 * Idempotente ao scroll: NÃO usa `sticky` (não combina com layout de landing
 * que faz split de seção inteira). Fica no topo da seção, ancorado pelo flow.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Recursos", href: "#recursos" },
  { label: "Mercados", href: "#mercados" },
  { label: "Planos", href: "#planos" },
] as const;

export function LandingNavbar() {
  return (
    <header
      className={cn(
        "relative z-20 w-full",
        "px-6 lg:px-12",
        "h-16 lg:h-20",
        "flex items-center justify-between",
      )}
    >
      <Link
        href="/"
        aria-label="Sulfur — Home"
        className="inline-flex items-center gap-2 group"
      >
        {/* Logo mark — minimal S em orbit, accent blue */}
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] border border-white/10"
        >
          <span
            className="block h-3.5 w-3.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #489ffa 0%, #1d4ed8 70%, transparent 100%)",
              boxShadow: "0 0 12px rgba(72,159,250,0.55)",
            }}
          />
        </span>
        <span className="text-foreground font-semibold tracking-[0.18em] text-[14px] uppercase">
          Sulfur
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-[13px] font-medium",
              "text-muted-foreground/85 hover:text-foreground",
              "hover:bg-white/[0.04] transition-colors",
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className={cn(
            "inline-flex items-center h-9 px-3.5 rounded-md",
            "border border-white/10 bg-white/[0.04]",
            "text-[13px] font-medium text-foreground",
            "hover:bg-white/[0.08] hover:border-white/20 transition-colors",
          )}
        >
          Entrar
        </Link>
        <Link
          href="/signup"
          className={cn(
            "inline-flex items-center h-9 px-3.5 rounded-md",
            "bg-foreground text-background",
            "text-[13px] font-semibold tracking-tight",
            "hover:opacity-90 transition-opacity",
          )}
        >
          Criar conta
        </Link>
      </div>
    </header>
  );
}
