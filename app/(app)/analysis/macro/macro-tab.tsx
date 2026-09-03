"use client";

/**
 * MacroTab — primeira aba do /analysis.
 *
 * Estrutura vertical inspirada no print 2 do chart-pack-references
 * (Fey mobbin), adaptada pra BR com os 4 cards que o usuário pediu:
 *
 *   1. News | Chart carousel      → grid 2-cols (60% / 40%)
 *   2. MacroIndicesList         → full-width
 *   3. MacroCalendar            → full-width (com split Today/Upcoming)
 *
 * Card "Macro overview" do Fey (resumo macro textual) ainda não tem
 * contraparte no nosso feed — pode entrar como header da News ou como
 * sub-card futuro.
 *
 * Layout responsivo:
 *   - >= lg: 2-col grid nas linhas 1 e indicators full-width
 *   - < lg: stack vertical (todos os cards viram full-width)
 */

import { motion, type Variants } from "motion/react";
import type { JSX } from "react";

import { MacroNewsCard } from "./macro-news-card";
import { MacroChartCarousel } from "./macro-chart-carousel";
import { MacroIndicesList } from "./macro-indices-list";
import { MacroCalendar } from "./macro-calendar";
import { cn } from "@/lib/utils";

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
      {/* Linha 1: News (60%) + Chart carousel (40%) */}
      <motion.div
        variants={itemVariants as any}
        className={cn(
          "grid grid-cols-1 gap-5",
          "lg:grid-cols-[3fr_2fr]",
        )}
      >
        <MacroNewsCard />
        <MacroChartCarousel />
      </motion.div>

      {/* Linha 2: Lista de índices B3 full-width */}
      <motion.div variants={itemVariants as any}>
        <MacroIndicesList />
      </motion.div>

      {/* Linha 3: Calendário econômico full-width */}
      <motion.div variants={itemVariants as any}>
        <MacroCalendar />
      </motion.div>
    </motion.section>
  );
}
