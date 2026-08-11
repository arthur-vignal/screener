"use client";

/**
 * MetallicCard — wrapper that gives any child the "brushed silver /
 * dark chrome" surface look. Combines a layered linear-gradient
 * background with a slow shimmer animation and an inset hairline
 * at the top edge to imply depth.
 *
 * Usage:
 *   <MetallicCard>
 *     <CardHeader title="..." />
 *     ...
 *   </MetallicCard>
 */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function MetallicCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg, #08090c 0%, #15161b 30%, #0d0e12 55%, #1c1d22 80%, #07080b 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.45)",
      }}
    >
      {/* Brushed-metal sheen (top-down highlight) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 18%, rgba(255,255,255,0) 82%, rgba(255,255,255,0.015) 100%)",
        }}
      />



      <div className="relative z-[1] h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
}