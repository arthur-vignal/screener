"use client";

import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * LiquidGlassButton — primary CTA on the landing page. Translucent fill
 * with animated hover border gradient (moves on cursor proximity).
 *
 * Hover effect: a conic-gradient border that follows the cursor angle.
 */
export function LiquidGlassButton({
  children,
  className,
  onClick,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  }

  return (
    <button
      ref={ref}
      type={type}
      onMouseMove={onMove}
      onMouseEnter={() => setPos((p) => ({ ...p, active: true }))}
      onMouseLeave={() => setPos((p) => ({ ...p, active: false }))}
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3.5",
        "text-[15px] font-medium tracking-tight",
        "text-white",
        "transition-transform duration-300",
        "active:scale-[0.98]",
        className,
      )}
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 30px rgba(0,0,0,0.35)",
      }}
      {...rest}
    >
      {/* Hover gradient halo that follows the cursor. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] rounded-full opacity-0 transition-opacity duration-300"
        style={{
          background:
            pos.active && pos.x !== 0 && pos.y !== 0
              ? `radial-gradient(180px circle at ${pos.x}px ${pos.y}px, rgba(167,139,250,0.55), rgba(232,147,91,0.30) 35%, transparent 70%)`
              : "transparent",
          opacity: pos.active ? 1 : 0,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          border: "1px solid transparent",
          background:
            "linear-gradient(135deg, rgba(167,139,250,0.40), rgba(232,147,91,0.30), rgba(63,191,176,0.30)) border-box",
          WebkitMask:
            "linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          opacity: pos.active ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}
