"use client";

/**
 * LiquidGlassHoverButton — translucent glassmorphic CTA with an
 * animated conic-gradient border that lights up on hover. Source:
 * the hover-border-gradient pattern from aceternity/21st, layered
 * with the existing LiquidGlassButton halo + backdrop blur.
 *
 * The conic gradient rotates while the cursor is inside the button.
 * Combine it with the existing mouse-following radial halo for a
 * layered "liquid glass + outline" effect.
 */
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function LiquidGlassHoverButton({
  children,
  className,
  href = "#",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  }

  return (
    <Link
      href={href}
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={onMove}
      className={cn(
        "group relative inline-flex items-center justify-center rounded-full",
        "px-8 py-3.5 text-sm font-medium tracking-[0.18em] uppercase text-white",
        "transition-all duration-300",
        className,
      )}
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(18px) saturate(180%)",
        WebkitBackdropFilter: "blur(18px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      {/* Mouse-following radial halo (always-on, stronger on hover) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-200"
        style={{
          background:
            hovered
              ? `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, rgba(167,139,250,0.45), rgba(232,147,91,0.25) 35%, transparent 65%)`
              : "transparent",
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Animated conic gradient border, masked onto a 1px padding */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] rounded-full"
        style={{
          background:
            "conic-gradient(from var(--angle, 0deg), rgba(167,139,250,0.95), rgba(232,147,91,0.85), rgba(63,191,176,0.85), rgba(199, 125, 255, 0.85), rgba(167,139,250,0.95))",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1.5px",
          opacity: hovered ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
        animate={{
          ["--angle" as any]: hovered ? "360deg" : "0deg",
        } as any}
        transition={{ duration: 1.4, ease: "linear", repeat: hovered ? Infinity : 0 }}
      />

      <span className="relative z-[1] inline-flex items-center gap-2">
        {children}
      </span>
    </Link>
  );
}
