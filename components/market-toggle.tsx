"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

export type Market = "us" | "br";

const OPTIONS: Array<{ value: Market; label: string; flag: string; short: string }> = [
  { value: "us", label: "US", flag: "🇺🇸", short: "US" },
  { value: "br", label: "Brasil", flag: "🇧🇷", short: "BR" },
];

/**
 * MarketToggle — 2-way selector (US / Brasil).
 *
 * Different behavior per route:
 *  - On `/` (the dashboard): toggles ?dashboard=br|us (drives the dashboard mode).
 *  - On any other route: toggles ?market=br|us (legacy filter used by /market/*).
 *
 * State is URL-driven so it's bookmarkable and survives refreshes.
 */
export function MarketToggle({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isDashboard = pathname === "/";
  const current: Market = isDashboard
    ? normalizeDashboard(searchParams.get("dashboard"))
    : normalizeMarket(searchParams.get("market"));

  const setMarket = useCallback(
    (next: Market) => {
      // Always navigate to the dashboard route (root with ?dashboard=).
      // This is the canonical home for both BR and US dashboards.
      const params = new URLSearchParams();
      params.set("dashboard", next);
      router.push(`/?${params.toString()}`);
    },
    [router],
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
  return raw === "br" ? "br" : "us";
}

// Single normalizer — both `/market/...` and `/?dashboard=...` use the same
// ?dashboard= or ?market= param semantics, so one helper covers both.
function normalizeDashboard(raw: string | null): Market {
  return raw === "br" ? "br" : "us";
}
