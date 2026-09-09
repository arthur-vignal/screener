"use client";

/**
 * LandingFeatures — 3 cards full-width mostrando features do produto.
 *
 * Cards usam `.fey-card` (sistema visual do projeto, §35 sulfur-design-hardening):
 * - card mais escuro que o body (efeito recesso)
 * - gradient vertical próprio
 * - 2-layer box-shadow pra profundidade
 * - SEM borda
 * - SEM subtítulo (regra §13.2)
 *
 * Cada card: ícone lucide + título + 1 linha de copy tight + preview embaixo
 * (mini-chart real ou statsummary).
 */

import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  LineChart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "motion/react";

import { SparklinePreview } from "@/components/landing/sparkline-preview";
import { CalendarPreview } from "@/components/landing/calendar-preview";
import { ValuationPreview } from "@/components/landing/valuation-preview";
import { cn } from "@/lib/utils";

type Feature = {
  title: string;
  copy: string;
  icon: LucideIcon;
  href: string;
  cta: string;
  preview: ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: "Carteiras",
    copy: "Acompanhe qty, preço médio e variação dos seus ativos em tempo real.",
    icon: LineChart,
    href: "/portfolio",
    cta: "Explorar carteiras",
    preview: <SparklinePreview />,
  },
  {
    title: "Valuation",
    copy: "P/L, EV/EBITDA, P/VP com banda empírica do subsetor — não chute de IA.",
    icon: BarChart3,
    href: "/asset/PETR4/valuation",
    cta: "Ver valuation",
    preview: <ValuationPreview />,
  },
  {
    title: "Calendar",
    copy: "Copom, IPCA, IBC-Br e dividendos das suas carteiras num só lugar.",
    icon: CalendarClock,
    href: "/portfolio",
    cta: "Ver calendar",
    preview: <CalendarPreview />,
  },
];

export function LandingFeatures() {
  return (
    <section id="recursos" className="px-6 lg:px-12 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="mb-12 lg:mb-16 max-w-2xl">
          <p className="text-foreground/70 text-[11px] font-semibold tracking-[0.18em] uppercase mb-4">
            Recursos
          </p>
          <h2 className="text-[32px] lg:text-[44px] font-semibold tracking-tight leading-[1.1] text-foreground">
            Tudo que você precisa pra decidir com método.
          </h2>
        </header>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
          }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((feat) => (
            <motion.article
              key={feat.title}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="rounded-2xl fey-card overflow-hidden p-7 lg:p-8 flex flex-col"
            >
              <feat.icon
                className="h-6 w-6 text-foreground/85 mb-5"
                strokeWidth={1.75}
              />
              <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
                {feat.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-muted-foreground/70">
                {feat.copy}
              </p>
              <div className="mt-7 flex-1 min-h-[180px]">{feat.preview}</div>
              <Link
                href={feat.href}
                className={cn(
                  "mt-7 inline-flex items-center gap-1.5",
                  "text-[13px] font-medium text-foreground",
                  "hover:opacity-80 transition-opacity",
                )}
              >
                {feat.cta}
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
