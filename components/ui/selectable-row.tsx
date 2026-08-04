"use client";

import { useSelection, type SelectableItem } from "./selection-context";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  item: SelectableItem;
  /** Optional content rendered when selected (overlay) */
  children?: ReactNode;
  className?: string;
};

/**
 * SelectableRow — checkbox tapped on click + small indicator.
 * Wrap a row in this to make it selectable.
 */
export function SelectableRow({ item, children, className }: Props) {
  const { isSelected, toggle } = useSelection();
  const selected = isSelected(item.symbol);

  return (
    <button
      type="button"
      onClick={(e) => {
        // Modifier-click selects, plain click navigates
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          e.preventDefault();
          toggle(item);
        }
      }}
      className={cn(
        "relative w-full text-left transition-colors duration-150",
        selected && "bg-brand-soft",
        className,
      )}
    >
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle(item);
        }}
        className={cn(
          "absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-colors duration-150 press",
          selected
            ? "bg-brand border-brand text-on-brand"
            : "bg-surface border-hairline-strong hover:border-ink",
        )}
        aria-label={selected ? "Remover da seleção" : "Adicionar à seleção"}
        aria-pressed={selected}
      >
        {selected && <Check className="w-3 h-3" />}
      </button>
    </button>
  );
}
