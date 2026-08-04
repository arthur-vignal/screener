"use client";

import Link from "next/link";
import useSWR from "swr";
import { TrendingUp, TrendingDown, Minus, Bitcoin } from "lucide-react";
import type { CmcQuote, CmcGlobal } from "@/lib/cmc";
import { cn, formatCompact, formatPercent } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Props = {
  initialQuotes: CmcQuote[];
  initialGlobal: CmcGlobal | null;
};

export function CryptoMarketLive({ initialQuotes, initialGlobal }: Props) {
  const { data } = useSWR<{ quotes: CmcQuote[]; global: CmcGlobal | null }>(
    "/api/cmc/quotes?limit=20",
    fetcher,
    {
      fallbackData: { quotes: initialQuotes, global: initialGlobal },
      refreshInterval: 60_000,
    },
  );

  const quotes = data?.quotes ?? initialQuotes;
  const global = data?.global ?? initialGlobal;

  if (quotes.length === 0) {
    return (
      <div className="panel p-6 text-sm text-muted">
        Sem dados crypto disponíveis.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {global && <GlobalStats global={global} />}
      <CoinsTable quotes={quotes} />
    </div>
  );
}

function GlobalStats({ global }: { global: CmcGlobal }) {
  const items = [
    {
      label: "Total market cap",
      value: `$${(global.total_market_cap / 1e12).toFixed(2)}T`,
      change: global.total_market_cap_yesterday_percentage_change,
    },
    {
      label: "24h volume",
      value: `$${formatNumber(global.total_volume_24h)}`,
    },
    {
      label: "BTC dominance",
      value: `${global.btc_dominance.toFixed(1)}%`,
      change: global.btc_dominance_24h_percentage_change,
    },
    {
      label: "ETH dominance",
      value: `${global.eth_dominance.toFixed(1)}%`,
      change: global.eth_dominance_24h_percentage_change,
    },
    {
      label: "DeFi cap",
      value: `$${formatNumber(global.defi_market_cap)}`,
      change: global.defi_24h_percentage_change,
    },
    {
      label: "Stablecoins",
      value: `$${formatNumber(global.stablecoin_market_cap)}`,
      change: global.stablecoin_24h_percentage_change,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="panel-inset p-4 animate-fade-up"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div className="text-[11px] uppercase tracking-wider text-muted font-medium mb-1.5">
            {item.label}
          </div>
          <div className="font-tabular text-xl font-semibold text-ink">
            {item.value}
          </div>
          {item.change != null && (
            <div
              className={cn(
                "text-xs font-tabular font-medium mt-0.5",
                item.change > 0 ? "text-positive" : item.change < 0 ? "text-negative" : "text-muted",
              )}
            >
              {item.change > 0 ? "+" : ""}
              {item.change.toFixed(2)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CoinsTable({ quotes }: { quotes: CmcQuote[] }) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted border-b border-hairline">
              <th className="text-left px-4 py-3 font-medium">#</th>
              <th className="text-left px-4 py-3 font-medium">Coin</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-right px-4 py-3 font-medium">1h</th>
              <th className="text-right px-4 py-3 font-medium">24h</th>
              <th className="text-right px-4 py-3 font-medium">7d</th>
              <th className="text-right px-4 py-3 font-medium">Market cap</th>
              <th className="text-right px-4 py-3 font-medium">Volume 24h</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q, i) => {
              const u = q.quote.USD;
              return (
                <tr
                  key={q.id}
                  className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                  style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
                >
                  <td className="px-4 py-2.5 font-tabular text-muted">
                    {q.cmc_rank}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/asset/${q.symbol}-USD`}
                      className="flex items-center gap-2 group"
                    >
                      <span className="font-medium text-ink group-hover:text-brand-deep transition-colors duration-150">
                        {q.name}
                      </span>
                      <span className="font-tabular text-xs text-muted">
                        {q.symbol}
                      </span>
                    </Link>
                  </td>
                  <td className="text-right px-4 py-2.5 font-tabular text-ink">
                    ${u.price < 1 ? u.price.toFixed(4) : u.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </td>
                  <ChangeCell value={u.percent_change_1h} />
                  <ChangeCell value={u.percent_change_24h} bold />
                  <ChangeCell value={u.percent_change_7d} />
                  <td className="text-right px-4 py-2.5 font-tabular text-muted">
                    ${formatCompact(u.market_cap)}
                  </td>
                  <td className="text-right px-4 py-2.5 font-tabular text-muted">
                    ${formatCompact(u.volume_24h)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChangeCell({ value, bold }: { value: number; bold?: boolean }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <td
      className={cn(
        "text-right px-4 py-2.5 font-tabular",
        bold ? "font-medium" : "",
        value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-muted",
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </td>
  );
}

function formatNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
