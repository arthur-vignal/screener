import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-medium select-none transition-all duration-150 press disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-bright shadow-[0_0_0_0_var(--brand)] hover:shadow-[0_0_0_4px_var(--brand-soft)]",
  secondary:
    "bg-surface-elevated text-ink hover:bg-surface-strong border border-hairline hover:border-hairline-strong",
  ghost: "text-ink hover:bg-surface-elevated",
  danger: "bg-negative text-on-brand hover:bg-negative/90",
  outline:
    "bg-transparent text-ink border border-hairline-strong hover:border-ink hover:bg-surface-elevated",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-6 text-base rounded-md",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...props}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
}) {
  return (
    <Link
      href={href}
      {...props}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </Link>
  );
}

export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-md text-muted hover:text-ink hover:bg-surface-elevated transition-colors press",
        className,
      )}
    >
      {children}
    </button>
  );
}
