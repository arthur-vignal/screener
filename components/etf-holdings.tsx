"use client";

import useSWR from "swr";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { formatPercent } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Holding = {
  symbol: string;
  name: string;
  pctHeld: number;
};

export function EtfHoldings({ ticker }: { ticker: string }) {
  const { data, isLoading, error } = useSWR<{ ticker: string; holdings: Holding[] }>(
    `/api/holdings/${ticker}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 flex items-center justify-center gap-2 text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando holdings...
      </div>
    );
  }

  if (error || !data?.holdings) {
    return null; // Silently hide if not an ETF or no data
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="border-b border-border-subtle px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Top 10 holdings</h3>
        <span className="text-xs text-text-muted font-mono">
          {formatPercent(data.holdings.reduce((s, h) => s + h.pctHeld, 0))} total
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {data.holdings.map((h, i) => (
          <Link
            key={h.symbol}
            href={`/asset/${h.symbol}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-elevated transition-colors group"
          >
            <span className="text-xs text-text-muted font-mono w-5 shrink-0 text-right">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sm text-foreground group-hover:text-accent transition-colors">
                  {h.symbol}
                </span>
                <span className="text-xs text-text-muted truncate">
                  {h.name}
                </span>
              </div>
              <div className="mt-1 h-1 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/60 rounded-full"
                  style={{
                    width: `${Math.min(100, (h.pctHeld / Math.max(...data.holdings.map(x => x.pctHeld))) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <span className="font-mono tabular-nums text-sm shrink-0 w-16 text-right">
              {h.pctHeld.toFixed(2)}%
            </span>
            <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
