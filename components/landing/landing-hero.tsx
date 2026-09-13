"use client";

/**
 * LandingHero — primeira viewport da landing.
 *
 * Especificação Arthur (2026-09-12):
 *   - bg image sutil: landing-bg.webp com blur(40px) + opacity 0.30
 *     + saturação reduzida. Não domina — o bg dark principal
 *     (#08090b) é o protagonista visual.
 *   - Headline Roboto Slab alternando pesos em 3 linhas:
 *     linha 1: "Todas as informações" — font-medium
 *     linha 2: "que você precisa"   — font-black (peso alto, contraste)
 *     linha 3: "num só lugar."      — font-medium italic
 *   - Eyebrow "SULFUR • MERCADO BRASILEIRO" tracking-wide
 *   - Subtítulo muted (1 linha)
 *   - Botão único "Entrar →" encaminha /login (regra explícita)
 *
 * Cor: mantém #f5e9d3 (cream warm — ting bege) no texto.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const HEADLINE_LINE_1 = "Todas as informações";
const HEADLINE_LINE_2 = "que você precisa";
const HEADLINE_LINE_3 = "num só lugar.";

const CREAM = "#f5e9d3";

export function LandingHero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] w-full items-center overflow-hidden"
    >
      {/* conteúdo central — bg preto sólido #08090b */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center gap-7 px-6 py-32 text-center">
        {/* Headline */}
        <h1
          className={cn(
            "max-w-[1000px] text-balance",
            "leading-[1.05] tracking-[-0.02em]",
            "text-[clamp(2.5rem,7vw,5.25rem)]",
          )}
          style={{ fontFamily: "var(--font-roboto-slab)", color: CREAM }}
        >
          <span className="block font-medium">{HEADLINE_LINE_1}</span>
          <span className="block font-black">{HEADLINE_LINE_2}</span>
          <span className="block font-medium italic">{HEADLINE_LINE_3}</span>
        </h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="max-w-xl text-pretty text-base text-muted-foreground lg:text-lg"
        >
          Análise fundamentalista, drilldown quant e acompanhamento de
          carteira num só lugar. Sem paywall de dados e sem ruído.
        </motion.p>

        {/* CTA único */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Link
            href="/login"
            className={cn(
              "inline-flex items-center gap-3 rounded-full",
              "bg-foreground px-8 py-4 text-base font-semibold tracking-tight text-background",
              "transition-opacity hover:opacity-90",
            )}
          >
            Entrar
            <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
