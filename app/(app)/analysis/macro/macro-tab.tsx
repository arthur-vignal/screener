"use client";

/**
 * MacroTab — primeira aba do /analysis.
 *
 * Estrutura vertical (full-width):
 *   1. MacroNewsCard    — lista de notícias macro (top-5 cards verticais)
 *   2. MacroChartCarousel — 1 chart grande com auto-rotação 5s entre
 *      SELIC, IPCA, IBC-Br (3 charts pricipais). Setas manuais.
 *   3. MacroIndicesList — tabela de índices B3 (YTD), personalizável
 *      com add/remove + localStorage.
 *   4. MacroCalendar    — calendário econômico (eventos BR hardcoded).
 *
 * Cards herdam estilo glyph:
 *   - Background dark + border border-white/5
 *   - Padding generoso (24-32px)
 *   - Cantos arredondados rounded-2xl
 *   - Header: 12px uppercase tracking-[0.18em] font-semibold muted
 *
 * Inspirado no layout 07 do chart-pack-references.
 */

import { motion, type Variants } from "motion/react";
import type { JSX } from "react";

import { MacroNewsCard } from "./macro-news-card";
import { MacroChartCarousel } from "./macro-chart-carousel";
import { MacroIndicesList } from "./macro-indices-list";
import { MacroCalendar } from "./macro-calendar";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export function MacroTab(): JSX.Element {
  return (
    <motion.section
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variants={listVariants as any}
      initial="hidden"
      animate="show"
      aria-label="Análise macro"
      className="flex flex-col gap-5"
    >
      <motion.div variants={itemVariants as any}>
        <MacroNewsCard />
      </motion.div>

      <motion.div variants={itemVariants as any}>
        <MacroChartCarousel />
      </motion.div>

      <motion.div variants={itemVariants as any}>
        <MacroIndicesList />
      </motion.div>

      <motion.div variants={itemVariants as any}>
        <MacroCalendar />
      </motion.div>
    </motion.section>
  );
}
