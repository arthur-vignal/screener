"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ACCENT_GRADIENTS: Record<string, string> = {
  orange:
    "linear-gradient(135deg, rgba(232,147,91,0.85) 0%, rgba(232,147,91,0) 50%)",
  purple:
    "linear-gradient(135deg, rgba(167,139,250,0.85) 0%, rgba(167,139,250,0) 50%)",
  teal: "linear-gradient(135deg, rgba(63,191,176,0.85) 0%, rgba(63,191,176,0) 50%)",
  olive:
    "linear-gradient(135deg, rgba(201,196,106,0.85) 0%, rgba(201,196,106,0) 50%)",
  mint: "linear-gradient(135deg, rgba(52,211,153,0.85) 0%, rgba(52,211,153,0) 50%)",
  coral:
    "linear-gradient(135deg, rgba(242,85,95,0.85) 0%, rgba(242,85,95,0) 50%)",
};

const ACCENT_BG: Record<string, string> = {
  orange: "radial-gradient(circle at 50% 0%, rgba(232,147,91,0.18), transparent 70%)",
  purple: "radial-gradient(circle at 50% 0%, rgba(167,139,250,0.18), transparent 70%)",
  teal: "radial-gradient(circle at 50% 0%, rgba(63,191,176,0.18), transparent 70%)",
  olive: "radial-gradient(circle at 50% 0%, rgba(201,196,106,0.18), transparent 70%)",
  mint: "radial-gradient(circle at 50% 0%, rgba(52,211,153,0.18), transparent 70%)",
  coral: "radial-gradient(circle at 50% 0%, rgba(242,85,95,0.18), transparent 70%)",
};

/**
 * CometCard — feature card with a corner-glow accent + hairline border
 * + ambient top radial. Inspired by the aceternity "comet card" demo.
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
  accent?: keyof typeof ACCENT_GRADIENTS;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5",
        "transition-transform duration-300",
        "hover:-translate-y-0.5",
        className,
      )}
      style={{
        background: "#131316",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Top ambient glow tinted with accent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: ACCENT_BG[accent] }}
      />
      {/* Comet streak — gradient line on top-left corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-px -top-px h-[120px] w-[120px] rounded-full blur-md"
        style={{
          background: ACCENT_GRADIENTS[accent],
          opacity: 0.55,
        }}
      />
      {/* Subtle inner top highlight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
        }}
      />
      <div className="relative">
        <h3 className="font-display text-[18px] tracking-[-0.02em] text-white">
          {title}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#9a9ba3]">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
