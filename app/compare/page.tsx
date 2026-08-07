"use client";

/**
 * /compare — side-by-side comparison for 2 to 5 tickers.
 *
 * URL: /compare?symbols=AAPL,MSFT,PETR4
 * Reads `?symbols=` from the search params, fetches /api/asset/[ticker] for
 * each, renders a table where each row is a metric and each column is a
 * ticker. Empty cells mean the metric is unavailable for that asset.
 *
 * Wrapped in Suspense because useSearchParams() forces CSR bailout in
 * Next 16 (see session 2026-08-07).
 */

import { Suspense, useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, X, GitCompare, Loader2 } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={<CompareFallback />}>
      <ComparePage />
    </Suspense>
  );
}

function CompareFallback() {
  return (
    <div className="px-6 md:px-10 py-12 md:py-20 max-w-2xl mx-auto text-center">
      <Loader2 className="w-6 h-6 text-muted mx-auto animate-spin" />
    </div>
  );
}

type AssetData = {
  ticker: string;
  source?: string;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
  currency?: string | null;
  exchange?: string | null;
  marketCap?: number | null;
  quote?: {
    price?: number;
    changePercent?: number;
    change?: number;
    prevClose?: number;
    dayHigh?: number;
    dayLow?: number;
    volume?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  };
  metrics?: Record<string, number | null>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type RowDef = {
  label: string;
  /** Format value for display; return "—" for null/undefined. */
  format: (d: AssetData) => string | null;
  /** Optional semantic class: "positive" | "negative" | undefined */
  tone?: (d: AssetData) => "positive" | "negative" | "neutral" | undefined;
  /** Group label */
  group: string;
};

// Percent values are stored as decimals (0.12 = 12%) in the API; this helper
// renders them consistently as XX.XX%.
const pct = (v: number | null | undefined, decimals = 2): string | null => {
  if (v == null) return null;
  return `${(v * 100).toFixed(decimals)}%`;
};
const num = (v: number | null | undefined, decimals = 2): string | null => {
  if (v == null) return null;
  return v.toFixed(decimals);
};
const big = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  return formatCompact(v);
};
const price = (v: number | null | undefined, currency?: string): string | null => {
  if (v == null) return null;
  const sym = currency === "BRL" ? "R$" : "$";
  return `${sym}${v.toLocaleString(currency === "BRL" ? "pt-BR" : "en-US", {
    maximumFractionDigits: 2,
  })}`;
};

const ROWS: RowDef[] = [
  // Quote
  {
    group: "Cota\u00e7\u00e3o",
    label: "Pre\u00e7o",
    format: (d) => price(d.quote?.price, d.currency ?? "USD"),
  },
  {
    group: "Cota\u00e7\u00e3o",
    label: "Varia\u00e7\u00e3o %",
    format: (d) => {
      const v = d.quote?.changePercent;
      if (v == null) return null;
      return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
    },
    tone: (d) =>
      d.quote?.changePercent == null
        ? undefined
        : d.quote.changePercent > 0
          ? "positive"
          : d.quote.changePercent < 0
            ? "negative"
            : "neutral",
  },
  {
    group: "Cota\u00e7\u00e3o",
    label: "52w high",
    format: (d) => price(d.quote?.fiftyTwoWeekHigh, d.currency ?? "USD"),
  },
  {
    group: "Cota\u00e7\u00e3o",
    label: "52w low",
    format: (d) => price(d.quote?.fiftyTwoWeekLow, d.currency ?? "USD"),
  },
  {
    group: "Cota\u00e7\u00e3o",
    label: "Volume",
    format: (d) => big(d.quote?.volume),
  },
  // Profile
  {
    group: "Perfil",
    label: "Market cap",
    format: (d) => big(d.marketCap),
  },
  {
    group: "Perfil",
    label: "Setor",
    format: (d) => d.sector ?? null,
  },
  {
    group: "Perfil",
    label: "Ind\u00fastria",
    format: (d) => d.industry ?? null,
  },
  {
    group: "Perfil",
    label: "Bolsa",
    format: (d) => d.exchange ?? null,
  },
  // Valuation
  {
    group: "Valuation",
    label: "P/E",
    format: (d) => num(d.metrics?.peRatio ?? d.metrics?.trailingPE),
  },
  {
    group: "Valuation",
    label: "P/VP",
    format: (d) => num(d.metrics?.priceToBook),
  },
  {
    group: "Valuation",
    label: "P/S",
    format: (d) => num(d.metrics?.priceToSales),
  },
  {
    group: "Valuation",
    label: "EV/EBITDA",
    format: (d) => num(d.metrics?.evEbitda),
  },
  {
    group: "Valuation",
    label: "EV/Receita",
    format: (d) => num(d.metrics?.evRevenue),
  },
  // Profitability
  {
    group: "Rentabilidade",
    label: "ROE",
    format: (d) => pct(d.metrics?.returnOnEquity ?? d.metrics?.roe),
  },
  {
    group: "Rentabilidade",
    label: "ROA",
    format: (d) => pct(d.metrics?.returnOnAssets ?? d.metrics?.roa),
  },
  {
    group: "Rentabilidade",
    label: "Margem bruta",
    format: (d) => pct(d.metrics?.grossMargin),
  },
  {
    group: "Rentabilidade",
    label: "Margem op.",
    format: (d) => pct(d.metrics?.operatingMargin),
  },
  {
    group: "Rentabilidade",
    label: "Margem l\u00edquida",
    format: (d) => pct(d.metrics?.profitMargin),
  },
  // Dividends
  {
    group: "Dividendos",
    label: "Yield",
    format: (d) => pct(d.metrics?.dividendYield),
  },
  {
    group: "Dividendos",
    label: "Payout",
    format: (d) => pct(d.metrics?.payoutRatio),
  },
];

