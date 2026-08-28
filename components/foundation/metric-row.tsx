"use client";

/**
 * MetricRow — linha da tabela detalhada de métricas.
 *
 * Padrão visual (print AGRO3 /asset):
 *   Layout horizontal: caret | label + sublabel | valor | delta | sparkline
 *   Eyebrow uppercase 11px muted ("VALUATION")
 *   Label 14px medium + valor 20px semibold tabular-nums
 *   Linhas agrupadas por categoria com header sticky
 */

import { ChevronRight } from "lucide-react";
import type { JSX } from "react";

import { Delta } from "@/components/foundation/delta";
import { cn } from "@/lib/utils";

export type MetricRowProps = {
  /** Label principal da métrica. Ex: "P/L". */
  label: string;
  /** Valor formatado (string). */
  value: string;
  /** Delta opcional (variação %). */
  delta?: number | null;
  /** Sublabel abaixo do label principal (muted, 12px). */
  sublabel?: string;
  /** Ícone opcional à esquerda do label. */
  icon?: React.ReactNode;
  /** Callback ao clicar (geralmente navega para drilldown). */
  onClick?: () => void;
  /** Se true, força clique visual mas sem handler. */
  disabled?: boolean;
  /** Sparkline à direita (qualquer ReactNode). */
  trailing?: React.ReactNode;
  className?: string;
};

export function MetricRow({
  label,
  value,
  delta,
  sublabel,
  icon,
  onClick,
  disabled,
  trailing,
  className,
}: MetricRowProps): JSX.Element {
  const interactive = !disabled && !!onClick;

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 py-3 px-4 text-left transition-colors",
        "border-b border-border/40 last:border-b-0",
        interactive && "hover:bg-white/[0.02] cursor-pointer",
        disabled && "opacity-60 cursor-default",
        className
      )}
    >
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-foreground truncate">
            {label}
          </span>
          {sublabel && (
            <span className="text-[12px] text-muted-foreground truncate">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {trailing && <div className="shrink-0">{trailing}</div>}

      <div className="shrink-0 text-right flex items-baseline gap-2 tabular-nums">
        <span className="text-[14px] font-semibold text-foreground">
          {value}
        </span>
        {delta != null && <Delta value={delta} unit="percent" size="sm" />}
      </div>

      {interactive && (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground/60"
          strokeWidth={2}
        />
      )}
    </button>
  );
}

/**
 * MetricGroupHeader — header de categoria dentro da lista de métricas.
 * Ex: "VALUATION", "RENTABILIDADE", "ENDIVIDAMENTO".
 */
export function MetricGroupHeader({
  label,
  className,
}: {
  label: string;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 px-4 py-2 bg-[#101116]/95 backdrop-blur-sm",
        "border-b border-border/40",
        className
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
        {label}
      </span>
    </div>
  );
}
