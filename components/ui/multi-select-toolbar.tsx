"use client";

import { useSelection } from "./selection-context";
import { X, GitCompare, Plus, Star, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MultiSelectToolbar — floating action dock that appears when 2+ items selected.
 */
export function MultiSelectToolbar() {
  const { selected, clear, remove } = useSelection();

  if (selected.length < 2) return null;

  return (
    <div
      className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none animate-slide-up"
      role="region"
      aria-label="Ações para itens selecionados"
    >
      <div className="panel shadow-2xl pointer-events-auto flex items-center gap-1 px-2 py-2 max-w-2xl">
        <div className="flex items-center gap-1 px-2 max-w-md overflow-x-auto">
          {selected.slice(0, 5).map((s) => (
            <span
              key={s.symbol}
              className="chip flex items-center gap-1.5 shrink-0"
            >
              <span className="font-medium">{s.symbol}</span>
              <button
                onClick={() => remove(s.symbol)}
                className="p-0.5 text-muted hover:text-ink transition-colors press"
                aria-label={`Remover ${s.symbol}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selected.length > 5 && (
            <span className="text-xs text-muted px-2">
              +{selected.length - 5}
            </span>
          )}
        </div>

        <div className="h-6 w-px bg-hairline mx-1" />

        <ActionButton
          icon={GitCompare}
          label="Comparar"
          onClick={() => {
            const symbols = selected.map((s) => s.symbol).join(",");
            window.location.href = `/market/stocks?q=${encodeURIComponent(symbols)}`;
          }}
        />
        <ActionButton
          icon={Plus}
          label="Add to Index"
          onClick={() => {
            console.log("Add to index:", selected.map((s) => s.symbol));
          }}
        />
        <ActionButton
          icon={Star}
          label="Watchlist"
          onClick={() => {
            console.log("Add to watchlist:", selected.map((s) => s.symbol));
          }}
        />
        <ActionButton
          icon={BarChart3}
          label="Compare chart"
          onClick={() => {
            const symbols = selected.map((s) => s.symbol);
            window.location.href = `/asset/${encodeURIComponent(symbols[0])}`;
          }}
        />

        <div className="h-6 w-px bg-hairline mx-1" />

        <button
          onClick={clear}
          className="p-1.5 text-muted hover:text-ink rounded-md transition-colors duration-150 press"
          aria-label="Limpar seleção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof GitCompare;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium rounded-md transition-all duration-150 press",
        "text-muted hover:text-ink hover:bg-surface-strong",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
