"use client";

/**
 * LandingHero — primeira dobra da landing.
 *
 * Composição:
 *  - Eyebrow (UPPERCASE tracking-0.18) + manifesto em display (Sekuya/Archivo Black) com palavra em itálico
 *  - Sub-linha única em muted-foreground/70
 *  - 2 CTAs: primário sólido (bg-foreground) + secundário outline
 *  - Prova social: 5 estrelas mono + frase suportada
 *  - Ilustração SVG inline abaixo (candles + grid B3 estilizado)
 *
 * Fundo do hero herda do body gradient (§35 sulfur-design-hardening):
 *   #08090b base + radial top + linear 135deg diagonal.
 *
 * DECISÕES:
 *  - Sem subtítulo depois do manifesto (regra §13.2 sulfur-ui-rules)
 *  - Sem emoji (regra §2)
 *  - Texto 100% branco text-foreground (§13.1)
 *  - radius fechado (só md/full, nada custom)
 *  - Spacing múltiplos de 4
 */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function LandingHero() {
  return (
    <section
      id="topo"
      className={cn(
        "relative w-full",
        "px-6 lg:px-12",
        "pt-12 lg:pt-20 pb-20 lg:pb-28",
      )}
    >
      <div className="mx-auto w-full max-w-[1280px]">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "text-foreground/70 text-[11px] font-semibold tracking-[0.18em] uppercase",
            "mb-6 lg:mb-8",
          )}
        >
          Análise fundamental · B3
        </motion.p>

        {/* Manifesto */}
        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
          }}
          className={cn(
            "max-w-[920px]",
            "text-[44px] sm:text-[64px] lg:text-[88px]",
            "leading-[1.02] tracking-[-0.02em]",
            "font-semibold text-foreground",
          )}
        >
          <motion.span
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
            }}
            className="block"
          >
            Invista com método.
          </motion.span>
          <motion.span
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
            }}
            className="block"
          >
            <span className="text-muted-foreground/85 italic font-normal">
              Não com achismo.
            </span>
          </motion.span>
        </motion.h1>

        {/* Sub-linha */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
          className={cn(
            "mt-6 max-w-[560px]",
            "text-[15px] leading-[1.5] text-muted-foreground/70",
          )}
        >
          Carteiras, valuation e calendário macro numa única plataforma feita
          pra quem decide com dados — não com hype.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <a
            href="/signup"
            className={cn(
              "inline-flex items-center h-11 px-5 rounded-md",
              "bg-foreground text-background",
              "text-[14px] font-semibold tracking-tight",
              "hover:opacity-90 transition-opacity",
            )}
          >
            Criar conta gratuita
          </a>
          <a
            href="#recursos"
            className={cn(
              "inline-flex items-center h-11 px-5 rounded-md",
              "border border-white/10 bg-white/[0.04]",
              "text-[14px] font-medium text-foreground",
              "hover:bg-white/[0.08] hover:border-white/20 transition-colors",
            )}
          >
            Ver como funciona
          </a>
        </motion.div>

        {/* Prova social */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.5 }}
          className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarGlyph key={i} />
            ))}
            <span className="ml-2 text-[12px] text-muted-foreground/70 tabular-nums">
              4.9 · trustpilot
            </span>
          </div>
          <div className="h-3 w-px bg-white/10" aria-hidden="true" />
          <p className="text-[12px] text-muted-foreground/70 max-w-md">
            Curado no Brasil. Dados de mercado aberto, sem promessas de
            rentabilidade.
          </p>
        </motion.div>

        {/* Ilustração SVG inline — candles + grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 lg:mt-20"
          aria-hidden="true"
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}

function StarGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      className="text-foreground"
    >
      <path d="M8 0l2.06 5.51L16 6.27l-4 3.89.95 5.84L8 13.27l-4.95 2.73L4 10.16 0 6.27l5.94-.76z" />
    </svg>
  );
}

function HeroIllustration() {
  // 8 candles estilizadas + grid horizontal sutil, accent azul nas últimas 3.
  // Tom de cinza nas históricas (#489ffa opacity baixa).
  return (
    <svg
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMid meet"
      className={cn("w-full h-auto", "text-muted-foreground/40")}
    >
      <defs>
        <linearGradient id="hero-candle-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="hero-line-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#489ffa" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Grid lines horizontais */}
      {[60, 120, 180, 240].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="1200"
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeDasharray="2 6"
        />
      ))}

      {/* Linha de tendência conectando topos */}
      <path
        d="M 40,210 L 200,180 L 360,200 L 520,150 L 680,170 L 840,110 L 1000,130 L 1160,90"
        fill="none"
        stroke="url(#hero-line-fade)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Candles (8) */}
      {[
        { x: 90, top: 195, bottom: 235, up: false },
        { x: 240, top: 165, bottom: 220, up: true },
        { x: 400, top: 185, bottom: 215, up: false },
        { x: 560, top: 130, bottom: 180, up: true },
        { x: 720, top: 155, bottom: 195, up: false },
        { x: 880, top: 95, bottom: 145, up: true },
        { x: 1040, top: 115, bottom: 150, up: true },
        { x: 1140, top: 80, bottom: 130, up: true },
      ].map((c, i) => {
        const isAccent = i >= 5;
        const color = isAccent ? "#489ffa" : "currentColor";
        const fillOpacity = isAccent ? 0.18 : 0.08;
        return (
          <g key={i}>
            <line
              x1={c.x}
              y1={c.top - 10}
              x2={c.x}
              y2={c.bottom + 10}
              stroke={color}
              strokeOpacity={isAccent ? 0.9 : 0.5}
              strokeWidth="1.5"
            />
            <rect
              x={c.x - 14}
              y={c.top}
              width="28"
              height={c.bottom - c.top}
              fill={color}
              fillOpacity={fillOpacity}
              stroke={color}
              strokeOpacity={isAccent ? 0.95 : 0.6}
              strokeWidth="1.5"
              rx="2"
            />
          </g>
        );
      })}
    </svg>
  );
}
