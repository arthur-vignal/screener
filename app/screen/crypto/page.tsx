"use client";

import useSWR from "swr";
import { cn, formatCompact, formatPercent } from "@/lib/utils";

type Crypto = {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  price_usd: number;
  percent_change_24h: number;
  percent_change_7d: number;
  market_cap_usd: number;
  volume24: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CryptoScreen() {
  const { data, error, isLoading } = useSWR<{ rows: Crypto[]; count: number }>(
    "/api/screen/crypto?limit=50",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 },
  );

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Crypto</h1>
          <p className="text-sm text-text-secondary">
            {data ? `${data.count} ativos top por market cap` : "Carregando..."}
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
          {Array.from({ length: 12 }).map((_, i) => (
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
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Símbolo</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-right px-4 py-3 font-medium">24h</th>
                <th className="text-right px-4 py-3 font-medium">7d</th>
                <th className="text-right px-4 py-3 font-medium">Market cap</th>
                <th className="text-right px-4 py-3 font-medium">Vol 24h</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((c, i) => (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-elevated/30",
                  )}
                >
                  <td className="px-4 py-3 text-text-muted font-mono tabular-nums">
                    {c.rank}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-secondary uppercase text-xs">
                    {c.symbol}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    ${c.price_usd < 0.01
                      ? c.price_usd.toFixed(6)
                      : c.price_usd.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      c.percent_change_24h >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatPercent(c.percent_change_24h)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      c.percent_change_7d >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatPercent(c.percent_change_7d)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    ${formatCompact(c.market_cap_usd)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    ${formatCompact(c.volume24)}
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
