"use client";

import { useRef, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * LiquidGlassButton — translucent pill CTA. Inner top highlight +
 * backdrop-filter blur + saturated border + mouse-following radial
 * gradient halo. Rounded full by default.
 */
export function LiquidGlassButton({
  children,
  className,
  variant = "default",
  onClick,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "ghost";
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [halo, setHalo] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setHalo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  }

  const baseStyle: React.CSSProperties =
    variant === "ghost"
      ? {
          background: "rgba(255,255,255,0.03)",
          color: "var(--foreground, #f5f5f7)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)",
        }
      : {
          background: "rgba(255,255,255,0.08)",
          color: "var(--foreground, #f5f5f7)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 30px rgba(0,0,0,0.35)",
        };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseEnter={() => setHalo((h) => ({ ...h, active: true }))}
      onMouseLeave={() => setHalo((h) => ({ ...h, active: false }))}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3",
        "text-sm font-semibold tracking-tight whitespace-nowrap",
        "transition-all duration-300",
        "active:scale-[0.98]",
        className,
      )}
      style={baseStyle}
      {...rest}
    >
      {/* Mouse-following gradient halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-200"
        style={{
          background:
            halo.active
              ? `radial-gradient(220px circle at ${halo.x}px ${halo.y}px, rgba(167,139,250,0.35), rgba(232,147,91,0.20) 35%, transparent 65%)`
              : "transparent",
          opacity: halo.active ? 1 : 0,
        }}
      />
      {/* Animated gradient border on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] rounded-full transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(135deg, rgba(167,139,250,0.55), rgba(232,147,91,0.45), rgba(63,191,176,0.45), rgba(167,139,250,0.55))",
          WebkitMask:
            "linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
          opacity: halo.active ? 1 : 0,
        }}
      />
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}
