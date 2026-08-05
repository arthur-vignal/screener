import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Apply hover lift effect */
  interactive?: boolean;
  /** Inset surface (deeper) instead of default */
  inset?: boolean;
  /** Padding override (default: p-4) */
  padding?: "none" | "sm" | "md" | "lg";
  children?: ReactNode;
};

const PAD_MAP = {
  none: "p-0",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
};

/**
 * Card — base panel with optional hover lift.
 * Default: dark surface. Inset: deeper surface.
 */
export function Card({
  className,
  interactive = false,
  inset = false,
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        inset ? "panel-inset" : "panel",
        PAD_MAP[padding],
        interactive && "hover-lift cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}
