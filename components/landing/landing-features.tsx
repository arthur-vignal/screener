"use client";

/**
 * BouncyCardsFeatures (manual reimplementação, 2026-09-13).
 *
 * Inspirado em @uniquesonu/bounce-card-features (21st.dev) — mas o
 * registry exigia auth, então reconstruí a partir da spec.
 *
 * Spec (Arthur, 2026-09-13):
 *   - Headline principal: "Saiba tudo sobre os seus investimentos"
 *   - Grid responsivo de cards (1 col mobile, 2 col md, 3 col lg)
 *   - Cada card tem seu próprio título + texto descritivo
 *   - Hover: card "bounce" (scale) + rotate leve
 *   - Área de demo (visual) no topo do card, gradient-filled
 *   - **Cards PRETOS** (não brancos como no demo)
 *
 * Substitui o CometCard anterior.
 */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { type ReactNode } from "react";

type FeatureCard = {
  title: string;
  description: string;
  /** Cor do gradient do demo (Tailwind arbitrary via inline style) */
  gradientFrom: string;
  gradientTo: string;
  image: string;
  alt: string;
};

const FEATURES: FeatureCard[] = [
  {
    title: "Análise de ativos",
    description:
      "Preço, métricas fundamentalistas e gráfico numa só raiz. P/L, EV/Sales, ROE e tudo que importa numa tela.",
    gradientFrom: "rgba(72,159,250,0.30)",
    gradientTo: "rgba(8,9,11,0)",
    image: "/feature-asset.png",
    alt: "Página raiz do ativo PETR4 mostrando preço R$ 49,00, gráfico de preço 1Y em verde e métricas fundamentalistas.",
  },
  {
    title: "Drilldown quantitativo",
    description:
      "Valuation contextualizada, bandas de múltiplo, peers por subsetor e fair value implícito em EPS LTM × média 5a.",
    gradientFrom: "rgba(124,92,255,0.30)",
    gradientTo: "rgba(8,9,11,0)",
    image: "/feature-analysis.png",
    alt: "Página /analysis do PETR4 mostrando seção Valuation contextualizada com bandas de múltiplo e scatter de Qualidade × Múltiplo.",
  },
  {
    title: "Carteira e cotações",
    description:
      "Dashboard com carteira, cotações do mercado em tempo real e notícias com chips de tickers detectados automaticamente.",
    gradientFrom: "rgba(77,190,149,0.30)",
    gradientTo: "rgba(8,9,11,0)",
    image: "/feature-portfolio.png",
    alt: "Página /home mostrando 3 colunas: Carteira, tabela de Ativos B3 com variação, e Notícias com chips de tickers.",
  },
];

function BounceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        rotate: -1.5,
        y: -6,
        transition: { type: "spring", stiffness: 280, damping: 18 },
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative h-full w-full",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="relative w-full px-6 py-24 lg:py-32"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 lg:gap-16">
        {/* Headline principal + sub */}
        <div className="flex flex-col gap-4 text-center lg:gap-5">
          <h2
            className="text-balance text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em]"
            style={{
              fontFamily: "var(--font-roboto-slab)",
              color: "#f5e9d3",
            }}
          >
            <span className="font-medium">Saiba tudo</span>{" "}
            <span className="font-black">sobre os seus</span>{" "}
            <span className="font-medium italic">investimentos.</span>
          </h2>
          <p className="mx-auto max-w-xl text-pretty text-base text-muted-foreground lg:text-lg">
            Análise fundamentalista, drilldown quantitativo e
            acompanhamento de carteira — tudo numa só plataforma.
          </p>
        </div>

        {/* Grid 3-col responsivo */}
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {FEATURES.map((feature, idx) => (
            <BounceCard key={feature.title}>
              <article
                className={cn(
                  "flex h-full flex-col gap-5 overflow-hidden rounded-3xl p-6",
                  "border border-white/[0.08] bg-[#0c0d10]",
                )}
              >
                {/* Demo area (gradient + imagem) */}
                <div
                  className="relative -mx-6 -mt-6 overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${feature.gradientFrom} 0%, ${feature.gradientTo} 100%)`,
                  }}
                >
                  {/* Inner image */}
                  <motion.div
                    className="relative aspect-[16/10] w-full"
                    initial={{ y: 0, rotate: 0 }}
                    whileHover={{
                      y: -8,
                      rotate: 1.5,
                      transition: { type: "spring", stiffness: 280, damping: 20 },
                    }}
                  >
                    <Image
                      src={feature.image}
                      alt={feature.alt}
                      width={1440}
                      height={900}
                      priority={idx === 0}
                      className="block h-full w-full object-cover object-top"
                    />
                  </motion.div>
                </div>

                {/* Title + description */}
                <div className="flex flex-col gap-2 px-1">
                  <h3
                    className="text-[clamp(1.375rem,2.2vw,1.625rem)] leading-[1.15] tracking-[-0.01em]"
                    style={{
                      fontFamily: "var(--font-roboto-slab)",
                      color: "#f5e9d3",
                    }}
                  >
                    {feature.title.split(" ").map((word, i, arr) => (
                      <span
                        key={i}
                        className={i === arr.length - 1 ? "font-black" : "font-medium"}
                      >
                        {word}
                        {i < arr.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </h3>
                  <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </article>
            </BounceCard>
          ))}
        </div>
      </div>
    </section>
  );
}
