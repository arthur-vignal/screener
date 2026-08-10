"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

const ACCENT = {
  orange: { rgb: "232,147,91", hex: "#e8935b" },
  purple: { rgb: "167,139,250", hex: "#a78bfa" },
  teal: { rgb: "63,191,176", hex: "#3fbfb0" },
  olive: { rgb: "201,196,106", hex: "#c9c46a" },
  mint: { rgb: "52,211,153", hex: "#34d399" },
  coral: { rgb: "242,85,95", hex: "#f2555f" },
} as const;

type Accent = keyof typeof ACCENT;

/**
 * CometCard — official-feel card. Hairline border, ambient top radial,
 * and a spotlight gradient that follows the cursor. The accent color
 * also animates a "comet streak" line at the top-left.
 */
export function CometCard({
  title,
  description,
  accent = "teal",
  className,
  children,
}: {
  title: string;
  description: string;
  accent?: Accent;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const mx = useMotionValue(50);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 25 });
  const sy = useSpring(my, { stiffness: 200, damping: 25 });
  const spotlight = useTransform(
    [sx, sy],
    ([px, py]) =>
      `radial-gradient(220px circle at ${px}% ${py}%, rgba(${ACCENT[accent].rgb}, 0.22), transparent 65%)`,
  );

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    mx.set(px);
    my.set(py);
  }

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={onMove}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5",
        className,
      )}
      style={{
        background: "#131316",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Mouse-following spotlight */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background: spotlight,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Comet streak — animated diagonal line top-left to bottom-right */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full blur-md"
        style={{ background: `rgba(${ACCENT[accent].rgb}, 0.45)` }}
        animate={{
          x: hovered ? [0, 80, 0] : [0, 30, 0],
          y: hovered ? [0, 80, 0] : [0, 30, 0],
          opacity: hovered ? [0.6, 0.9, 0.6] : [0.4, 0.5, 0.4],
        }}
        transition={{
          duration: hovered ? 1.6 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Top highlight line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
        }}
      />

      <div className="relative">
        {/* Accent dot */}
        <div
          className="w-1.5 h-1.5 rounded-full mb-3"
          style={{
            background: ACCENT[accent].hex,
            boxShadow: `0 0 12px ${ACCENT[accent].hex}`,
          }}
        />
        <h3 className="font-display text-[18px] tracking-[-0.02em] text-white leading-tight">
          {title}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#9a9ba3]">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </motion.div>
  );
}
