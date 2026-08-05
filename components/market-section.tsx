"use client";

import useSWR from "swr";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  /** Endpoint type to filter: sp500, etf, crypto */
  endpoint: "sp500" | "etf" | "crypto";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "mint" | "purple" | "cyan";
  viewAllHref: string;
  limit?: number;
};

const accentMap = {
  mint: "text-brand-deep",
  purple: "text-accent-pink",
  cyan: "text-accent-teal",
} as const;

export function MarketSection({ endpoint, title, icon: Icon, accent, viewAllHref, limit = 6 }: Props) {
  const { data: list, isLoading: loadingList } = useSWR<ListResponse>(
    `/api/assets/list?exchange=${endpoint}&limit=${limit}`,
    fetcher,
  );

  const symbols = list?.items.map((i) => i.symbol).join(",") ?? "";
  const { data: quotes } = useSWR<{ rows: Row[] }>(
    symbols ? `/api/assets/quote?symbols=${encodeURIComponent(symbols)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const rows = quotes?.rows ?? [];

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", accentMap[accent])} />
          <h3 className="text-sm font-medium text-ink uppercase tracking-wider">
            {title}
          </h3>
        </div>
        <Link
          href={viewAllHref}
          className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 link-underline"
        >
          Ver todos
          <ArrowRight className="w-3 h-3 icon-rotate-hover" />
        </Link>
      </div>

      {loadingList ? (
        <div className="space-y-2">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <Link
              key={r.symbol}
              href={`/asset/${encodeURIComponent(r.symbol)}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-md hover-row press animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono font-semibold text-sm text-ink w-16 shrink-0">
                  {r.symbol}
                </span>
                <span className="text-xs text-muted truncate hidden sm:block">
                  {r.sector}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm font-tabular shrink-0">
                {r.quote ? (
                  <>
                    <span className="text-ink">${r.quote.price.toFixed(2)}</span>
                    <span
                      className={cn(
                        "min-w-[64px] text-right font-medium",
                        r.quote.changePercent >= 0 ? "text-positive" : "text-negative",
                      )}
                    >
                      {formatPercent(r.quote.changePercent)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
