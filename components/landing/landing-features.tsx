"use client";

/**
 * LandingFeatures — 3 cards .fey-card com features reais do Sulfur.
 *
 * Features:
 *   1. Análise fundamentalista — preço, P/L, ROE, valuation vs setor
 *   2. Forecast quant — projeção 6M com modelo HistGBM especialista por regime SELIC
 *   3. Carteira personalizada — holdings + sincronização de ticker favoritados
 *
 * Layout:
 *   - centralizado vertical+horizontal
 *   - max-w-[1100px] (3 cards cabem em 1280px+)
 *   - grid-cols-1 md:grid-cols-3
 *   - ícone: lucide (sem emojis)
 */

import { LineChart, TrendingUp, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: LineChart,
    title: "Análise fundamentalista",
    desc:
      "P/L, ROE, valuation bands do subsetor e preço justo implícito em EPS LTM × média 5a.",
  },
  {
    icon: TrendingUp,
    title: "Forecast quant",
    desc:
      "Projeção 6 meses com modelo especialista por regime SELIC. Banda calibrada em volatilidade empírica.",
  },
  {
    icon: Briefcase,
    title: "Carteira personalizada",
    desc:
      "Holdings por ativo, custo médio e mark-to-market em tempo real. Autenticação segura.",
  },
] as const;

export function LandingFeatures() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <h2
        className={cn(
          "mb-12 text-center font-display font-black",
          "tracking-[-0.02em] text-foreground",
          "text-balance text-[clamp(1.75rem,4vw,3rem)]",
        )}
      >
        Tudo que você precisa pra decidir uma ação.
      </h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <article
            key={title}
            className={cn(
              "fey-card flex flex-col gap-3 rounded-2xl p-6",
              "transition-transform hover:-translate-y-1",
            )}
          >
            <Icon className="h-6 w-6 text-foreground/70" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-pretty text-sm leading-snug text-muted-foreground">
              {desc}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
