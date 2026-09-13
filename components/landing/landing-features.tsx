"use client";

/**
 * LandingFeatures — 3 cards horizontais com prints reais da plataforma.
 *
 * Especificação Arthur (2026-09-12):
 *   - 3 features principais em cards. Cada card tem:
 *     - Print real da plataforma (PNG 1440x900 capturado via Playwright)
 *     - Eyebrow numérico (01 · ATIVO | 02 · DRILLDOWN | 03 · HOME)
 *     - Título Roboto Slab (peso alternado)
 *     - Copy curto (1-2 linhas muted)
 *
 * Layout: 3-col grid em lg, stack em mobile.
 * Cada print: rounded-3xl, ring white/10, shadow, bg preto/40 pra integrar.
 *
 * Prints:
 *   - /asset/PETR4          → "Análise de ativos"   (preço + métricas + chart)
 *   - /asset/PETR4/analysis → "Drilldown quantitativo" (valuation bands + peers)
 *   - /home                 → "Carteira + cotações + notícias" (dashboard 3-col)
 */

import { cn } from "@/lib/utils";
import Image from "next/image";

const FEATURES = [
  {
    eyebrow: "01 · Ativo",
    title: "Análise de",
    titleBold: "ativos",
    description:
      "Preço, métricas fundamentalistas e gráfico em uma raiz. P/L, EV/Sales, ROE e tudo que importa numa só tela.",
    image: "/feature-asset.png",
    alt: "Página raiz do ativo PETR4 mostrando preço R$ 49,00, gráfico de preço 1Y em verde e métricas fundamentalistas (Mkt cap, EV/Sales, P/E, FY Revenue, EPS, Gross Margin, Profit Margin, Beta, Div yield, Sector).",
  },
  {
    eyebrow: "02 · Drilldown",
    title: "Drilldown",
    titleBold: "quantitativo",
    description:
      "Valuation contextualizada, bandas de múltiplo, peers por subsetor e fair value implícito em EPS LTM × média 5a.",
    image: "/feature-analysis.png",
    alt: "Página /analysis do PETR4 mostrando seção Valuation contextualizada com chart Bandas de múltiplo (P/L em 5 anos) e scatter de Qualidade × Múltiplo comparando ROE × EV/EBITDA com 4 peers do subsetor Energy Minerals.",
  },
  {
    eyebrow: "03 · Home",
    title: "Carteira e",
    titleBold: "cotações",
    description:
      "Dashboard com carteira, cotações do mercado em tempo real e notícias com chips de tickers detectados automaticamente.",
    image: "/feature-portfolio.png",
    alt: "Página /home mostrando 3 colunas: Carteira (vazia com CTA Criar carteira), tabela Ativos com 11 tickers B3 (variação 24h, 7D, 30D, vol, mkt cap), e Notícias com chips de tickers (PETR3, SBSP3, VALE3, ENGI1).",
  },
] as const;

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="relative w-full px-6 py-24 lg:py-32"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 lg:gap-16">
        {/* Cabeçalho da seção */}
        <div className="flex flex-col gap-3 text-center lg:gap-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Features
          </span>
          <h2
            className="text-balance text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-roboto-slab)", color: "#f5e9d3" }}
          >
            Tudo que você precisa pra <span className="font-black">decidir uma ação.</span>
          </h2>
        </div>

        {/* Grid 3-col */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-7">
          {FEATURES.map((feature, idx) => (
            <article
              key={feature.eyebrow}
              className={cn(
                "group relative flex flex-col gap-5 overflow-hidden rounded-3xl",
                "border border-white/[0.06] bg-white/[0.02] p-5",
                "transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.03]",
              )}
            >
              {/* Print */}
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl",
                  "ring-1 ring-white/[0.08]",
                  "bg-gradient-to-b from-black/40 to-black/80",
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
                {/* fade inferior sutil pra integrar print com bg */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(8,9,11,0) 0%, rgba(8,9,11,0.7) 100%)",
                  }}
                />
              </div>

              {/* Eyebrow */}
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {feature.eyebrow}
              </span>

              {/* Título */}
              <h3
                className="text-[clamp(1.5rem,2.5vw,1.875rem)] leading-[1.15] tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-roboto-slab)", color: "#f5e9d3" }}
              >
                <span className="font-medium">{feature.title}</span>{" "}
                <span className="font-black">{feature.titleBold}</span>
              </h3>

              {/* Description */}
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
