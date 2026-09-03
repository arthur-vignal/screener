"use client";

/**
 * AnalysisTabs — controla estado da tab ativo pra /analysis.
 *
 * Tab pattern inspirado em Fey: pills no canto superior direito do
 * header, com fill cinza-8% quando ativo (vide typography pack 01).
 *
 * Estado fica em URL search param pra deep-link e SSR correto.
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
      {/* Sub-tabs (top-right pill bar inspired by Fey) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">
            Análise
          </span>
        </div>
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
