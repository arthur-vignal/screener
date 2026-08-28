"use client";

/**
 * PreviewWidget — card clicável usado em /asset/[symbol] raiz.
 *
 * Mostra resumo de 1 métrica com sparkline opcional. Clicar navega
 * para a drilldown correspondente.
 *
 * Padrão visual (sulfur-redesign §4):
 *   Container: rounded-xl bg-[#101116] border border-white/10 p-4
 *               transition-colors hover:border-white/20
 *   Eyebrow:   10px uppercase tracking-[0.18em] text-muted-foreground
 *   Label:     14px font-medium
 *   Valor:     20px font-semibold tabular-nums
 */

import Link from "next/link";
import type { JSX, ReactNode } from "react";

import { Delta } from "@/components/foundation/delta";
import { cn } from "@/lib/utils";

type Props = {
  /** Eyebrow (categoria). Ex: "VALUATION". */
  eyebrow: string;
  /** Label da métrica. Ex: "P/L". */
  label: string;
  /** Valor formatado. */
  value: string;
  /** Delta (variação). Opcional. */
  delta?: number | null;
  /** URL de destino (drilldown). */
  href: string;
  /** Sparkline à direita. */
  sparkline?: ReactNode;
  /** Tooltip opcional no hover. */
  tooltip?: string;
  className?: string;
};

export function PreviewWidget({
  eyebrow,
  label,
  value,
  delta,
  href,
  sparkline,
  tooltip,
  className,
}: Props): JSX.Element {
  return (
    <Link
      href={href}
      title={tooltip}
      className={cn(
        "block rounded-xl bg-[#101116] border border-white/10 p-4",
        "transition-colors hover:border-white/20 hover:bg-[#131419]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        className
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
        {eyebrow}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-foreground truncate">
            {label}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[20px] font-semibold tabular-nums text-foreground">
              {value}
            </span>
            {delta != null && <Delta value={delta} unit="percent" size="sm" />}
          </div>
        </div>
        {sparkline && <div className="shrink-0 w-[88px] h-[40px]">{sparkline}</div>}
      </div>
    </Link>
  );
}
