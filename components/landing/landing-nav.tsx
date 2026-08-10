"use client";

import Link from "next/link";
import { LiquidGlassButton } from "./liquid-glass-button";

/**
 * TopNav (landing) — minimal: logo + 4 nav links + CTA "Acessar".
 * Pure visual; no data dependencies. Lives in the landing page tree
 * only (not the rest of the site).
 */
export function LandingNav({
  onOpenLogin,
}: {
  onOpenLogin: () => void;
}) {
  return (
    <header
      className="fixed top-0 inset-x-0 z-50"
      style={{
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        background: "rgba(10,10,12,0.55)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 press">
          <span
            className="w-7 h-7 bg-white flex items-center justify-center text-[#0a0a0c] font-bold text-[14px] rounded-md"
            style={{ fontFamily: "var(--font-display)" }}
          >
            S
          </span>
          <span className="font-display text-[15px] tracking-[-0.02em] text-white">
            Sulfur<span className="text-[#9a9ba3]">.io</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {[
            { href: "#home", label: "Home" },
            { href: "#features", label: "Features" },
            { href: "#preco", label: "Preço" },
            { href: "#sobre", label: "Sobre" },
          ].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[13px] text-[#9a9ba3] hover:text-white transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <LiquidGlassButton onClick={onOpenLogin} className="px-5 py-2.5 text-[13px]">
          Acessar
        </LiquidGlassButton>
      </div>
    </header>
  );
}
