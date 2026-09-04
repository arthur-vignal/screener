"use client";

/**
 * AnalysisTabs — controla estado da tab ativo pra /analysis.
 *
 * Tab pattern inspirado em Fey: pills no canto superior direito do
 * header, com fill cinza-8% quando ativo (vide typography pack 01).
 *
 * Estado fica em URL search param pra deep-link e SSR correto.
 *
 * Header: título "Análise" como display 32px semibold (Calibre/
 * Manrope stack) no canto sup. esquerdo. Sem label prependida —
 * segue §13.2 do sulfur-ui-rules (zero subtítulos em headers).
 */

import { motion, type Variants } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

import { MacroTab } from "./macro/macro-tab";
import { MarketsTab } from "./markets/markets-tab";

type TabId = "macro" | "markets";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "macro", label: "Macro" },
  { id: "markets", label: "Mercados" },
];

const parentVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export function AnalysisTabs() {
  const router = useRouter();
  const params = useSearchParams();
  const active = (params.get("tab") as TabId | null) ?? "macro";

  const setTab = useCallback(
    (id: TabId) => {
      const next = new URLSearchParams(params.toString());
      next.set("tab", id);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header: title + tabs no canto direito */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground leading-[1.1]">
          Análise
        </h1>
        <nav
          className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]"
          aria-label="Seções da análise"
        >
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={isActive}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12px] font-medium",
                  "transition-colors",
                  isActive
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <motion.div
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={parentVariants as any}
        initial="hidden"
        animate="show"
      >
        {active === "macro" ? <MacroTab /> : <MarketsTab />}
      </motion.div>
    </div>
  );
}
