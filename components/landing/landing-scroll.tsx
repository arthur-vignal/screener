"use client";

/**
 * LandingScroll — landing scroll-driven estilo storytelling.
 *
 * Comportamento:
 *   - Background full-viewport (ilha suspensa) fica em position:fixed
 *     ocupando 100vh. Não rola junto com o scroll.
 *   - Conforme o scroll avança, backgroundPosition muda de 25% 50%
 *     pra 50% 55% (zoom no centro da imagem, foca o homem + tela do PC).
 *     Scale também sobe de 1.0 → 1.15 pra reforçar o zoom-in.
 *   - Conteúdo (typing headline, features, CTA final) rola normalmente
 *     em camadas com z-index acima do background. Cria a sensação de
 *     "passar pelo cenário" até chegar nos CTAs.
 *
 * Tipografia:
 *   - Headline (typing) — Archivo Black, viewport-fluid clamp(2.5rem, 7vw, 6rem).
 *   - Features / CTA — Manrope + Inter.
 *
 * Background:
 *   - public/landing-bg.webp, mesmo da versão anterior.
 *   - Overlay duplo (vignette + bottom-fade) pra contraste em qualquer
 *     momento do zoom (a zona dourada desloca com a posição).
 */

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { LandingNavbar } from "./landing-navbar";
import { LandingHeadline } from "./landing-headline";
import { LandingFeatures } from "./landing-features";
import { LandingCTA } from "./landing-cta";
import { cn } from "@/lib/utils";

export function LandingScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Zoom na imagem (scale 1.0 → 1.18) conforme rola 0 → 0.6
  const imgScale = useTransform(scrollYProgress, [0, 0.6], [1.0, 1.18]);
  // Posição da imagem desloca pra esquerda do "homem" (zoom no centro)
  // 0% = 25% (estado inicial, foco à esquerda)
  // 0.6+ = 50% (foco no centro, onde tá o cara + tela do PC)
  const imgPosX = useTransform(scrollYProgress, [0, 0.6], ["25%", "50%"]);
  // Tela escurece um pouco conforme rola (efeito cinematografico)
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.8], [0.4, 0.85]);

  return (
    <div ref={containerRef} className="relative w-full overflow-x-hidden">
      {/* Background full-viewport FIXO — não rola, só zoom interno */}
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url(/landing-bg.webp)",
          backgroundPosition: imgPosX,
          scale: imgScale,
        }}
      />

      {/* Overlay duplo controlado por scroll (escurece conforme rola) */}
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-0"
        style={{
          background:
            "linear-gradient(270deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 45%, rgba(0,0,0,0) 70%), " +
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.85) 100%)",
          opacity: overlayOpacity,
        }}
      />

      {/* Conteúdo rola por cima (z-10). Header sempre visível acima de tudo. */}
      <div className="relative z-10">
        {/* Header transparent por cima de tudo */}
        <LandingNavbar />

        {/* Viewport 1: typing headline centralizado (100vh) */}
        <section className="relative flex min-h-[100svh] w-full items-center justify-center px-6">
          <LandingHeadline />
        </section>

        {/* Viewport 2: features cards (também 100vh, fundo mais escuro) */}
        <section
          className={cn(
            "relative flex min-h-[100svh] w-full items-center",
            "bg-black/40 px-6 py-20 backdrop-blur-sm",
          )}
        >
          <LandingFeatures />
        </section>

        {/* Viewport 3: CTA final + footer copy */}
        <section
          className={cn(
            "relative flex min-h-[100svh] w-full items-center",
            "bg-black/70 px-6 py-20 backdrop-blur-md",
          )}
        >
          <LandingCTA />
        </section>
      </div>
    </div>
  );
}
