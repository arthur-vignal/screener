"use client";

/**
 * PriceHero — preço corrente + variação do dia (logo abaixo do header).
 *
 * Layout:
 *   R$ 18,96                 +R$ 0,05
 *   −0,11%  today            +0,26%
 *
 * Skeleton quando loading. Empty/error states discretos.
 */

import { ArrowDown, ArrowUp } from "lucide-react";
import type { JSX } from "react";

import { Delta } from "@/components/foundation/delta";
import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  price: number | null;
  currency: "BRL" | "USD";
  change: number | null;
  changePercent: number | null;
  prevClose: number | null;
  marketState?: string;
  loading?: boolean;
  className?: string;
};

export function PriceHero({
  price,
  currency,
  change,
  changePercent,
  prevClose,
  marketState,
  loading,
  className,
}: Props): JSX.Element {
  if (loading) return <LoadingHero className={className} />;

  const priceStr = formatPrice(price, currency);

  return (
    <div
      className={cn(
        "flex items-end justify-between gap-6 py-5",
        className
      )}
    >
      {/* Preço */}
      <div>
        <div className="text-[48px] font-semibold tabular-nums text-foreground leading-none tracking-tight">
          {priceStr}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground/85">
          {prevClose != null && (
            <span className="tabular-nums">
              Fechamento anterior {formatPrice(prevClose, currency)}
            </span>
          )}
          {marketState && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                marketState === "REGULAR" && "text-[var(--positive)]",
                marketState === "CLOSED" && "text-muted-foreground/70"
              )}
            >
              {marketState === "REGULAR" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {marketState === "REGULAR" ? "Mercado aberto" : "Mercado fechado"}
            </span>
          )}
        </div>
      </div>

      {/* Variação */}
      <div className="text-right">
        {change != null && (
          <div className="text-[20px] font-semibold tabular-nums">
            {change >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(change), currency)}
          </div>
        )}
        {changePercent != null && (
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <Delta value={changePercent} unit="percent" size="md" />
            <span className="text-[12px] text-muted-foreground/70">today</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingHero({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn("flex items-end justify-between gap-6 py-5", className)}>
      <div>
        <Skeleton className="h-12 w-56 mb-3" roundedMd />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="text-right">
        <Skeleton className="h-6 w-28 mb-2" roundedMd />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(v: number | null, currency: "BRL" | "USD"): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(v: number, currency: "BRL" | "USD"): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