const GROUPS = Array.from(new Set(ROWS.map((r) => r.group)));

export function ComparePage() {
  const params = useSearchParams();
  const router = useRouter();
  const symbolsParam = params.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 5);

  // Persist basket when user lands here so they can return via CompareButton.
  useEffect(() => {
    if (symbols.length < 2) return;
    try {
      window.localStorage.setItem("sulfur:compare", JSON.stringify(symbols));
    } catch {
      // ignore
    }
  }, [symbols.join(",")]);

  function removeSymbol(sym: string) {
    const next = symbols.filter((s) => s !== sym);
    if (next.length === 0) {
      router.push("/market/stocks");
    } else {
      router.push(`/compare?symbols=${next.join(",")}`);
    }
  }

  if (symbols.length < 2) {
    return <CompareEmpty />;
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-[1400px]">
      <PageHeader
        title="Comparar ativos"
        description={`${symbols.length} ativos lado a lado`}
        actions={
          <Link
            href="/market/stocks"
            className="label label-muted-2 hover:text-ink inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Voltar
          </Link>
        }
      />

      {/* Chip row — show current basket with remove buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {symbols.map((s) => (
          <div
            key={s}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface border border-hairline-strong text-sm"
          >
            <Link
              href={`/asset/${s}`}
              className="font-medium hover:text-brand-deep"
            >
              {s}
            </Link>
            <button
              type="button"
              onClick={() => removeSymbol(s)}
              aria-label={`Remover ${s}`}
              className="text-muted hover:text-ink press"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {symbols.length < 5 && (
          <Link
            href="/market/stocks"
            className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-hairline-strong text-sm text-muted hover:text-ink hover:border-ink/40 press"
          >
            + Adicionar
          </Link>
        )}
      </div>

      <CompareTable symbols={symbols} />
    </div>
  );
}

function CompareTable({ symbols }: { symbols: string[] }) {
  // Fetch each asset in parallel via SWR.
  const queries = symbols.map((s) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, isLoading } = useSWR<AssetData>(
      `/api/asset/${encodeURIComponent(s)}`,
      fetcher,
      { revalidateOnFocus: false },
    );
    return { s, data, isLoading };
  });

  return (
    <div className="border border-hairline-strong bg-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline-strong">
            <th className="text-left px-4 py-3 label-s label-muted-2 uppercase tracking-wide w-[180px]">
              M\u00e9trica
            </th>
            {queries.map(({ s, data, isLoading }) => (
              <th
                key={s}
                className="text-left px-4 py-3 min-w-[160px] border-l border-hairline"
              >
                <Link
                  href={`/asset/${s}`}
                  className="font-display text-[15px] text-ink hover:text-brand-deep"
                >
                  {s}
                </Link>
                <div className="text-xs text-muted truncate mt-0.5">
                  {isLoading ? (
                    <Skeleton className="h-3 w-24" />
                  ) : data?.name ? (
                    data.name
                  ) : data?.sector ? (
                    data.sector
                  ) : (
                    "—"
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => (
            <CompareGroup
              key={group}
              group={group}
              queries={queries}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareGroup({
  group,
  queries,
}: {
  group: string;
  queries: { s: string; data: AssetData | undefined; isLoading: boolean }[];
}) {
  const rows = ROWS.filter((r) => r.group === group);
  return (
    <>
      <tr className="bg-surface-elevated/50">
        <td
          colSpan={queries.length + 1}
          className="px-4 py-2 label-s label-muted-2 uppercase tracking-wide"
        >
          {group}
        </td>
      </tr>
      {rows.map((row, idx) => (
        <tr
          key={`${group}-${idx}`}
          className={cn(
            "border-t border-hairline",
            idx % 2 === 1 && "bg-surface-elevated/20",
          )}
        >
          <td className="px-4 py-2.5 text-muted text-sm">{row.label}</td>
          {queries.map(({ s, data, isLoading }) => {
            const value = data ? row.format(data) : null;
            const tone = data && row.tone ? row.tone(data) : undefined;
            return (
              <td
                key={s}
                className={cn(
                  "px-4 py-2.5 border-l border-hairline font-tabular text-sm",
                  tone === "positive" && "text-positive",
                  tone === "negative" && "text-negative",
                  tone === "neutral" && "text-muted",
                )}
              >
                {isLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : value ? (
                  value
                ) : (
                  <span className="text-muted opacity-50">—</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function CompareEmpty() {
  return (
    <div className="px-6 md:px-10 py-12 md:py-20 max-w-2xl mx-auto text-center">
      <GitCompare
        className="w-10 h-10 text-muted mx-auto mb-4"
        strokeWidth={1.5}
      />
      <h1 className="font-display text-[24px] text-ink mb-2 tracking-[-0.03em]">
        Compare ativos lado a lado
      </h1>
      <p className="text-muted text-sm mb-6">
        Adicione 2 ou mais ativos à comparação a partir da página de qualquer
        ativo. Você verá uma tabela com pre\u00e7o, valuation, rentabilidade e
        dividendos.
      </p>
      <Link
        href="/market/stocks"
        className="btn-primary inline-flex items-center gap-2"
      >
        Explorar ativos
      </Link>
    </div>
  );
}
