"use client";

/**
 * LandingPlanos — 3 tiers de pricing (Free / Pro / Ultra).
 *
 * Especificação Arthur (2026-09-12):
 *   - Tiers: Free (R$0, beta) / Pro (R$29,90) / Ultra (R$59,90)
 *   - Cada card: nome, preço, descrição, lista de features, CTA → /login
 *   - Pro = destaque com ring brand e badge "Mais escolhido"
 *
 * Regra explícita: TODOS os CTAs encaminham /login.
 * Sem modal de signup, sem Stripe — placeholder de pagamento em fase futura.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  badge?: string;
  price: string;
  priceCents: string;
  cadence: string;
  description: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    badge: "Beta",
    priceCents: "0",
    price: "R$ 0",
    cadence: "para sempre",
    description:
      "Tudo que você precisa pra começar a acompanhar o mercado.",
    features: [
      "Página /home com cotações e notícias",
      "Notícias com chips de tickers detectados",
      "Acesso à raiz de qualquer ativo (/asset/[t])",
      "Drilldown fundamentalista (/analysis)",
    ],
  },
  {
    name: "Pro",
    badge: "Mais escolhido",
    priceCents: "90",
    price: "R$ 29",
    cadence: "/ mês",
    description:
      "Pra quem decide com carteira. Forecast quantitativo e tudo do Free.",
    features: [
      "Tudo do Free",
      "Forecast 6m calibrado em volatilidade empírica",
      "Carteiras personalizadas (multi-portfolio)",
      "Holdings com custo médio e mark-to-market",
      "Alertas de preço por ativo",
    ],
    highlight: true,
  },
  {
    name: "Ultra",
    badge: "Pro",
    priceCents: "90",
    price: "R$ 59",
    cadence: "/ mês",
    description:
      "Acesso total e ferramentas pra quem opera com volume.",
    features: [
      "Tudo do Pro",
      "Acesso à API REST do Sulfur",
      "Export de dados fundamentalistas em CSV",
      "Alertas customizados (múltiplas condições)",
      "Suporte prioritário",
    ],
  },
];

export function LandingPlanos() {
  return (
    <section
      id="planos"
      className="relative w-full px-6 py-24 lg:py-32"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 lg:gap-16">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-3 text-center lg:gap-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Planos
          </span>
          <h2
            className="text-balance text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-roboto-slab)", color: "#f5e9d3" }}
          >
            Comece <span className="font-black">grátis.</span>{" "}
            <span className="font-medium">Evolua quando fizer sentido.</span>
          </h2>
        </div>

        {/* Grid 3-col */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-7">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative flex flex-col gap-6 rounded-3xl p-8",
                "border bg-white/[0.02] transition-colors",
                plan.highlight
                  ? "border-white/15 bg-white/[0.04] ring-1 ring-white/[0.08]"
                  : "border-white/[0.06]",
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <span
                  className={cn(
                    "absolute -top-3 left-8 inline-flex items-center rounded-full",
                    "px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    plan.highlight
                      ? "bg-foreground text-background"
                      : "border border-white/[0.1] bg-white/[0.04] text-muted-foreground",
                  )}
                >
                  {plan.badge}
                </span>
              )}

              {/* Nome + preço */}
              <header className="flex flex-col gap-3">
                <h3
                  className="text-[clamp(1.5rem,2.5vw,1.875rem)] leading-tight tracking-[-0.01em]"
                  style={{
                    fontFamily: "var(--font-roboto-slab)",
                    color: "#f5e9d3",
                  }}
                >
                  <span className="font-medium">{plan.name}</span>
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-foreground/85">
                    ,{plan.priceCents}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    {plan.cadence}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>
              </header>

              {/* Divider */}
              <div className="h-px w-full bg-white/[0.06]" />

              {/* Features */}
              <ul className="flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/85"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full",
                  "h-11 px-6 text-sm font-semibold tracking-tight transition-opacity hover:opacity-90",
                  plan.highlight
                    ? "bg-foreground text-background"
                    : "border border-white/[0.12] bg-white/[0.04] text-foreground hover:bg-white/[0.08]",
                )}
              >
                Entrar
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
