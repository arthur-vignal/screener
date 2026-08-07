"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

export type Market = "global" | "us" | "br";

const OPTIONS: Array<{ value: Market; label: string; flag: string; short: string }> = [
  { value: "global", label: "Global", flag: "🌐", short: "Global" },
  { value: "us", label: "US", flag: "🇺🇸", short: "US" },
  { value: "br", label: "Brasil", flag: "🇧🇷", short: "BR" },
];

/**
 * MarketToggle — 3-way selector (Global / US / Brasil).
 *
 * - Updates the `market` query param on the current route.
 * - Renders 3 segmented buttons with a flag emoji for US/BR.
 * - "Global" is the default when no `?market` is present.
 *
 * Designed to live inside the TopNav (right cluster) or as a sticky filter
 * above a list page. State is URL-driven so it's bookmarkable and survives
 * refreshes.
 */
export function MarketToggle({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current: Market = normalizeMarket(searchParams.get("market"));

  const setMarket = useCallback(
    (next: Market) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "global") {
        params.delete("market");
      } else {
        params.set("market", next);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div
      role="group"
      aria-label="Market selector"
      className={cn(
        "inline-flex items-center border border-hairline-strong h-[30px]",
        className,
      )}
    >
      {OPTIONS.map((opt, i) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMarket(opt.value)}
            aria-pressed={active}
            className={cn(
              "h-full px-2.5 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide transition-colors duration-150 press",
              i > 0 && "border-l border-hairline-strong",
              active
                ? "bg-surface-elevated text-ink"
                : "bg-canvas text-muted hover:text-ink hover:bg-surface-elevated",
            )}
            title={opt.label}
          >
            {opt.flag && <span className="text-[12px] leading-none">{opt.flag}</span>}
            <span className="font-medium">{opt.short}</span>
          </button>
        );
      })}
    </div>
  );
}

function normalizeMarket(raw: string | null): Market {
  if (raw === "us" || raw === "br") return raw;
  return "global";
}
