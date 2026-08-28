"use client";

/**
 * SegmentedControl — controle segmentado (estilo iOS/Material).
 *
 * Usado em /analysis pra alternar entre "Economics" e "Markets".
 * Container único com background escuro, item ativo com pill mais clara.
 */

import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type Segment<T extends string> = {
  value: T;
  label: string;
  /** Ícone Lucide (opcional). */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Texto exibido quando desabilitado. */
  disabledReason?: string;
};

type Props<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Se true, layout vertical (empilhado). Default: horizontal. */
  vertical?: boolean;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className,
  vertical = false,
}: Props<T>): JSX.Element {
  return (
    <div
      className={cn(
        "inline-flex bg-white/[0.02] rounded-md border border-white/10 p-0.5 gap-0.5",
        vertical && "flex-col",
        className
      )}
      role="tablist"
    >
      {segments.map((segment) => {
        const isActive = segment.value === value;
        const isDisabled = !!segment.disabledReason;
        const Icon = segment.icon;

        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(segment.value)}
            title={segment.disabledReason}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-medium transition-colors",
              isActive
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:text-foreground",
              isDisabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
