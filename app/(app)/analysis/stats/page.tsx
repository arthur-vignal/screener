"use client";

import useSWR from "swr";
import { TrendingUp, TrendingDown, Activity, BarChart3, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Stats = {
  overall: {
    totalMarketCap: number;
    peMedian: number;
    peMean: number;
    pbMedian: number;
    pbMean: number;
    evEbitdaMedian: number;
    dividendYieldMedian: number;
    roeMedian: number;
    profitMarginMedian: number;
    coverage: number;
  };
  sectors: Record<
    string,
    {
      count: number;
      marketCap: number;
      peMedian: number;
      pbMedian: number;
      evEbitdaMedian: number;
      roeMedian: number;
      revGrowthMedian: number;
    }
  >;
  gainers: Array<{ symbol: string; price: number; changePercent: number }>;
  losers: Array<{ symbol: string; price: number; changePercent: number }>;
  distribution: Array<{ bucket: string; count: number }>;
  risk: {
    expensiveRatio: number;
    cheapRatio: number;
    lossRatio: number;
    distressedRatio: number;
    highPayoutCount: number;
  };
  generatedAt: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formatCompact = (n: number) => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};

export default function MarketStatsPage() {
  const { data, isLoading } = useSWR<Stats>("/api/market/stats", fetcher);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Mercado
        </h1>
        <p className="text-sm text-body">
          Estatísticas agregadas dos 503 ativos do S&P 500. Atualizado a cada 6h.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="text-sm text-muted">Carregando…</div>
      ) : data.overall.coverage === 0 ? (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
          <ShieldAlert className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-2">Yahoo Finance está limitando as requisições</h3>
          <p className="text-sm text-muted mb-4">
            Os endpoints que retornam fundamentals completos (P/L, P/VP, ROE, etc) requerem
            autenticação (crumb cookie). Estamos coletando apenas dados públicos (preço, volume, 52w).
          </p>
          <p className="text-xs text-muted">
            As estatísticas serão populadas quando o serviço estiver disponível.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overall stats grid */}
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Visão Geral do Mercado
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard
                label="Market Cap Total"
                value={formatCompact(data.overall.totalMarketCap)}
              />
              <StatCard
                label="P/L Mediano"
                value={data.overall.peMedian.toFixed(2)}
                sub={`Média ${data.overall.peMean.toFixed(2)}`}
              />
              <StatCard
                label="P/VP Mediano"
                value={data.overall.pbMedian.toFixed(2)}
                sub={`Média ${data.overall.pbMean.toFixed(2)}`}
              />
              <StatCard
                label="EV/EBITDA Med."
                value={data.overall.evEbitdaMedian.toFixed(2)}
              />
              <StatCard
                label="DY Mediano"
                value={`${(data.overall.dividendYieldMedian * 100).toFixed(2)}%`}
              />
              <StatCard
                label="ROE Mediano"
                value={`${(data.overall.roeMedian * 100).toFixed(1)}%`}
              />
            </div>
            <div className="text-xs text-muted mt-2">
              Cobertura: {data.overall.coverage} ações com dados
            </div>
          </section>

          {/* Risk indicators */}
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Indicadores de Risco
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <RiskBar
                label="Ações 'caras' (P/L > 50)"
                value={data.risk.expensiveRatio}
                tone={data.risk.expensiveRatio > 0.1 ? "warning" : "neutral"}
              />
              <RiskBar
                label="Ações 'baratas' (P/L < 10)"
                value={data.risk.cheapRatio}
                tone={data.risk.cheapRatio > 0.3 ? "positive" : "neutral"}
              />
              <RiskBar
                label="Empresas com prejuízo (ROE < 0)"
                value={data.risk.lossRatio}
                tone={data.risk.lossRatio > 0.1 ? "negative" : "neutral"}
              />
              <RiskBar
                label="P/VP < 1 (subvalorizadas)"
                value={data.risk.distressedRatio}
                tone={data.risk.distressedRatio > 0.1 ? "positive" : "neutral"}
              />
              <RiskBar
                label="Payout > 100%"
                value={data.risk.highPayoutCount / data.overall.coverage}
                tone="negative"
              />
            </div>
          </section>

          {/* Distribution */}
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Distribuição de P/L
            </h2>
            <div className="rounded-lg border border-hairline bg-surface p-4">
              <div className="space-y-2">
                {data.distribution.map((d) => {
                  const maxCount = Math.max(...data.distribution.map((x) => x.count));
                  const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                  return (
                    <div key={d.bucket} className="flex items-center gap-3">
                      <div className="w-20 text-xs font-mono text-muted">
                        {d.bucket}
                      </div>
                      <div className="flex-1 h-6 bg-surface-elevated/60 rounded relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3 text-xs font-mono">
                          {d.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Sector breakdown */}
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Evolução Histórica
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HistoricalCard title="P/L Mediano (S&P 500)" endpoint="/api/market/history?metric=pe" color="text-blue-400" />
              <HistoricalCard title="P/VP Mediano (S&P 500)" endpoint="/api/market/history?metric=pvp" color="text-purple-400" />
              <HistoricalCard title="ROE Mediano" endpoint="/api/market/history?metric=roe" color="text-green-400" />
              <HistoricalCard title="Dividend Yield Mediano" endpoint="/api/market/history?metric=dy" color="text-cyan-400" />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Por Setor
            </h2>
            <div className="rounded-lg border border-hairline bg-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-background/30">
                    <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      Setor
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      # Ações
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      Market Cap
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      P/L Med.
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      P/VP Med.
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      EV/EBITDA
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      ROE Med.
                    </th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
                      Rev Growth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.sectors)
                    .sort((a, b) => b[1].marketCap - a[1].marketCap)
                    .map(([name, s]) => (
                      <tr
                        key={name}
                        className="border-b border-hairline-subtle/50 hover:bg-surface-elevated/40"
                      >
                        <td className="px-3 py-2 font-medium">{name}</td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-xs text-body">
                          {s.count}
                        </td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-xs">
                          {formatCompact(s.marketCap)}
                        </td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-xs">
                          {s.peMedian > 0 ? s.peMedian.toFixed(1) : "—"}
                        </td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-xs">
                          {s.pbMedian > 0 ? s.pbMedian.toFixed(2) : "—"}
                        </td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-xs">
                          {s.evEbitdaMedian > 0 ? s.evEbitdaMedian.toFixed(1) : "—"}
                        </td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-xs">
                          {s.roeMedian > 0
                            ? `${(s.roeMedian * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td
                          className={cn(
                            "text-right px-3 py-2 font-mono tabular-nums text-xs",
                            s.revGrowthMedian > 0.1 ? "text-positive" : "text-muted",
                          )}
                        >
                          {isFinite(s.revGrowthMedian)
                            ? `${(s.revGrowthMedian * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Movers */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MoverPanel
              title="Top Gainers"
              icon={<TrendingUp className="w-4 h-4 text-positive" />}
              items={data.gainers}
              tone="positive"
            />
            <MoverPanel
              title="Top Losers"
              icon={<TrendingDown className="w-4 h-4 text-negative" />}
              items={data.losers}
              tone="negative"
            />
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted mb-1">
        {label}
      </div>
      <div className="text-2xl font-mono font-semibold tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-muted mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function HistoricalCard({
  title,
  endpoint,
  color,
}: {
  title: string;
  endpoint: string;
  color?: string;
}) {
  const { data, isLoading } = useSWR<{ history: { date: string; value: number }[] }>(
    endpoint,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );
  const history = data?.history ?? [];
  const w = 400;
  const h = 140;
  const vals = history.map((p) => p.value).filter((v) => isFinite(v));
  const min = vals.length > 0 ? Math.min(...vals) : 0;
  const max = vals.length > 0 ? Math.max(...vals) : 1;
  const range = max - min || 1;
  const points = vals
    .map(
      (v, i) =>
        `${(i / Math.max(1, vals.length - 1)) * w},${h - ((v - min) / range) * h}`,
    )
    .join(" ");
  const latest = vals[vals.length - 1];
  const first = vals[0];
  const change = first && latest ? ((latest - first) / first) * 100 : 0;

  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wider text-muted font-medium">
          {title}
        </h3>
        {!isLoading && latest != null && (
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              change >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="relative h-[140px] bg-background/30 rounded">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            Carregando…
          </div>
        ) : vals.length < 2 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            Sem dados suficientes
          </div>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className={color || "text-ink"}
            />
          </svg>
        )}
      </div>
      {!isLoading && history.length >= 2 && (
        <div className="flex justify-between text-[10px] font-mono text-muted mt-1.5">
          <span>{history[0].date}</span>
          <span>{history[history.length - 1].date}</span>
        </div>
      )}
    </div>
  );
}

function RiskBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "warning" | "neutral";
}) {
  const pct = Math.min(value * 100, 100);
  const toneClass = {
    positive: "bg-positive",
    negative: "bg-negative",
    warning: "bg-yellow-500",
    neutral: "bg-blue-500",
  }[tone];
  return (
    <div className="rounded-lg border border-hairline bg-surface p-3">
      <div className="text-xs text-muted mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-xl font-mono font-semibold tabular-nums">
          {(value * 100).toFixed(1)}%
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-surface-elevated/60 rounded-full overflow-hidden">
        <div className={cn("h-full", toneClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MoverPanel({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ symbol: string; price: number; changePercent: number }>;
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface">
      <div className="border-b border-hairline px-4 py-3 flex items-center gap-2">
        {icon}
        <h3 className="font-medium text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-border-subtle">
        {items.map((m) => (
          <Link
            key={m.symbol}
            href={`/asset/${m.symbol}`}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono font-semibold text-sm w-16">
                {m.symbol}
              </span>
              <span className="text-xs text-muted">
                ${m.price.toFixed(2)}
              </span>
            </div>
            <span
              className={cn(
                "font-mono tabular-nums text-sm",
                tone === "positive" ? "text-positive" : "text-negative",
              )}
            >
              {m.changePercent >= 0 ? "+" : ""}
              {m.changePercent.toFixed(2)}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}