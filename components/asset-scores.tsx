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

type QuantRecommendation = {
  score: number;
  band: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
  components: {
    trend: number;
    momentum: number;
    volatility: number;
    sharpe: number;
    drawdown: number;
  };
  rationale: string[];
};

type ScoresData = {
  metrics: Metrics;
  recommendation: QuantRecommendation | null;
};

const BAND_STYLE: Record<
  QuantRecommendation["band"],
  { bg: string; text: string }
> = {
  "STRONG BUY": { bg: "bg-positive/15", text: "text-positive" },
  BUY: { bg: "bg-positive-soft", text: "text-positive" },
  HOLD: { bg: "bg-yellow-400/10", text: "text-warning" },
  SELL: { bg: "bg-negative-soft", text: "text-negative" },
  "STRONG SELL": { bg: "bg-negative/15", text: "text-negative" },
};

export function AssetScores({ ticker }: { ticker: string }) {
  const { data: scoresData, isLoading } = useSWR<ScoresData>(
    `/api/scores/${ticker}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: recData } = useSWR<{ recommendation: QuantRecommendation | null }>(
    `/api/recommendation/${ticker}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-6 flex items-center justify-center gap-2 text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando scores...
      </div>
    );
  }

  if (!scoresData) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-6 text-muted text-sm text-center">
        Scores indisponíveis pra esse ticker.
      </div>
    );
  }

  const m = scoresData.metrics;
  const f = piotroskiF(m);
  const z = altmanZ(m);
  const rec = recData?.recommendation ?? null;

  const scorePct = f.max > 0 ? f.score / f.max : 0;
  const scoreColor =
    f.score >= 7
      ? "text-positive"
      : f.score >= 5
        ? "text-warning"
        : "text-negative";

  return (
    <div className="space-y-3">
      {/* Quant recommendation + Piotroski */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Quant recommendation card */}
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium text-ink">Recomendação quantitativa</h3>
            {rec && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-md font-mono uppercase tracking-wider",
                  BAND_STYLE[rec.band].bg,
                  BAND_STYLE[rec.band].text,
                )}
              >
                {rec.band}
              </span>
            )}
          </div>
          {rec ? (
            <>
              {/* Score bar */}
              <div className="mb-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-muted">Score</span>
                  <span className="text-lg font-mono font-semibold tabular-nums">
                    {rec.score}
                    <span className="text-muted text-sm">/100</span>
                  </span>
                </div>
                <div className="h-2 bg-surface-elevated/60 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      rec.score >= 60
                        ? "bg-positive"
                        : rec.score >= 45
                          ? "bg-yellow-400"
                          : "bg-negative",
                    )}
                    style={{ width: `${rec.score}%` }}
                  />
                </div>
              </div>

              {/* Component breakdown */}
              <div className="space-y-1 text-xs">
                <CompBar label="Tendência" value={rec.components.trend} />
                <CompBar label="Momentum" value={rec.components.momentum} />
                <CompBar label="Volatilidade" value={rec.components.volatility} />
                <CompBar label="Sharpe" value={rec.components.sharpe} />
                <CompBar label="Drawdown" value={rec.components.drawdown} />
              </div>

              {/* Rationale */}
              <div className="mt-3 pt-3 border-t border-hairline text-xs text-muted space-y-0.5">
                {rec.rationale.map((r, i) => (
                  <div key={i}>· {r}</div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted">Calculando...</p>
          )}
        </div>

        {/* Piotroski */}
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium text-ink">Piotroski F-Score</h3>
            <span className={cn("text-lg font-mono font-semibold tabular-nums", scoreColor)}>
              {f.score}<span className="text-muted text-sm">/{f.max}</span>
            </span>
          </div>
          <div className="h-1.5 bg-surface-elevated/60 rounded-full overflow-hidden mb-3">
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
                  <Minus className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={2.5} />
                )}
                <span className="text-body flex-1">{sig.name}</span>
                <span className="text-muted text-[10px] font-mono">{sig.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Altman Z + Growth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-hairline bg-surface p-3">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Altman Z</div>
          <div className="flex items-baseline gap-2">
            {z.z != null ? (
              <>
                <span
                  className={cn(
                    "text-xl font-mono font-semibold tabular-nums",
                    z.zone === "safe" ? "text-positive" : z.zone === "grey" ? "text-warning" : "text-negative",
                  )}
                >
                  {z.z.toFixed(2)}
                </span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-mono uppercase",
                    z.zone === "safe"
                      ? "bg-positive-soft text-positive"
                      : z.zone === "grey"
                        ? "bg-yellow-400/10 text-warning"
                        : "bg-negative-soft text-negative",
                  )}
                >
                  {z.zone === "safe" ? "safe" : z.zone === "grey" ? "grey" : "distress"}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted">indisponível</span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-hairline bg-surface p-3">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Crescimento</div>
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

        <div className="rounded-lg border border-hairline bg-surface p-3">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Dividend</div>
          <div className="text-sm font-mono tabular-nums">
            {m.dividendYield != null ? (
              <span className="text-positive">{m.dividendYield.toFixed(2)}% yield</span>
            ) : (
              <span className="text-muted">não paga dividendo</span>
            )}
            {m.payoutRatio != null && (
              <div className="text-muted text-xs mt-0.5">
                payout {m.payoutRatio.toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-body w-20 shrink-0 text-[11px]">{label}</span>
      <div className="flex-1 h-1 bg-surface-elevated/60 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 60 ? "bg-positive" : value >= 45 ? "bg-yellow-400" : "bg-negative",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-muted font-mono w-6 text-right text-[11px]">{value}</span>
    </div>
  );
}
