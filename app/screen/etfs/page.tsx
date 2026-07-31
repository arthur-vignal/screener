"use client";

import useSWR from "swr";
import { cn, formatCompact, formatPercent } from "@/lib/utils";

type ETF = {
  symbol: string;
  name: string;
  exchange: string;
  marketCap: number;
  dividendYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayMovingAverage: number;
  twoHundredDayMovingAverage: number;
  priceToBookRatio: number;
  trailingPE: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ETFScreen() {
  const { data, error, isLoading } = useSWR<{ rows: ETF[]; count: number }>(
    "/api/screen/etfs?limit=50",
    fetcher,
    { refreshInterval: 60 * 60 * 1000 },
  );

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">ETFs</h1>
          <p className="text-sm text-text-secondary">
            {data ? `${data.count} ETFs top por AUM` : "Carregando..."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-negative/30 bg-negative/5 px-4 py-3 mb-6 text-sm text-negative">
          {String(error)}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md shimmer" />
          ))}
        </div>
      )}

      {data && data.rows.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">Nenhum resultado.</p>
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Símbolo</th>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-right px-4 py-3 font-medium">AUM</th>
                <th className="text-right px-4 py-3 font-medium">Yield</th>
                <th className="text-right px-4 py-3 font-medium">MA50</th>
                <th className="text-right px-4 py-3 font-medium">MA200</th>
                <th className="text-right px-4 py-3 font-medium">Beta</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((e, i) => (
                <tr
                  key={e.symbol}
                  className={cn(
                    "border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-elevated/30",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-foreground">{e.symbol}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-[280px] truncate">
                    {e.name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    ${formatCompact(e.marketCap * 1e6)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {e.dividendYield > 0 ? formatPercent(e.dividendYield) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {e.fiftyDayMovingAverage ? `$${e.fiftyDayMovingAverage.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {e.twoHundredDayMovingAverage ? `$${e.twoHundredDayMovingAverage.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {e.beta > 0 ? e.beta.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
