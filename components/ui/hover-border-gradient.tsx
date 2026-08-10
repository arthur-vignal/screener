"use client";

import React, { useState, useEffect, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * HoverBorderGradient — official aceternity demo. Rotating conic-
 * gradient border that is masked onto a button/div. The gradient is
 * hidden by default and revealed on hover via opacity transition.
 *
 * Optional children appear inside the inner surface. Optional
 * containerClassName targets the outer (button) wrapper.
 */
type AsProp = "button" | "a" | "div";

export function HoverBorderGradient({
  children,
  className,
  containerClassName,
  as = "button",
  duration = 1,
  clockwise = true,
  ...props
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  as?: AsProp;
  duration?: number;
  clockwise?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className"> &
  Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  const Tag = as as "button";
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<"TOP" | "LEFT" | "BOTTOM" | "RIGHT">(
    "TOP",
  );

  const rotateDirection = (currentDirection: "TOP" | "LEFT" | "BOTTOM" | "RIGHT"): "TOP" | "LEFT" | "BOTTOM" | "RIGHT" => {
    const directions: Array<"TOP" | "LEFT" | "BOTTOM" | "RIGHT"> = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = clockwise
      ? (currentIndex - 1 + directions.length) % directions.length
      : (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const movingMap: Record<"TOP" | "LEFT" | "BOTTOM" | "RIGHT", string> = {
    TOP: "radial-gradient(20.7% 50% at 50% 0%, hsl(0,0%,100%) 0%, rgba(255,255,255,0) 100%)",
    LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, hsl(0,0%,100%) 0%, rgba(255,255,255,0) 100%)",
    BOTTOM:
      "radial-gradient(20.7% 50% at 50% 100%, hsl(0,0%,100%) 0%, rgba(255,255,255,0) 100%)",
    RIGHT:
      "radial-gradient(16.2% 41.199999999999996% at 100% 50%, hsl(0,0%,100%) 0%, rgba(255,255,255,0) 100%)",
  };

  const highlight =
    "radial-gradient(75% 181.15942028985506% at 50% 50%, #3275F8 0%, rgba(255, 255, 255, 0) 100%)";

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => {
        setDirection((prevState) => rotateDirection(prevState));
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [hovered, duration]);

  return (
    <Tag
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative isolate inline-flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-transparent text-sm transition duration-200 hover:bg-white/[0.04]",
        containerClassName,
      )}
      style={{
        ...props.style,
      }}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <div
        className={cn(
          "absolute inset-0 z-0 overflow-hidden rounded-full [mask-image:radial-gradient(ellipse_at_center,white,transparent)]",
        )}
        style={{
          ...(props.style as React.CSSProperties),
          opacity: hovered ? 1 : 0,
          transition: `opacity ${duration * 0.5}s ease`,
        }}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 z-[-1] [mask-image:linear-gradient(white,white)]",
          )}
          style={{
            backgroundImage: movingMap[direction],
            animationDuration: `${duration}s`,
          }}
        />
        <div
          className="absolute inset-0 z-[-1]"
          style={{
            backgroundImage: highlight,
            animationDuration: `${duration}s`,
          }}
        />
      </div>
      <div className={cn("relative z-10", className)}>{children}</div>
    </Tag>
  );
}
