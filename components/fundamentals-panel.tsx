"use client";

import { useState } from "react";
import { Info, TrendingUp, BarChart3, Activity, Shield, Sparkles, DollarSign, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConcept } from "@/lib/concepts";
import type { Concept, ConceptCategory } from "@/lib/concepts";

export function ConceptTooltip({ concept, children }: { concept: Concept; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1 group">
      {children}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-text-muted hover:text-accent transition-colors"
        aria-label={`Info sobre ${concept.label}`}
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 bottom-full mb-1 w-72 bg-surface border border-border rounded-md shadow-lg p-3 text-xs">
          <div className="font-medium text-foreground mb-1">{concept.label}</div>
          <div className="text-text-secondary mb-2 leading-relaxed">{concept.short}</div>
          {concept.formula && (
            <div className="font-mono text-[10px] text-text-muted mb-2 bg-background/50 rounded px-2 py-1">
              {concept.formula}
            </div>
          )}
          <div className="space-y-1">
            {concept.interpretation.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span
                  className={cn(
                    "shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full",
                    b.tone === "good" && "bg-positive",
                    b.tone === "bad" && "bg-negative",
                    b.tone === "neutral" && "bg-text-muted",
                  )}
                />
                <span className="text-text-secondary">
                  <span className="font-mono text-foreground">{b.range}:</span> {b.meaning}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

const CATEGORY_META: Record<ConceptCategory, { label: string; icon: typeof TrendingUp; color: string }> = {
  valuation: { label: "Valuation", icon: TrendingUp, color: "text-blue-400" },
  operating: { label: "Operação", icon: BarChart3, color: "text-purple-400" },
  risk: { label: "Risco", icon: Shield, color: "text-red-400" },
  growth: { label: "Crescimento", icon: Activity, color: "text-green-400" },
  quality: { label: "Qualidade", icon: Brain, color: "text-yellow-400" },
  dividends: { label: "Dividendos", icon: DollarSign, color: "text-cyan-400" },
  trading: { label: "Trading", icon: Sparkles, color: "text-pink-400" },
};

type MetricValue = { key: string; label: string; value: number | null; suffix?: string };

export function FundamentalsPanel({ metrics }: { metrics: MetricValue[] }) {
  const grouped = metrics.reduce<Record<ConceptCategory, MetricValue[]>>((acc, m) => {
    const conceptKey = KNOWN_CONCEPTS[m.key];
    const cat = (conceptKey ? getConcept(conceptKey)?.category : "valuation") as ConceptCategory;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<ConceptCategory, MetricValue[]>);

  const present = Object.entries(grouped).filter(([, ms]) => ms.length > 0);

  return (
    <div className="rounded-lg border border-border bg-surface divide-y divide-border-subtle">
      {present.map(([catKey, ms]) => {
        const cat = CATEGORY_META[catKey as ConceptCategory];
        if (!cat) return null;
        const Icon = cat.icon;
        return (
          <div key={catKey} className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={cn("w-3.5 h-3.5", cat.color)} />
              <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                {cat.label}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
              {ms.map((m) => {
                const concept = KNOWN_CONCEPTS[m.key] ? getConcept(KNOWN_CONCEPTS[m.key]) : null;
                const display =
                  m.value != null
                    ? `${m.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}${m.suffix ?? ""}`
                    : "—";
                return (
                  <div
                    key={m.key}
                    className="flex items-center justify-between py-1 border-b border-border-subtle/50 last:border-0"
                  >
                    {concept ? (
                      <ConceptTooltip concept={concept}>
                        <span className="text-xs text-text-muted">{m.label}</span>
                      </ConceptTooltip>
                    ) : (
                      <span className="text-xs text-text-muted">{m.label}</span>
                    )}
                    <span className="font-mono text-xs tabular-nums">
                      {display}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const KNOWN_CONCEPTS: Record<string, string> = {
  // Map metric key → concept key
  pe: "pe",
  pvp: "pvp",
  evEbitda: "ev_ebitda",
  psr: "psr",
  peg: "peg",
  roe: "roe",
  roic: "roic",
  roa: "roa",
  grossMargin: "gross_margin",
  ebitdaMargin: "ebitda_margin",
  netMargin: "net_margin",
  debtEbitda: "debt_ebitda",
  debtEquity: "debt_equity",
  currentRatio: "current_ratio",
  beta: "beta",
  cagrRevenue: "cagr_revenue",
  cagrEarnings: "cagr_earnings",
  dividendYield: "dy",
  payout: "payout",
  piotroskiF: "piotroski",
  altmanZ: "altman",
};
