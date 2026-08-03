"use client";

import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Layers } from "lucide-react";

/**
 * Strategy memo: explains WHY each holding was chosen.
 *
 * Renders a structured investment thesis:
 *  - Strategy category
 *  - Risk profile
 *  - Key metrics / criteria
 *  - Per-holding rationale
 *  - Warnings / risks
 */
export type Holding = { symbol: string; weight: number };
export type SectorExposure = Record<string, number>;

export type StrategySpec = {
  category: "growth" | "value" | "income" | "momentum" | "quality" | "blend" | "thematic";
  riskLevel: "conservative" | "moderate" | "aggressive";
  thesis: string;          // 2-3 frases explicando a tese
  criteria: string[];      // criterios quantitativos usados
  risks?: string[];        // riscos conhecidos
  expectedBehavior?: string; // comportamento esperado em cenarios
};

export function StrategyMemo({
  spec,
  holdings,
  sectorExposure,
  totalReturn,
  annualizedReturn,
  maxDrawdown,
  daysHeld,
}: {
  spec: StrategySpec;
  holdings: Holding[];
  sectorExposure: SectorExposure;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  daysHeld: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-md bg-accent/20 text-accent flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Estratégia &amp; Lógica</h2>
          <p className="text-xs text-text-muted">
            Por que estas ações foram escolhidas e o que esperar.
          </p>
        </div>
      </div>

      {/* Thumbnail summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard
          label="Categoria"
          value={
            {
              growth: "Growth",
              value: "Value",
              income: "Income",
              momentum: "Momentum",
              quality: "Quality",
              blend: "Blend",
              thematic: "Thematic",
            }[spec.category]
          }
          tone="neutral"
        />
        <SummaryCard
          label="Risco"
          value={
            {
              conservative: "Conservador",
              moderate: "Moderado",
              aggressive: "Agressivo",
            }[spec.riskLevel]
          }
          tone={
            spec.riskLevel === "aggressive"
              ? "warning"
              : spec.riskLevel === "conservative"
                ? "positive"
                : "neutral"
          }
        />
        <SummaryCard
          label="Retorno Total"
          value={`${(totalReturn * 100).toFixed(1)}%`}
          tone={totalReturn >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          label="Max Drawdown"
          value={`${(maxDrawdown * 100).toFixed(1)}%`}
          tone={maxDrawdown > 0.2 ? "warning" : "neutral"}
        />
      </div>

      {/* Thesis */}
      <section className="mb-5">
        <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2">
          Tese de Investimento
        </h3>
        <p className="text-sm text-foreground leading-relaxed">{spec.thesis}</p>
      </section>

      {/* Criteria */}
      <section className="mb-5">
        <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2 flex items-center gap-1.5">
          <Layers className="w-3 h-3" />
          Critérios de Seleção
        </h3>
        <ul className="space-y-1.5">
          {spec.criteria.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-text-muted font-mono text-xs mt-1 shrink-0">
                {i + 1}.
              </span>
              <span className="text-foreground">{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Sector exposure */}
      <section className="mb-5">
        <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2">
          Exposição Setorial
        </h3>
        <div className="space-y-1.5">
          {Object.entries(sectorExposure)
            .sort((a, b) => b[1] - a[1])
            .map(([sector, weight]) => {
              const pct = Math.min(weight * 100, 100);
              return (
                <div key={sector} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-text-secondary">
                    {sector}
                  </div>
                  <div className="flex-1 h-4 bg-surface-elevated rounded relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/60 to-accent"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 text-xs font-mono">
                      {(weight * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Expected behavior */}
      {spec.expectedBehavior && (
        <section className="mb-5">
          <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2">
            Comportamento Esperado
          </h3>
          <p className="text-sm text-foreground leading-relaxed">
            {spec.expectedBehavior}
          </p>
        </section>
      )}

      {/* Risks */}
      {spec.risks && spec.risks.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            Riscos Conhecidos
          </h3>
          <ul className="space-y-1.5">
            {spec.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                <span className="text-foreground">{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "warning" | "neutral";
}) {
  const toneClass = {
    positive: "text-positive",
    negative: "text-negative",
    warning: "text-yellow-500",
    neutral: "text-foreground",
  }[tone];

  return (
    <div className="rounded-md bg-background/40 p-3 border border-border-subtle">
      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div className={`text-base font-mono font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}