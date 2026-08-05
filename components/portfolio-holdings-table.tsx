"use client";

import useSWR from "swr";
import Link from "next/link";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Candle = { date: string; close: number };
type BatchResult = {
  ticker: string;
  points: Candle[];
};

type BatchResponse = {
  results: Record<string, BatchResult>;
  timestamp: number;
};

type Holding = { symbol: string; weight: number };

type Props = {
  holdings: Holding[];
};

type Metrics = {
  price: number | null;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  changeYtd: number | null;
};

const EMPTY: Metrics = { price: null, change24h: null, change7d: null, change30d: null, changeYtd: null };

function computeMetrics(points: Candle[]): Metrics {
  // points is sorted oldest -> newest by Yahoo
  if (points.length < 2) return EMPTY;
  const n = points.length;
  const last = points[n - 1].close;

  const idxAt = (daysBack: number) => {
    // Find first point >= N days ago
    const target = Date.now() - daysBack * 86400000;
    for (let i = n - 1; i >= 0; i--) {
      const t = Date.parse(points[i].date);
      if (t <= target) return i;
    }
    return 0;
  };

  const pct = (from: number) => (from > 0 ? ((last - from) / from) * 100 : 0);

  const i1 = idxAt(1);
  const i7 = idxAt(7);
  const i30 = idxAt(30);

  // YTD: find first point of current year
  const currentYear = new Date().getUTCFullYear();
  let iYtd = 0;
  for (let i = 0; i < n; i++) {
    if (new Date(points[i].date).getUTCFullYear() === currentYear) {
      iYtd = i;
      break;
    }
  }

  return {
    price: last,
    change24h: pct(points[i1].close),
    change7d: pct(points[i7].close),
    change30d: pct(points[i30].close),
    changeYtd: pct(points[iYtd].close),
  };
}

export function PortfolioHoldingsTable({ holdings }: Props) {
  const symbols = holdings.map((h) => h.symbol).join(",");
  const { data } = useSWR<BatchResponse>(
    symbols ? `/api/chart/batch?symbols=${encodeURIComponent(symbols)}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const metricsBySymbol: Record<string, Metrics> = {};
  if (data?.results) {
    for (const [ticker, res] of Object.entries(data.results)) {
      metricsBySymbol[ticker] = computeMetrics(res.points);
    }
  }

  const loading = !data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted border-b border-hairline-strong">
            <th className="text-left py-1.5 px-2 font-medium">Ticker</th>
            <th className="text-right py-1.5 px-2 font-medium">Peso</th>
            <th className="text-right py-1.5 px-2 font-medium">Preço</th>
            <th className="text-right py-1.5 px-2 font-medium">24h</th>
            <th className="text-right py-1.5 px-2 font-medium">7d</th>
            <th className="text-right py-1.5 px-2 font-medium">30d</th>
            <th className="text-right py-1.5 px-2 font-medium">YTD</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => {
            const m = metricsBySymbol[h.symbol] ?? EMPTY;
            return (
              <tr
                key={h.symbol}
                className="border-b border-hairline last:border-0 hover-row animate-fade-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <td className="py-1.5 px-2">
                  <Link
                    href={`/asset/${encodeURIComponent(h.symbol)}`}
                    className="font-mono font-semibold text-ink hover:text-brand-deep transition-colors duration-150"
                  >
                    {h.symbol}
                  </Link>
                </td>
                <td className="text-right py-1.5 px-2 font-tabular text-body">
                  {(h.weight * 100).toFixed(1)}%
                </td>
                <td className="text-right py-1.5 px-2 font-tabular text-ink">
                  {loading ? (
                    <span className="inline-block h-3 w-12 bg-surface-elevated animate-pulse" />
                  ) : m.price == null ? (
                    "—"
                  ) : m.price < 1 ? (
                    `$${m.price.toFixed(4)}`
                  ) : (
                    `$${m.price.toFixed(2)}`
                  )}
                </td>
                <ChangeCell value={m.change24h} loading={loading} />
                <ChangeCell value={m.change7d} loading={loading} />
                <ChangeCell value={m.change30d} loading={loading} />
                <ChangeCell value={m.changeYtd} loading={loading} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChangeCell({ value, loading }: { value: number | null; loading: boolean }) {
  if (loading) {
    return (
      <td className="text-right py-1.5 px-2">
        <span className="inline-block h-3 w-10 bg-surface-elevated animate-pulse" />
      </td>
    );
  }
  if (value == null) {
    return <td className="text-right py-1.5 px-2 font-tabular text-muted">—</td>;
  }
  return (
    <td
      className={cn(
        "text-right py-1.5 px-2 font-tabular font-medium",
        value > 0 ? "text-positive" : value < 0 ? "text-negative" : "text-muted",
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </td>
  );
}
