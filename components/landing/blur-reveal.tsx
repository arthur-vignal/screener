"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tag = "span" | "h1" | "h2" | "p" | "div";

/**
 * BlurReveal — text starts blurred and reveals to sharp on mount (or
 * when scrolled into view if `delay > 0`). Pure CSS animation.
 */
export function BlurReveal({
  children,
  delay = 0,
  className,
  as = "span",
}: {
  children: string;
  delay?: number;
  className?: string;
  as?: Tag;
}) {
  const ref = useRef<HTMLSpanElement | HTMLHeadingElement | HTMLParagraphElement | HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (delay === 0) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  const style = {
    filter: visible ? "blur(0px)" : "blur(18px)",
    opacity: visible ? 1 : 0.5,
    transform: visible ? "translateY(0)" : "translateY(8px)",
    transition: "filter 1.2s ease, opacity 1s ease, transform 1s ease",
    transitionDelay: `${delay}ms`,
    willChange: "filter, opacity, transform" as const,
  };

  if (as === "h1") {
    return (
      <h1 ref={ref as React.Ref<HTMLHeadingElement>} className={cn("inline-block", className)} style={style}>
        {children}
      </h1>
    );
  }
  if (as === "h2") {
    return (
      <h2 ref={ref as React.Ref<HTMLHeadingElement>} className={cn("inline-block", className)} style={style}>
        {children}
      </h2>
    );
  }
  if (as === "p") {
    return (
      <p ref={ref as React.Ref<HTMLParagraphElement>} className={cn("inline-block", className)} style={style}>
        {children}
      </p>
    );
  }
  if (as === "div") {
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className={cn("inline-block", className)} style={style}>
        {children}
      </div>
    );
  }
  return (
    <span ref={ref as React.Ref<HTMLSpanElement>} className={cn("inline-block", className)} style={style}>
      {children}
    </span>
  );
}
