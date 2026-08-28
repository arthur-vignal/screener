"use client";

/**
 * StaggerOnMount — wrapper que anima children ao montar.
 *
 * Padrão da skill advanced-react-motion-auth-flows §5:
 *   - parent define `staggerChildren` no variants
 *   - child tem variants `hidden` / `show`
 *   - fade + slide-up com cubic-bezier ease (não linear)
 *
 * Uso:
 *   <motion.main initial="hidden" animate="show" variants={parentVariants}>
 *     <StaggerOnMount><CardA /></StaggerOnMount>
 *     <StaggerOnMount><CardB /></StaggerOnMount>
 *   </motion.main>
 */

import { motion, type Variants } from "motion/react";
import type { JSX, ReactNode } from "react";

export const staggerParentVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

export const staggerChildVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function StaggerOnMount({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <motion.div
      className={className}
      variants={staggerChildVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}
