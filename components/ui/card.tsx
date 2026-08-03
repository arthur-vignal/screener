import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Apply hover lift effect */
  interactive?: boolean;
  /** Inset surface (deeper) instead of default */
  inset?: boolean;
  children?: ReactNode;
};

/**
 * Card — base panel with optional hover lift.
 * Default: dark surface. Inset: deeper surface.
 */
export function Card({
  className,
  interactive = false,
  inset = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        inset ? "panel-inset" : "panel",
        "p-5",
        interactive && "hover-lift cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}
