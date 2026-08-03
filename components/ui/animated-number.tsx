"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AnimatedNumberProps = {
  value: number | null | undefined;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  /** Format negatively with leading minus sign */
  signed?: boolean;
};

/**
 * AnimatedNumber — count-up animation on first mount and on value change.
 * Uses requestAnimationFrame for smoothness. Skips animation when value is null.
 */
export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  className,
  duration = 600,
  signed = false,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState<number>(value ?? 0);
  const prevRef = useRef<number>(value ?? 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const delta = to - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + delta * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  if (value === null || value === undefined) {
    return <span className={cn("text-muted", className)}>—</span>;
  }

  const _formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = signed && display > 0 ? "+" : display < 0 ? "-" : "";

  return (
    <span className={cn("font-tabular", className)}>
      {sign}
      {prefix}
      {Math.abs(display).toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
