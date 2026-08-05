"use client";

import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Building2, BarChart3 } from "lucide-react";
import { cn, formatPercent, formatCompact } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Quote = {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
};

type Row = {
  symbol: string;
  type: "stock" | "etf" | "crypto";
  sector: string;
  quote: Quote | null;
};

type ListItem = {
  symbol: string;
  name: string;
  type: "stock" | "etf" | "crypto";
  sector: string;
};

type ListResponse = {
  items: ListItem[];
  total: number;
  hasMore: boolean;
};

type Props = {
  endpoint: "sp500" | "etf";
  title: string;
  description: string;
  icon: "building" | "chart";
  accent: "mint" | "purple" | "cyan";
};

const ICONS = {
  building: Building2,
  chart: BarChart3,
};

const accentMap = {
  mint: "text-brand-deep",
  purple: "text-accent-pink",
  cyan: "text-accent-teal",
} as const;

export function AssetListPage({ endpoint, title, description, icon, accent }: Props) {
  const Icon = ICONS[icon];
  const { data: list, isLoading: loadingList } = useSWR<ListResponse>(
    `/api/assets/list?exchange=${endpoint}&limit=50`,
    fetcher,
  );

  const symbols = list?.items.map((i) => i.symbol).join(",") ?? "";
  const { data: quotes } = useSWR<{ rows: Row[] }>(
    symbols ? `/api/assets/quote?symbols=${encodeURIComponent(symbols)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const rows = quotes?.rows ?? [];
  const total = list?.total ?? 0;

  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/market"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-3 link-underline"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          Market
        </Link>
        <div className="flex items-center gap-3">
          <Icon className={cn("w-7 h-7", accentMap[accent])} />
          <h1 className="font-display text-4xl md:text-5xl text-ink tracking-tight">
            {title}
          </h1>
        </div>
        <p className="text-body text-base max-w-2xl mt-2">{description}</p>
        <div className="text-xs text-muted mt-2 font-mono">
          {total} ativos
        </div>
      </div>

      <div>
        {loadingList ? (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-hairline">
                  <th className="text-left px-4 py-3 font-medium uppercase tracking-wider">Ticker</th>
                  <th className="text-left px-4 py-3 font-medium uppercase tracking-wider">Setor</th>
                  <th className="text-right px-4 py-3 font-medium uppercase tracking-wider">Preço</th>
                  <th className="text-right px-4 py-3 font-medium uppercase tracking-wider">24h</th>
                  <th className="text-right px-4 py-3 font-medium uppercase tracking-wider">Volume</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.symbol}
                    className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                    style={{ animationDelay: `${Math.min(i * 15, 500)}ms` }}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/asset/${encodeURIComponent(r.symbol)}`}
                        className="font-mono font-semibold text-ink hover:text-brand-deep transition-colors duration-150"
                      >
                        {r.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">
                      {r.sector || "—"}
                    </td>
                    <td className="text-right px-4 py-2.5 font-tabular text-ink">
                      {r.quote ? `$${r.quote.price.toFixed(2)}` : "—"}
                    </td>
                    <td
                      className={cn(
                        "text-right px-4 py-2.5 font-tabular font-medium",
                        r.quote?.changePercent == null
                          ? "text-muted"
                          : r.quote.changePercent >= 0
                            ? "text-positive"
                            : "text-negative",
                      )}
                    >
                      {r.quote ? formatPercent(r.quote.changePercent) : "—"}
                    </td>
                    <td className="text-right px-4 py-2.5 font-tabular text-muted">
                      {r.quote && r.quote.volume > 0 ? formatCompact(r.quote.volume) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
