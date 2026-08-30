"use client";

/**
 * AnalysisHero — header da página /asset/[symbol]/analysis.
 *
 * Visual:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ Análise                                                  │
 *   │ 8 gráficos sobre valuation, qualidade e earnings power    │
 *   │ de PETR4 no contexto macro brasileiro.                   │
 *   │                                                          │
 *   │ ┌────────┬────────┬────────┬────────┐                  │
 *   │ │ P/L    │ EV/EB  │ ROE    │ Yield  │                  │
 *   │ │ 8.4x   │ 5.87x  │ 15.4%  │ 8%     │                  │
 *   │ └────────┴────────┴────────┴────────┘                  │
 *   │                                                          │
 *   │ Macro BR: SELIC 14% · IPCA 12m 4.44% · CDI 0.04%/dia   │
 *   └────────────────────────────────────────────────────────────┘
 */

import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type AnalysisHeroProps = {
  symbol: string;
  longName: string | null;
  sector: string;
  industry: string;
  // métricas-chave do ativo
  trailingPE: number | null;
  enterpriseToEbitda: number | null;
  returnOnEquity: number | null;
  dividendYield: number | null;
  // macro BR
  selic: number | null;
  ipca12m: number | null;
  cdiDaily: number | null;
  // peers median
  sectorPeMedian: number | null;
};

export function AnalysisHero(props: AnalysisHeroProps): JSX.Element {
  const {
    symbol,
    longName,
    sector,
    industry,
    trailingPE,
    enterpriseToEbitda,
    returnOnEquity,
    dividendYield,
    selic,
    ipca12m,
    cdiDaily,
    sectorPeMedian,
  } = props;

  const fmtMult = (v: number | null) =>
    v == null ? "—" : `${v.toFixed(2)}x`;
  const fmtPct = (v: number | null) =>
    v == null
      ? "—"
      : `${v.toFixed(1)}%`;
  const fmtCDI = (v: number | null) =>
    v == null ? "—" : `${v.toFixed(2)}% a.a.`;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] p-6">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mb-1">
            Drilldown
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-foreground">
            Análise
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground/85">
            8 gráficos sobre valuation, qualidade e earnings power de{" "}
            <span className="font-semibold text-foreground">{symbol}</span>
            {longName ? ` (${longName})` : ""} no contexto macro brasileiro.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold mb-1">
            Setor
          </div>
          <div className="text-[13px] font-semibold text-foreground">{sector}</div>
          <div className="text-[11px] text-muted-foreground/70">{industry}</div>
        </div>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KeyStat
          label="P/L"
          value={fmtMult(trailingPE)}
          sub={
            sectorPeMedian != null
              ? `Setor: ${sectorPeMedian.toFixed(1)}x`
              : null
          }
        />
        <KeyStat label="EV/EBITDA" value={fmtMult(enterpriseToEbitda)} />
        <KeyStat
          label="ROE"
          value={fmtPct(
            returnOnEquity != null ? returnOnEquity * 100 : null,
          )}
        />
        <KeyStat label="Dividend yield" value={fmtPct(dividendYield)} />
      </div>

      {/* Macro BR strip */}
      <div className="flex items-center gap-4 pt-3 border-t border-white/[0.06] text-[10px] text-muted-foreground/70 flex-wrap">
        <span className="uppercase tracking-[0.18em] font-semibold text-muted-foreground/85">
          Macro BR
        </span>
        <span>
          <span className="font-semibold text-foreground/85">SELIC</span>{" "}
          {fmtPct(selic)}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          <span className="font-semibold text-foreground/85">IPCA 12m</span>{" "}
          {fmtPct(ipca12m)}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          <span className="font-semibold text-foreground/85">CDI</span>{" "}
          {fmtCDI(cdiDaily)}
        </span>
      </div>
    </div>
  );
}

function KeyStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | null;
}): JSX.Element {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-[20px] font-semibold tabular-nums leading-none",
          value === "—" ? "text-muted-foreground/40" : "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground/70 mt-1.5 tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}
