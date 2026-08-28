"use client";

/**
 * PriceHero — preço corrente + variação (estilo Fey TSLA).
 *
 * Layout:
 *   $329.22  −1.30 (−0.39%)          USD · Nasdaq
 *
 *   (sem market state pill, sem botão, sem nada além)
 *
 * Skeleton quando loading.
 */

import { ArrowDown, ArrowUp } from "lucide-react";
import type { JSX } from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  price: number | null;
  currency: "BRL" | "USD";
  change: number | null;
  changePercent: number | null;
  /** Localização (ex: "B3"). Mostrado à direita do preço. */
  location?: string | null;
  loading?: boolean;
  className?: string;
};

export function PriceHero({
  price,
  currency,
  change,
  changePercent,
  location,
  loading,
  className,
}: Props): JSX.Element {
  if (loading) return <LoadingHero className={className} />;

  const isPositive = (change ?? 0) >= 0;
  const changeColor = isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]";
  const ChangeIcon = isPositive ? ArrowUp : ArrowDown;

  const locationText = location
    ? `${currency} · ${location}`
    : currency;

  return (
    <div className={cn("flex items-end justify-between gap-6 py-4", className)}>
      {/* Preço + delta inline */}
      <div className="flex items-baseline gap-3">
        <div className="text-[32px] font-semibold tabular-nums text-foreground leading-none tracking-tight">
          {formatPrice(price, currency)}
        </div>
        {change != null && changePercent != null && (
          <div className={cn("flex items-center gap-1 text-[14px] font-medium tabular-nums", changeColor)}>
            <ChangeIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {formatAbsCurrency(change, currency)}
            <span className="opacity-90">
              ({isPositive ? "+" : "−"}
              {Math.abs(changePercent).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              %)
            </span>
          </div>
        )}
      </div>

      {/* Localização */}
      {locationText && (
        <div className="text-[12px] text-muted-foreground/70 shrink-0">
          {locationText}
        </div>
      )}
    </div>
  );
}

function LoadingHero({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn("flex items-end justify-between gap-6 py-4", className)}>
      <Skeleton className="h-9 w-48" roundedMd />
      <Skeleton className="h-3.5 w-24" />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(v: number | null, currency: "BRL" | "USD"): string {
  if (v == null) return "—";
  // Fey usa símbolo da moeda antes do número (estilo en-US: "$329.22")
  const symbol = currency === "USD" ? "$" : "R$";
  const formatted = v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

function formatAbsCurrency(v: number, currency: "BRL" | "USD"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  return `${v >= 0 ? "" : "−"}${symbol}${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
