"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, BarChart3, Compass, DollarSign, Layers } from "lucide-react";
import { LiquidGlassButton } from "./liquid-glass-button";

type NavLink = {
  label: string;
  href: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  panel?: Array<{ title: string; description: string; icon: React.ComponentType<{ className?: string }> }>;
};

const NAV_LINKS: NavLink[] = [
  {
    label: "Home",
    href: "#home",
    description: "Visão geral do produto",
    icon: Compass,
  },
  {
    label: "Features",
    href: "#features",
    icon: Sparkles,
    panel: [
      {
        title: "Cotação em tempo real",
        description: "Ações BR/US, ETFs, FIIs, BDRs.",
        icon: BarChart3,
      },
      {
        title: "Painel Macro BR",
        description: "Selic, CDI, IPCA, PIB e mais.",
        icon: Layers,
      },
      {
        title: "Copom Watch",
        description: "Curva de juros prefixada implícita.",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Preço",
    href: "#preco",
    description: "Sem custo, sem assinatura",
    icon: DollarSign,
  },
  {
    label: "Sobre",
    href: "#sobre",
    description: "Quem constrói",
    icon: Compass,
  },
];

/**
 * LandingNav — shadcn-style mega-menu top nav. On hover over an item
 * with a `panel`, a glass-effect dropdown opens listing the panel
 * items with icons. CTAs use the LiquidGlassButton.
 */
export function LandingNav({
  onOpenLogin,
}: {
  onOpenLogin: () => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50"
      style={{
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        background: "rgba(10,10,12,0.55)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 press">
          <span
            className="w-7 h-7 bg-white flex items-center justify-center text-[#0a0a0c] font-bold text-[14px] rounded-md"
            style={{ fontFamily: "var(--font-display)" }}
          >
            S
          </span>
          <span className="font-display text-[16px] tracking-[-0.02em] text-white">
            Sulfur<span className="text-[#9a9ba3]">.io</span>
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map((n, i) => (
            <div
              key={n.label}
              className="relative"
              onMouseEnter={() => setOpenIdx(n.panel ? i : null)}
              onMouseLeave={() => setOpenIdx(null)}
            >
              <Link
                href={n.href}
                className="inline-flex items-center gap-1 px-3.5 h-9 text-[13px] text-[#9a9ba3] hover:text-white transition-colors rounded-md"
              >
                {n.label}
                {n.panel && (
                  <ChevronDown className="w-3 h-3 opacity-60" />
                )}
              </Link>
              <AnimatePresence>
                {openIdx === i && n.panel && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[420px] rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(19,19,22,0.85)",
                      backdropFilter: "blur(22px) saturate(140%)",
                      WebkitBackdropFilter: "blur(22px) saturate(140%)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow:
                        "0 20px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="p-3">
                      {n.panel.map((p) => (
                        <Link
                          key={p.title}
                          href="#features"
                          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                        >
                          <span
                            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <p.icon className="w-4 h-4 text-[#a78bfa]" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-white">
                              {p.title}
                            </div>
                            <div className="text-[11.5px] text-[#9a9ba3]">
                              {p.description}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <LiquidGlassButton onClick={onOpenLogin} className="px-5 py-2.5 text-[13px]">
          Acessar
        </LiquidGlassButton>
      </div>
    </header>
  );
}
