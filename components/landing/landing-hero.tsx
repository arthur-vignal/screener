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
      {/* bg image sutil (desfocada + escurecida) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "url(/landing-bg.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          filter: "blur(40px) saturate(0.6)",
          opacity: 0.30,
          transform: "scale(1.15)", // cobre a borda criada pelo blur
        }}
      />

      {/* overlay duplo — gradiente radial central + fade bottom pra bg #08090b */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.65) 60%, rgba(8,9,11,0.95) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,9,11,0) 0%, rgba(8,9,11,1) 100%)",
        }}
      />

      {/* conteúdo central */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center gap-7 px-6 py-32 text-center">
        {/* Eyebrow */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={cn(
            "rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1",
            "text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground",
          )}
        >
          Sulfur <span className="mx-1.5 text-white/30">•</span> Mercado
          Brasileiro
        </motion.span>

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

        {/* marca d'água inferior */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.8 }}
          className="absolute bottom-10 text-xs text-muted-foreground/60"
        >
          Acesso gratuito durante o beta.
        </motion.span>
      </div>
    </section>
  );
}
