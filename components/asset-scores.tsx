"use client";

import useSWR from "swr";
import { Check, X, Minus, Loader2 } from "lucide-react";
import { piotroskiF, altmanZ } from "@/lib/scores";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Summary = {
  symbol: string;
  roe: number | null;
  roa: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  beta: number | null;
  priceToBook: number | null;
  marketCap: number | null;
  // Analyst
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  analystCount: number | null;
  recommendation: string | null;
  // ESG
  esgScore: number | null;
};

export function AssetScores({ ticker, currentPrice }: { ticker: string; currentPrice: number }) {
  const { data, isLoading } = useSWR<{ summary: Summary }>(
    `/api/summary/${ticker}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 flex items-center justify-center gap-2 text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando scores...
      </div>
    );
  }

  if (!data?.summary) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-text-muted text-sm text-center">
        Scores indisponíveis pra esse ticker.
      </div>
    );
  }

  const s = data.summary;
  const f = piotroskiF(s);
  const z = altmanZ(s);

  const scorePct = f.max > 0 ? f.score / f.max : 0;
  const scoreColor =
    f.score >= 7
      ? "text-positive"
      : f.score >= 5
        ? "text-yellow-400"
        : "text-negative";

  const upside = s.targetMeanPrice && currentPrice > 0
    ? ((s.targetMeanPrice - currentPrice) / currentPrice) * 100
    : null;

  return (
    <div className="space-y-3">
      {/* Analyst targets + Piotroski side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Analyst target</h3>
            {s.recommendation && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary uppercase tracking-wider font-mono">
                {s.recommendation}
              </span>
            )}
          </div>
          {s.targetMeanPrice ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-muted">Preço atual</span>
                <span className="font-mono tabular-nums">${currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-muted">Target médio</span>
                <span className="font-mono tabular-nums font-semibold">
                  ${s.targetMeanPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-muted">Range</span>
                <span className="font-mono tabular-nums text-xs text-text-secondary">
                  ${s.targetLowPrice?.toFixed(0) ?? "?"} – ${s.targetHighPrice?.toFixed(0) ?? "?"}
                </span>
              </div>
              <div className="border-t border-border-subtle pt-2 mt-2 flex items-baseline justify-between">
                <span className="text-xs text-text-muted">Upside</span>
                <span
                  className={cn(
                    "font-mono tabular-nums font-semibold",
                    upside && upside >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {upside != null ? `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%` : "—"}
                </span>
              </div>
              {s.analystCount != null && (
                <div className="text-xs text-text-muted text-center pt-1">
                  baseado em {s.analystCount} analistas
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Sem cobertura de analistas</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Piotroski F-Score</h3>
            <span className={cn("text-lg font-mono font-semibold tabular-nums", scoreColor)}>
              {f.score}<span className="text-text-muted text-sm">/{f.max}</span>
            </span>
          </div>
          <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden mb-3">
            <div
              className={cn(
                "h-full transition-all",
                scorePct >= 0.78 ? "bg-positive" : scorePct >= 0.55 ? "bg-yellow-400" : "bg-negative",
              )}
              style={{ width: `${Math.round(scorePct * 100)}%` }}
            />
          </div>
          <div className="space-y-1.5 text-xs">
            {f.signals.map((sig, i) => (
              <div key={i} className="flex items-center gap-2">
                {sig.passed === true ? (
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2.5} />
                ) : sig.passed === false ? (
                  <X className="w-3.5 h-3.5 text-negative shrink-0" strokeWidth={2.5} />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={2.5} />
                )}
                <span className="text-text-secondary flex-1">{sig.name}</span>
                <span className="text-text-muted text-[10px] font-mono">{sig.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Altman Z + ESG */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Altman Z</div>
          <div className="flex items-baseline gap-2">
            {z.z != null ? (
              <>
                <span
                  className={cn(
                    "text-xl font-mono font-semibold tabular-nums",
                    z.zone === "safe" ? "text-positive" : z.zone === "grey" ? "text-yellow-400" : "text-negative",
                  )}
                >
                  {z.z.toFixed(2)}
                </span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-mono uppercase",
                    z.zone === "safe"
                      ? "bg-positive/10 text-positive"
                      : z.zone === "grey"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-negative/10 text-negative",
                  )}
                >
                  {z.zone === "safe" ? "safe" : z.zone === "grey" ? "grey" : "distress"}
                </span>
              </>
            ) : (
              <span className="text-sm text-text-muted">indisponível</span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">ESG Score</div>
          <div className="flex items-baseline gap-2">
            {s.esgScore != null ? (
              <>
                <span className="text-xl font-mono font-semibold tabular-nums">
                  {s.esgScore.toFixed(0)}
                </span>
                <span className="text-xs text-text-muted">/100 (lower is better)</span>
              </>
            ) : (
              <span className="text-sm text-text-muted">indisponível</span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Crescimento</div>
          <div className="space-y-0.5 text-sm font-mono tabular-nums">
            {s.revenueGrowth != null && (
              <div>
                Receita: <span className={cn(s.revenueGrowth >= 0 ? "text-positive" : "text-negative")}>
                  {s.revenueGrowth >= 0 ? "+" : ""}{(s.revenueGrowth * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {s.earningsGrowth != null && (
              <div>
                Lucro: <span className={cn(s.earningsGrowth >= 0 ? "text-positive" : "text-negative")}>
                  {s.earningsGrowth >= 0 ? "+" : ""}{(s.earningsGrowth * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
