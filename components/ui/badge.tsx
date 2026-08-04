import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "negative" | "warning" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-elevated text-muted border border-hairline",
  positive: "bg-positive-soft text-positive border border-positive/20 glow-cyan",
  negative: "bg-negative-soft text-negative border border-negative/20 glow-red",
  warning: "bg-warning/10 text-warning border border-warning/20",
  brand: "bg-brand-soft text-brand-bright border border-brand/20 glow-mint",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "status-dot inline-block text-positive",
        "animate-pulse-ring",
        className,
      )}
    />
  );
}
