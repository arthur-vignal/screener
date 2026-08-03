"use client";

import useSWR from "swr";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  DollarSign,
  Landmark,
  Coins,
  Bitcoin,
} from "lucide-react";
import { SectionHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MacroItem = {
  symbol: string;
  label: string;
  description: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ICON_MAP: Record<string, typeof Gauge> = {
  VIX: Gauge,
  DXY: DollarSign,
  "US 10Y": Landmark,
  Gold: Coins,
  BTC: Bitcoin,
  ETH: Bitcoin,
};

function formatMacroPrice(label: string, price: number | null): string {
  if (price == null) return "—";
  if (label === "US 10Y") return `${price.toFixed(2)}%`;
  if (label === "VIX") return price.toFixed(2);
  if (label === "DXY") return price.toFixed(2);
  if (label === "BTC" || label === "ETH") {
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `$${price.toFixed(2)}`;
}

function toneFromChange(change: number | null, label: string): "positive" | "negative" | "neutral" {
  if (change == null) return "neutral";
  // VIX up = bad (risk-off), Gold up = good (uncertainty hedge), US10Y up = bad for bonds
  if (label === "VIX") {
    return change > 0 ? "negative" : "positive";
  }
  return change >= 0 ? "positive" : "negative";
}

export function MacroPanel() {
  const { data, isLoading } = useSWR<{ macro: MacroItem[] }>(
    "/api/market/macro",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const items = data?.macro ?? [];

  return (
    <Card className="animate-fade-up stagger-1">
      <SectionHeader
        icon={Landmark}
        title="Macro panel"
        action={
          items.length > 0 && (
            <Badge tone="neutral">
              <span className="status-dot inline-block mr-1.5 animate-pulse-ring" />
              Live
            </Badge>
          )
        }
      />
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((m, i) => {
            const Icon = ICON_MAP[m.label] ?? Gauge;
            const tone = toneFromChange(m.changePercent, m.label);
            const TrendIcon =
              m.changePercent == null
                ? Minus
                : m.changePercent > 0
                  ? TrendingUp
                  : m.changePercent < 0
                    ? TrendingDown
                    : Minus;
            return (
              <div
                key={m.symbol}
                className="panel-inset p-4 hover-lift group animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted group-hover:text-brand-bright transition-colors duration-150" />
                    <span className="text-xs font-medium text-ink uppercase tracking-wider">
                      {m.label}
                    </span>
                  </div>
                  <TrendIcon
                    className={cn(
                      "w-3.5 h-3.5",
                      tone === "positive" && "text-positive",
                      tone === "negative" && "text-negative",
                      tone === "neutral" && "text-muted",
                    )}
                  />
                </div>
                <div className="font-tabular text-lg font-semibold text-ink mb-0.5">
                  {formatMacroPrice(m.label, m.price)}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-muted truncate">{m.description}</span>
                </div>
                {m.changePercent != null && (
                  <div
                    className={cn(
                      "text-xs font-tabular font-medium mt-1",
                      tone === "positive" && "text-positive",
                      tone === "negative" && "text-negative",
                      tone === "neutral" && "text-muted",
                    )}
                  >
                    <AnimatedNumber
                      value={m.changePercent}
                      signed
                      decimals={2}
                      suffix="%"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
