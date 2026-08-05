"use client";

import { useState } from "react";
import { Star, StarOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Props = {
  symbol: string;
  /** Optional — if provided, button shows up filled when initialWatched=true */
  initialWatched?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * WatchlistButton — toggle button to add/remove a symbol from the user's watchlist.
 * Shows a star/starOff icon. Optimistic UI: flips state instantly, rolls back on error.
 */
export function WatchlistButton({
  symbol,
  initialWatched = false,
  size = "md",
  className,
}: Props) {
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const prev = watched;
    setWatched(!prev); // optimistic

    try {
      if (prev) {
        const r = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
          method: "DELETE",
        });
        if (!r.ok) throw new Error("Failed to remove");
      } else {
        const r = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || "Failed to add");
        }
      }
      router.refresh();
    } catch {
      setWatched(prev); // rollback
    } finally {
      setLoading(false);
    }
  }

  const Icon = loading ? Loader2 : watched ? Star : StarOff;
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const padding = size === "sm" ? "p-1" : "p-1.5";

  return (
    <button
      onClick={toggle}
      aria-label={watched ? `Remover ${symbol} da watchlist` : `Adicionar ${symbol} à watchlist`}
      aria-pressed={watched}
      disabled={loading}
      className={cn(
        padding,
        "rounded-md transition-colors duration-150 press",
        watched
          ? "text-brand-deep hover:bg-brand-soft"
          : "text-muted hover:text-ink hover:bg-surface-elevated",
        loading && "opacity-60",
        className,
      )}
    >
      <Icon
        className={cn(
          sizeClass,
          loading && "animate-spin",
          watched && "fill-current",
        )}
      />
    </button>
  );
}
