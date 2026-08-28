"use client";

/**
 * AssetPageClient — client shell de /asset/[symbol].
 *
 * Composição (Fase 3 — redesign):
 *   <AssetHeader />           — voltar + ticker + long name + BRL/USD toggle + ANALYZE
 *   <PriceHero />             — preço grande + delta + market state
 *   <PriceChart />            — line chart full-width + PeriodTabs
 *   <PreviewWidgetGrid />     — 4 colunas, 1 widget por grupo (Valuation/Profitability/...)
 *   <MetricsTable />          — tabela detalhada estilo print AGRO3
 *
 * Dados:
 *   - GET /api/asset/[symbol]      → bundle completo (quote + metrics + candles)
 *   - GET /api/asset/[symbol]/candles?range=...  → range dinâmico
 */

import { motion } from "motion/react";
import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import type { JSX } from "react";

import { DashboardDock } from "@/components/foundation/dashboard-dock";
import {
  StaggerOnMount,
  staggerParentVariants,
} from "@/components/foundation/stagger";
import { useAssetBackground } from "@/lib/use-asset-background";
import { AssetHeader } from "@/components/asset/asset-header";
import type { AssetBundle, RangeKey } from "@/components/asset/asset-bundle";
import { MetricsTable, type MetricRow } from "@/components/asset/metrics-table";
import { PreviewWidgetGrid } from "@/components/asset/preview-widget-grid";
import { PriceChart } from "@/components/asset/price-chart";
import { PriceHero } from "@/components/asset/price-hero";

type Props = {
  symbol: string;
};

const RANGE_DAYS: Record<RangeKey, number | null> = {
  "1D": 1,
  "7D": 7,
  "30D": 30,
  "1Y": 365,
  Max: null,
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return (await r.json()) as T;
}

export default function AssetPageClient({ symbol }: Props): JSX.Element {
  const [currency, setCurrency] = useState<"BRL" | "USD">("BRL");
  const [range, setRange] = useState<RangeKey>("30D");

  useAssetBackground(symbol);

  // Bundle principal
  const { data: bundle, isLoading } = useSWR<AssetBundle>(
    `/api/asset/${symbol}`,
    fetchJson,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  // Candles do range selecionado
  const days = RANGE_DAYS[range];
  const candlesUrl = `/api/asset/${symbol}/candles?days=${days ?? ""}`;
  const { data: candlesData } = useSWR<{ candles?: AssetBundle["candles"] }>(
    candlesUrl,
    fetchJson
  );
  const candles = candlesData?.candles ?? bundle?.candles ?? [];

  // Métricas detalhadas (1 linha por métrica)
  const metricRows = useMemo<MetricRow[]>(() => {
    if (!bundle) return [];
    const m = bundle.metrics;
    const q = bundle.quote;
    return [
      // Valuation
      {
        group: "Valuation",
        label: "P/L",
        sublabel: "trailing",
        href: "#metric-pl",
        valueMultiple:
          m.trailingPE != null
            ? `${m.trailingPE.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`
            : "—",
      },
      {
        group: "Valuation",
        label: "P/VP",
        sublabel: "price/book",
        href: "#metric-pvp",
        valueMultiple: "—",
      },
      {
        group: "Valuation",
        label: "EV/EBITDA",
        href: "#metric-evebitda",
        valueMultiple:
          m.ebitda != null
            ? `${m.ebitda.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 2 })}`
            : "—",
      },
      {
        group: "Valuation",
        label: "Dividend Yield",
        href: "#metric-dy",
        valuePercent:
          m.dividendYield != null
            ? `${m.dividendYield.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
            : "—",
      },

      // Rentabilidade
      {
        group: "Rentabilidade",
        label: "ROE",
        sublabel: "retorno sobre PL",
        href: "#metric-roe",
        valuePercent:
          m.returnOnEquity != null
            ? `${m.returnOnEquity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
            : "—",
      },
      {
        group: "Rentabilidade",
        label: "ROIC",
        sublabel: "retorno sobre capital investido",
        href: "#metric-roic",
        valuePercent: "—",
      },
      {
        group: "Rentabilidade",
        label: "Margem líquida",
        href: "#metric-margem",
        valuePercent: "—",
      },

      // Mercado
      {
        group: "Mercado",
        label: "Volume",
        sublabel: "hoje",
        href: "#metric-volume",
        valueCurrency:
          q.volume != null
            ? q.volume.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 2 })
            : "—",
      },
      {
        group: "Mercado",
        label: "Mkt cap",
        href: "#metric-mktcap",
        valueCurrency:
          m.marketCap != null
            ? m.marketCap.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 2 })
            : "—",
      },
      {
        group: "Mercado",
        label: "52w high",
        href: "#metric-52whigh",
        valueCurrency:
          q.fiftyTwoWeekHigh != null
            ? q.fiftyTwoWeekHigh.toLocaleString("pt-BR", {
                style: "currency",
                currency: bundle.currency,
                maximumFractionDigits: 2,
              })
            : "—",
      },
      {
        group: "Mercado",
        label: "52w low",
        href: "#metric-52wlow",
        valueCurrency:
          q.fiftyTwoWeekLow != null
            ? q.fiftyTwoWeekLow.toLocaleString("pt-BR", {
                style: "currency",
                currency: bundle.currency,
                maximumFractionDigits: 2,
              })
            : "—",
      },
    ];
  }, [bundle]);

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#070709" }}>
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-6 pb-32"
      >
        <StaggerOnMount>
          <AssetHeader
            symbol={symbol}
            longName={bundle?.longName ?? null}
            shortName={bundle?.shortName ?? null}
            sector={bundle?.sector ?? "—"}
            currency={currency}
            onCurrencyChange={setCurrency}
          />
        </StaggerOnMount>

        <StaggerOnMount>
          <PriceHero
            price={bundle?.quote.price ?? null}
            currency={currency}
            change={bundle?.quote.change ?? null}
            changePercent={bundle?.quote.changePercent ?? null}
            prevClose={bundle?.quote.prevClose ?? null}
            marketState={bundle?.marketState}
            loading={isLoading && !bundle}
          />
        </StaggerOnMount>

        <StaggerOnMount>
          <PriceChart
            candles={candles}
            range={range}
            onRangeChange={setRange}
            prevClose={bundle?.quote.prevClose ?? null}
            loading={isLoading && candles.length === 0}
          />
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          <PreviewWidgetGrid
            symbol={symbol}
            bundle={bundle ?? null}
            loading={isLoading && !bundle}
          />
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          <MetricsTable
            rows={metricRows}
            currency={currency}
            loading={isLoading && metricRows.length === 0}
          />
        </StaggerOnMount>
      </motion.main>

      <DashboardDock />
    </div>
  );
}
