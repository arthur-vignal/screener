"use client";

/**
 * LandingPlanos — pricing com seletor Mensal/Anual + scroll fade-in.
 *
 * Spec Arthur (2026-09-13):
 *   - Seletor Mensal/Anual arredondado estilo liquid glass
 *     com bolha animada que desliza entre as opções.
 *   - Animação React (motion) nos cards surgindo gradualmente
 *     conforme scroll (useInView + stagger).
 *   - Cards Free / Pro / Ultra com valores placeholder.
 *   - Pro destacado (badge + ring brand).
 *   - Todos os CTAs → /login.
 */

import Link from "next/link";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Cadence = "monthly" | "annual";

type Plan = {
  name: string;
  badge?: string;
  description: string;
  features: string[];
  highlight?: boolean;
  /** Preço mensal exibido (placeholder até billing ser real) */
  monthly: string;
  /** Preço anual exibido (com desconto placeholder) */
  annual: string;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    badge: "Beta",
    monthly: "R$ 0",
    annual: "R$ 0",
    description: "Tudo que você precisa pra começar a acompanhar o mercado.",
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
    monthly: "R$ 29,90",
    annual: "R$ 24,90",
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
    monthly: "R$ 59,90",
    annual: "R$ 49,90",
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

function BillingToggle({
  value,
  onChange,
}: {
  value: Cadence;
  onChange: (v: Cadence) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Período de cobrança"
      className="relative inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.04] p-1 backdrop-blur-md"
      style={{
        boxShadow:
          "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 1px 2px 0 rgba(0,0,0,0.4)",
      }}
    >
      {/* Liquid glass bolha deslizante */}
      <motion.div
        aria-hidden="true"
        layout
        layoutId="billing-toggle-indicator"
        className="absolute inset-y-1 rounded-full bg-white/90"
        style={{
          width: "calc(50% - 4px)",
          left: value === "monthly" ? 4 : "calc(50% + 0px)",
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      />

      <button
        role="radio"
        aria-checked={value === "monthly"}
        onClick={() => onChange("monthly")}
        className={cn(
          "relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors",
          value === "monthly" ? "text-background" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Mensal
      </button>
      <button
        role="radio"
        aria-checked={value === "annual"}
        onClick={() => onChange("annual")}
        className={cn(
          "relative z-10 inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-colors",
          value === "annual" ? "text-background" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Anual
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.10em]",
            value === "annual"
              ? "bg-foreground/15 text-background/80"
              : "bg-white/[0.08] text-muted-foreground",
          )}
        >
          −17%
        </span>
      </button>
    </div>
  );
}

function PlanCard({
  plan,
  cadence,
  index,
}: {
  plan: Plan;
  cadence: Cadence;
  index: number;
}) {
  const price = cadence === "monthly" ? plan.monthly : plan.annual;
  const cadenceLabel = cadence === "monthly" ? "/ mês" : "/ ano";

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.08 * index,
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "relative flex flex-col gap-6 rounded-3xl p-10",
        "border bg-[#0c0d10] transition-colors",
        plan.highlight
          ? "border-white/20 bg-[#15171c] ring-1 ring-white/[0.10]"
          : "border-white/[0.08]",
      )}
    >
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

      <header className="flex flex-col gap-3">
        <h3
          className="text-[clamp(1.5rem,2.5vw,1.875rem)] leading-tight tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-roboto-slab)", color: "#f5e9d3" }}
        >
          <span className="font-medium">{plan.name}</span>
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-foreground">
            {price}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">{cadenceLabel}</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {plan.description}
        </p>
      </header>

      <div className="h-px w-full bg-white/[0.06]" />

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
        Assinar
      </Link>
    </motion.article>
  );
}

export function LandingPlanos() {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="planos"
      className="relative w-full px-6 py-24 lg:py-32"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-12 lg:gap-16">
        {/* Toggle Mensal/Anual */}
        <BillingToggle value={cadence} onChange={setCadence} />

        {/* Grid 3-col com fade-in no scroll */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid w-full grid-cols-1 gap-8 md:grid-cols-3 lg:gap-9"
        >
          {PLANS.map((plan, idx) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              cadence={cadence}
              index={idx}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
