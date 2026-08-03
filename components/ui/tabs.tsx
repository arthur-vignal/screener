"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type Tab = {
  href: string;
  label: string;
  exact?: boolean;
};

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <div className="relative border-b border-hairline">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative px-4 py-2.5 text-sm whitespace-nowrap transition-colors press",
                active
                  ? "text-ink font-medium"
                  : "text-muted hover:text-ink",
              )}
            >
              {tab.label}
              {active && (
                <span className="tab-indicator left-0 right-0" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Pill-style toggle (e.g. range filters) */
export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const heights = size === "sm" ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm";
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-surface-elevated rounded-md border border-hairline">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            heights,
            "rounded font-medium transition-all duration-150 press",
            value === opt.value
              ? "bg-brand text-on-brand"
              : "text-muted hover:text-ink",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
