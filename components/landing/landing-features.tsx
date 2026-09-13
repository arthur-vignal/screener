"use client";

/**
 * LandingFeatures — 3 cards com prints reais da plataforma.
 *
 * Especificação Arthur (2026-09-13):
 *   - 3 cards. Estrutura interna: Título → Imagem → CTA curto
 *   - SEM eyebrow numérico, SEM descrição longa
 *   - CTA = mini texto explicativo curto abaixo da imagem (não botão)
 *   - Hover effect 3D: Aceternity Comet Card (rotate + translate + glare)
 *   - Imagens SEM rounded, integradas direto no card (rounded só na borda externa)
 *
 * Prints:
 *   - /asset/PETR4          → "Análise de ativos"
 *   - /asset/PETR4/analysis → "Drilldown quantitativo"
 *   - /home                 → "Carteira e cotações"
 */

import Image from "next/image";
import { CometCard } from "@/components/ui/comet-card";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "Análise de ativos",
    image: "/feature-asset.png",
    alt: "Página raiz do ativo PETR4 mostrando preço R$ 49,00, gráfico de preço 1Y em verde e métricas fundamentalistas.",
    cta: "Preço, métricas e gráfico numa só tela.",
  },
  {
    title: "Drilldown quantitativo",
    image: "/feature-analysis.png",
    alt: "Página /analysis do PETR4 mostrando seção Valuation contextualizada com bandas de múltiplo e scatter de Qualidade × Múltiplo.",
    cta: "Valuation contextualizada, bandas e peers por subsetor.",
  },
  {
    title: "Carteira e cotações",
    image: "/feature-portfolio.png",
    alt: "Página /home mostrando 3 colunas: Carteira, tabela de Ativos B3 com variação, e Notícias com chips de tickers.",
    cta: "Dashboard com carteira, mercado e notícias em tempo real.",
  },
] as const;

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="relative w-full px-6 py-24 lg:py-32"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 lg:gap-16">
        {/* Grid 3-col com Comet Card 3D tilt */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          {FEATURES.map((feature, idx) => (
            <CometCard
              key={feature.title}
              rotateDepth={12}
              translateDepth={14}
              className="w-full"
            >
              <article
                className={cn(
                  "flex flex-col gap-5 overflow-hidden rounded-2xl p-5",
                  "border border-white/[0.08] bg-[#0c0d10]",
                )}
              >
                {/* Título */}
                <h3
                  className="text-[clamp(1.5rem,2.5vw,1.875rem)] leading-[1.15] tracking-[-0.01em]"
                  style={{
                    fontFamily: "var(--font-roboto-slab)",
                    color: "#f5e9d3",
                  }}
                >
                  <span className="font-medium">{feature.title.split(" ")[0]}</span>{" "}
                  <span className="font-black">
                    {feature.title.split(" ").slice(1).join(" ")}
                  </span>
                </h3>

                {/* Imagem (sem rounded, encosta no card) */}
                <div
                  className={cn(
                    "relative -mx-5 overflow-hidden",
                    "ring-1 ring-white/[0.08]",
                    "bg-black",
                  )}
                >
                  <Image
                    src={feature.image}
                    alt={feature.alt}
                    width={1440}
                    height={900}
                    priority={idx === 0}
                    className="block h-auto w-full"
                  />
                </div>

                {/* CTA — mini texto explicativo */}
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {feature.cta}
                </p>
              </article>
            </CometCard>
          ))}
        </div>
      </div>
    </section>
  );
}
