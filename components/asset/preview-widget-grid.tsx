"use client";

/**
 * PreviewWidgetGrid — grid de 4 colunas com 1 widget por grupo estatístico.
 *
 * Cada widget é um <PreviewWidget> (foundation) que aponta pra
 * /asset/[symbol]/<grupo>. Layout 4 colunas em desktop, 2 em tablet, 1 em mobile.
 *
 * Skeleton quando loading. Empty quando bundle ainda não chegou.
 */

import { useMemo } from "react";
import type { JSX } from "react";

import { PreviewWidget } from "@/components/foundation/preview-widget";
import { Skeleton } from "@/components/foundation/skeleton";
import type { AssetBundle } from "./asset-bundle";

type Props = {
  symbol: string;
  bundle: AssetBundle | null;
  loading?: boolean;
  className?: string;
};

export function PreviewWidgetGrid({
  symbol,
  bundle,
  loading,
  className,
}: Props): JSX.Element {
  const groups = useMemo(() => buildGroups(symbol, bundle), [symbol, bundle]);

  if (loading || !bundle) {
    return <LoadingGrid className={className} />;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3",
        className
      )}
    >
      {groups.map((g) => (
        <PreviewWidget
          key={g.label}
          eyebrow={g.eyebrow}
          label={g.label}
          value={g.value}
          delta={g.delta}
          href={`/asset/${symbol}/${g.href}`}
          tooltip={g.tooltip}
        />
      ))}
    </div>
  );
}

// ─── Loading ────────────────────────────────────────────────────────────────

function LoadingGrid({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3",
        className
      )}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-[#101116] p-4"
        >
          <Skeleton className="h-3 w-16 mb-3" />
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Group builder ──────────────────────────────────────────────────────────

type Group = {
  eyebrow: string;
  label: string;
  value: string;
  delta: number | null;
  href: string;
  tooltip: string;
};

function buildGroups(symbol: string, b: AssetBundle | null): Group[] {
  if (!b) return [];

  const m = b.metrics;
  const q = b.quote;

  const fmtMultiple = (v: number | null) =>
    v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`;
  const fmtPercent = (v: number | null) =>
    v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  const fmtCompactBRL = (v: number | null) =>
    v == null ? "—" : v.toLocaleString("pt-BR", { notation: "compact" });
  const fmtCurrency = (v: number | null, currency: string) =>
    v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 });

  // Para a Fase 3, os widgets rolam até a seção correspondente da MetricsTable
  // via âncora. Quando a Fase 4 criar as drilldowns reais, basta trocar
  // `anchor` por `href` apontando pra /asset/[symbol]/<grupo>.
  return [
    // Valuation
    { eyebrow: "Valuation", label: "P/L", value: fmtMultiple(m.trailingPE), delta: null, href: "#metric-pl", tooltip: "Preço / Lucro trailing" },
    { eyebrow: "Valuation", label: "P/VP", value: "—", delta: null, href: "#metric-pvp", tooltip: "Preço / Valor Patrimonial" },
    { eyebrow: "Valuation", label: "EV/EBITDA", value: m.ebitda ? fmtCompactBRL(m.ebitda) : "—", delta: null, href: "#metric-evebitda", tooltip: "EBITDA atual" },
    { eyebrow: "Valuation", label: "Dividend Yield", value: fmtPercent(m.dividendYield), delta: null, href: "#metric-dy", tooltip: "Yield anualizado" },

    // Profitability
    { eyebrow: "Profitability", label: "ROE", value: fmtPercent(m.returnOnEquity), delta: null, href: "#metric-roe", tooltip: "Retorno sobre patrimônio" },
    { eyebrow: "Profitability", label: "ROIC", value: "—", delta: null, href: "#metric-roic", tooltip: "Retorno sobre capital investido" },
    { eyebrow: "Profitability", label: "Margem líquida", value: "—", delta: null, href: "#metric-margem", tooltip: "Lucro líquido / Receita" },

    // Risk
    { eyebrow: "Risk", label: "Beta", value: "—", delta: null, href: "#metric-beta", tooltip: "Sensibilidade ao índice" },
    { eyebrow: "Risk", label: "D/E", value: "—", delta: null, href: "#metric-de", tooltip: "Dívida / Patrimônio" },

    // Cashflow
    { eyebrow: "Cashflow", label: "FCF", value: m.freeCashflow != null ? fmtCompactBRL(m.freeCashflow) : "—", delta: null, href: "#metric-fcf", tooltip: "Free cash flow" },

    // Dividends
    { eyebrow: "Dividends", label: "DY 12m", value: fmtPercent(m.dividendYield), delta: null, href: "#metric-dy", tooltip: "Dividend yield 12 meses" },

    // Market
    { eyebrow: "Mercado", label: "Mkt cap", value: m.marketCap ? fmtCurrency(m.marketCap, b.currency) : "—", delta: null, href: "#metric-mktcap", tooltip: "Valor de mercado" },
  ];
}

// ─── cn helper inline pra evitar import extra ───────────────────────────────

function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}
