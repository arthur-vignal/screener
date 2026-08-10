"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * LiquidGlassButton — official-feel glassmorphic CTA. Translucent fill,
 * inner top highlight, mouse-following gradient halo, plus a subtle
 * animated shimmer band that travels across the surface on hover.
 */
export function LiquidGlassButton({
  children,
  className,
  onClick,
  ...rest
}: HTMLMotionProps<"button"> & {
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 250, damping: 30 });
  const springY = useSpring(y, { stiffness: 250, damping: 30 });
  const haloBg = useTransform(
    [springX, springY],
    ([vx, vy]) =>
      `radial-gradient(220px circle at ${vx}px ${vy}px, rgba(167,139,250,0.55), rgba(232,147,91,0.30) 30%, transparent 65%)`,
  );

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3.5",
        "text-[15px] font-medium tracking-tight text-white",
        "transition-colors duration-300",
        className,
      )}
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(16px) saturate(160%)",
        WebkitBackdropFilter: "blur(16px) saturate(160%)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 30px rgba(0,0,0,0.35)",
      }}
      {...rest}
    >
      {/* Mouse-following halo (only on hover) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] rounded-full opacity-0 transition-opacity duration-200"
        style={{ background: haloBg, opacity: hovered ? 1 : 0 }}
      />

      {/* Animated gradient border that "lights up" on hover */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] rounded-full"
        style={{
          background:
            "linear-gradient(135deg, rgba(167,139,250,0.55), rgba(232,147,91,0.45), rgba(63,191,176,0.45), rgba(167,139,250,0.55)) border-box",
          WebkitMask:
            "linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
          opacity: hovered ? 1 : 0,
          transition: "opacity 280ms ease",
        }}
      />

      {/* Shimmer wave that travels across on hover */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.20) 50%, transparent 70%)",
        }}
        initial={{ x: "-120%" }}
        animate={{ x: hovered ? "120%" : "-120%" }}
        transition={{ duration: 1.0, ease: "easeOut" }}
      />

      <span className="relative z-[1] inline-flex items-center gap-1.5">
        {children}
      </span>
    </motion.button>
  );
}
