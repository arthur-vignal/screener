"use client";

import useSWR from "swr";
import { Check, X, Minus, Loader2 } from "lucide-react";
import { piotroskiF, altmanZ } from "@/lib/scores";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Metrics = {
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
};

type Recommendation = {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

type ScoresData = {
  metrics: Metrics;
  recommendation: Recommendation | null;
};

function recommendationKey(r: Recommendation): { key: string; buyPct: number } {
  const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
  if (total === 0) return { key: "—", buyPct: 0 };
  const buyPct = ((r.strongBuy + r.buy) / total) * 100;
  let key = "HOLD";
  if (buyPct >= 70) key = "BUY";
  else if (buyPct >= 50) key = "BUY";
  else if (buyPct >= 30) key = "HOLD";
  else if (buyPct >= 10) key = "SELL";
  else key = "SELL";
  if (r.strongBuy >= total * 0.4) key = "STRONG BUY";
  if (r.strongSell >= total * 0.4) key = "STRONG SELL";
  return { key, buyPct };
}

export function AssetScores({ ticker }: { ticker: string }) {
  const { data, isLoading } = useSWR<ScoresData>(`/api/scores/${ticker}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 flex items-center justify-center gap-2 text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando scores...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-text-muted text-sm text-center">
        Scores indisponíveis pra esse ticker.
      </div>
    );
  }

  const m = data.metrics;
  const f = piotroskiF(m);
  const z = altmanZ(m);

  const scorePct = f.max > 0 ? f.score / f.max : 0;
  const scoreColor =
    f.score >= 7
      ? "text-positive"
      : f.score >= 5
        ? "text-yellow-400"
        : "text-negative";

  const rec = data.recommendation;
  const recInfo = rec ? recommendationKey(rec) : null;

  return (
    <div className="space-y-3">
      {/* Analyst recommendation + Piotroski */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recommendation card */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Recomendação analistas</h3>
            {recInfo && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-md font-mono uppercase tracking-wider",
                  recInfo.key === "STRONG BUY" || recInfo.key === "BUY"
                    ? "bg-positive/10 text-positive"
                    : recInfo.key === "SELL" || recInfo.key === "STRONG SELL"
                      ? "bg-negative/10 text-negative"
                      : "bg-yellow-400/10 text-yellow-400",
                )}
              >
                {recInfo.key}
              </span>
            )}
          </div>
          {rec ? (
            <>
              <div className="space-y-1.5 text-xs">
                <Bar label="Compra forte" value={rec.strongBuy} max={Math.max(rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell, 1)} color="bg-positive" />
                <Bar label="Compra" value={rec.buy} max={Math.max(rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell, 1)} color="bg-positive/60" />
                <Bar label="Mantém" value={rec.hold} max={Math.max(rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell, 1)} color="bg-yellow-400/60" />
                <Bar label="Venda" value={rec.sell} max={Math.max(rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell, 1)} color="bg-negative/60" />
                <Bar label="Venda forte" value={rec.strongSell} max={Math.max(rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell, 1)} color="bg-negative" />
              </div>
              <div className="text-xs text-text-muted text-center pt-2 mt-2 border-t border-border-subtle">
                {rec.period} · {rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell} analistas
              </div>
            </>
          ) : (
            <p className="text-xs text-text-muted">Sem cobertura</p>
          )}
        </div>

        {/* Piotroski */}
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

      {/* Altman Z + Growth */}
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
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Crescimento</div>
          <div className="space-y-0.5 text-sm font-mono tabular-nums">
            {m.revenueGrowth != null && (
              <div>
                Receita: <span className={cn(m.revenueGrowth >= 0 ? "text-positive" : "text-negative")}>
                  {m.revenueGrowth >= 0 ? "+" : ""}{(m.revenueGrowth * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {m.earningsGrowth != null && (
              <div>
                Lucro: <span className={cn(m.earningsGrowth >= 0 ? "text-positive" : "text-negative")}>
                  {m.earningsGrowth >= 0 ? "+" : ""}{(m.earningsGrowth * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Dividend</div>
          <div className="text-sm font-mono tabular-nums">
            {m.dividendYield != null ? (
              <span className="text-positive">{m.dividendYield.toFixed(2)}% yield</span>
            ) : (
              <span className="text-text-muted">não paga dividendo</span>
            )}
            {m.payoutRatio != null && (
              <div className="text-text-muted text-xs mt-0.5">
                payout {m.payoutRatio.toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-secondary w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-text-muted font-mono w-6 text-right">{value}</span>
    </div>
  );
}
