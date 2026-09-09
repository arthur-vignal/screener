"use client";

/**
 * LandingHow — 3 passos numerados (estilo manifesto).
 *
 * Decisões (§Arthur §9 composição):
 * - Sem ícone. Sem descrição.
 * - Numeral em JetBrains Mono (mono) 48-64px
 * - Label em Archivo Black/Sekuya 24-32px
 *
 * 1. Crie sua carteira
 * 2. Siga o valuation
 * 3. Tome decisões com dados
 */

import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    label: "Crie suas carteiras.",
    desc: "Adicione ativos por ticker, qty e preço médio. Sulfur recalcula pesos e custo investido.",
  },
  {
    n: "02",
    label: "Acompanhe o valuation.",
    desc: "P/L, EV/EBITDA, P/VP, ROIC. Tudo com banda empírica do subsetor — sem chute.",
  },
  {
    n: "03",
    label: "Decida com calendário.",
    desc: "Copom, IPCA, IBC-Br e dividendos das suas carteiras no mesmo feed.",
  },
] as const;

export function LandingHow() {
  return (
    <section id="como-funciona" className="px-6 lg:px-12 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="mb-12 lg:mb-16 max-w-2xl">
          <p className="text-foreground/70 text-[11px] font-semibold tracking-[0.18em] uppercase mb-4">
            Como funciona
          </p>
          <h2 className="text-[32px] lg:text-[44px] font-semibold tracking-tight leading-[1.1] text-foreground">
            Três passos. Sem promessas.
          </h2>
        </header>

        <ol className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {STEPS.map((step) => (
            <li key={step.n} className="flex flex-col gap-3">
              <span
                className={cn(
                  "block",
                  "text-[56px] lg:text-[72px] font-semibold leading-[1.0] tracking-tight",
                  "font-mono text-foreground/85",
                )}
                aria-hidden="true"
              >
                {step.n}
              </span>
              <h3 className="text-[20px] lg:text-[24px] font-semibold tracking-tight text-foreground">
                {step.label}
              </h3>
              <p className="text-[13.5px] leading-[1.55] text-muted-foreground/70 max-w-xs">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
