"use client";

export const dynamic = "force-dynamic";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";


// Mock index data — in a future version, fetch from API
const INDEXES_DATA: Record<string, {
  name: string;
  description: string;
  author: string;
  methodology: string;
  constituents: { symbol: string; weight: number }[];
  series: { date: string; value: number }[];
}> = {
  "sp500-momentum": {
    name: "S&P 500 Momentum Score",
    description:
      "Top 50 ações do S&P 500 rankeadas por momentum 12-1 (performance excluindo o último mês). Equal-weighted, rebalanceamento mensal.",
    author: "platform",
    methodology:
      "O índice usa momentum cross-sectional de 12 meses excluindo o último mês (evita reversal). A cada mês, selecionamos as 50 ações do S&P 500 com maior retorno 11-1. Pesos iguais. Sem alavancagem. Sem custos de transação no backtest (real-world seria ~0.1% mensal). O índice tem alta exposição a setores cíclicos.",
    constituents: [
      { symbol: "NVDA", weight: 0.025 },
      { symbol: "AAPL", weight: 0.023 },
      { symbol: "MSFT", weight: 0.022 },
      { symbol: "META", weight: 0.022 },
      { symbol: "AMZN", weight: 0.021 },
      { symbol: "TSLA", weight: 0.021 },
      { symbol: "GOOGL", weight: 0.020 },
      { symbol: "AVGO", weight: 0.020 },
      { symbol: "NFLX", weight: 0.020 },
      { symbol: "CRM", weight: 0.020 },
    ],
    series: generateMockSeries(180, 0.5, 8),
  },
  "quality-value": {
    name: "Quality-Value Composite",
    description: "Ações com ROE > 15% e P/E < 20, excluindo financials. Foco em qualidade operacional + valuation.",
    author: "platform",
    methodology:
      "Universo: S&P 500 (excluindo Financials e REITs). Critérios: ROE TTM > 15%, P/E TTM < 20. Top 30 por ordem de menor P/E. Equal-weighted. Rebalanceamento trimestral. Captura o value premium histórico e a qualidade operacional superior (fator Q de Asness).",
    constituents: [
      { symbol: "META", weight: 0.034 },
      { symbol: "JNJ", weight: 0.034 },
      { symbol: "KO", weight: 0.034 },
      { symbol: "PG", weight: 0.034 },
      { symbol: "ABBV", weight: 0.034 },
      { symbol: "PEP", weight: 0.034 },
      { symbol: "WMT", weight: 0.034 },
      { symbol: "MO", weight: 0.033 },
      { symbol: "PM", weight: 0.033 },
      { symbol: "HD", weight: 0.033 },
    ],
    series: generateMockSeries(180, 0.3, 5),
  },
  "low-vol-defensive": {
    name: "Low-Vol Defensive",
    description: "Bottom 20% por volatilidade 60d, com filtro de dividend yield mínimo de 1%.",
    author: "platform",
    methodology:
      "Universo: Russell 1000. Filtros: volatilidade realizada 60d no bottom 20%, dividend yield > 1%. Top 50. Equal-weighted. Rebalanceamento mensal. Baseado no low-volatility anomaly (Ang, Hodrick, Xing 2006). Defensivo em drawdowns.",
    constituents: [
      { symbol: "KO", weight: 0.025 },
      { symbol: "PEP", weight: 0.024 },
      { symbol: "JNJ", weight: 0.024 },
      { symbol: "PG", weight: 0.024 },
      { symbol: "VZ", weight: 0.023 },
      { symbol: "T", weight: 0.023 },
      { symbol: "MO", weight: 0.023 },
      { symbol: "PM", weight: 0.022 },
      { symbol: "CL", weight: 0.022 },
      { symbol: "XOM", weight: 0.022 },
    ],
    series: generateMockSeries(180, 0.2, 4),
  },
  "global-momentum": {
    name: "Global Equity Momentum",
    description: "Ações de mercados desenvolvidos (US, EU, JP) com maior momentum 6-12m. FX-hedged.",
    author: "platform",
    methodology:
      "Universo: MSCI World (~1.500 ações). Filtros: momentum 6-12m. Top 50. FX-hedged via forwards 1m. Equal-weighted. Rebalanceamento mensal. Captura prêmio global de momentum (Asness 2013 'Value and Momentum Everywhere').",
    constituents: [
      { symbol: "NVDA", weight: 0.022 },
      { symbol: "AAPL", weight: 0.020 },
      { symbol: "MSFT", weight: 0.020 },
      { symbol: "META", weight: 0.020 },
      { symbol: "ASML", weight: 0.020 },
      { symbol: "SAP", weight: 0.020 },
      { symbol: "TM", weight: 0.020 },
      { symbol: "MITSUB", weight: 0.020 },
      { symbol: "TSLA", weight: 0.020 },
      { symbol: "AMZN", weight: 0.020 },
    ],
    series: generateMockSeries(180, 0.4, 10),
  },
  "crypto-top10": {
    name: "Crypto Top 10 Equal Weight",
    description: "Top 10 criptomoedas por market cap, equal-weighted, rebalanceamento semanal.",
    author: "platform",
    methodology:
      "Universo: top 10 criptomoedas por market cap (CoinPaprika/CMC). Equal-weighted (10% cada). Exclui stablecoins (USDT, USDC, BUSD, DAI, TUSD). Rebalanceamento semanal. Sem alavancagem. Alta volatilidade (50-100% anualizado).",
    constituents: [
      { symbol: "BTC", weight: 0.10 },
      { symbol: "ETH", weight: 0.10 },
      { symbol: "BNB", weight: 0.10 },
      { symbol: "SOL", weight: 0.10 },
      { symbol: "XRP", weight: 0.10 },
      { symbol: "ADA", weight: 0.10 },
      { symbol: "AVAX", weight: 0.10 },
      { symbol: "DOGE", weight: 0.10 },
      { symbol: "TRX", weight: 0.10 },
      { symbol: "LINK", weight: 0.10 },
    ],
    series: generateMockSeries(180, 1.2, 18),
  },
};

function generateMockSeries(days: number, drift: number, vol: number) {
  // Deterministic pseudo-random based on index
  const out: { date: string; value: number }[] = [];
  let v = 100;
  const start = Date.now() - days * 24 * 60 * 60 * 1000;
  for (let i = 0; i < days; i++) {
    // deterministic noise
    const noise = (Math.sin(i * 0.3) + Math.cos(i * 0.7)) * vol * 0.3;
    v = v + drift + noise * 0.1;
    out.push({
      date: new Date(start + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      value: v,
    });
  }
  return out;
}

export default function IndexDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const data = useMemo(() => (id ? INDEXES_DATA[id] : null), [id]);

  if (!id) {
    return (
      <div className="px-8 py-12 text-center text-text-muted">Carregando…</div>
    );
  }

  if (!data) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-text-secondary">Índice não encontrado.</p>
        <Link href="/index" className="text-accent hover:underline text-sm mt-2 inline-block">
          ← Voltar para Index
        </Link>
      </div>
    );
  }

  const first = data.series[0]?.value ?? 100;
  const last = data.series[data.series.length - 1]?.value ?? 100;
  const change = ((last / first) - 1) * 100;
  const max = Math.max(...data.series.map((p) => p.value));
  const min = Math.min(...data.series.map((p) => p.value));
  const padding = (max - min) * 0.05 || 1;

  return (
    <div className="px-8 py-6 max-w-6xl">
      <Link
        href="/index"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </Link>

      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
      </div>
      <div className="text-sm text-text-muted mb-6">
        por <span className="text-text-secondary font-medium">{data.author}</span>
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border-subtle flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-mono font-semibold tabular-nums">
              {last.toFixed(2)}
            </div>
            <div className={cn(
              "text-sm font-mono tabular-nums",
              change >= 0 ? "text-positive" : "text-negative",
            )}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}% (período)
            </div>
          </div>
          <div className="text-xs text-text-muted">
            {data.series.length} dias de histórico
          </div>
        </div>
        <div className="px-4 py-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                minTickGap={50}
              />
              <YAxis
                domain={[min - padding, max + padding]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                formatter={(v) => Number(v).toFixed(2)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={change >= 0 ? "var(--positive)" : "var(--negative)"}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="O que mede">
            <p className="text-sm text-text-secondary leading-relaxed">{data.description}</p>
          </Section>

          <Section title="Metodologia (cálculo matemático)">
            <p className="text-sm text-text-secondary leading-relaxed">{data.methodology}</p>
          </Section>

          <Section title="Em quais cenários se aplica">
            <ul className="text-sm text-text-secondary leading-relaxed space-y-2 list-disc pl-5">
              <li>
                Mercados com momentum persistente (tendências claras de 6-12 meses).
              </li>
              <li>
                Períodos de baixa correlação cross-asset (ex: rotação setorial).
              </li>
              <li>
                Fase de mercado com dispersão alta (alguns ativos performam muito melhor que outros).
              </li>
            </ul>
            <p className="text-sm text-text-muted mt-3">
              <strong className="text-text-secondary">Quando não se aplica:</strong> mercados em
              regime de reversão rápida (ex: crashes de 1-2 semanas), crises de liquidez,
              períodos pré-mercado-emergente.
            </p>
          </Section>
        </div>

        <div>
          <Section title="Top constituintes">
            <div className="space-y-2">
              {data.constituents.map((c) => (
                <Link
                  key={c.symbol}
                  href={`/asset/${c.symbol}`}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-elevated transition-colors group"
                >
                  <span className="font-mono font-semibold text-sm group-hover:text-accent transition-colors">
                    {c.symbol}
                  </span>
                  <span className="font-mono tabular-nums text-xs text-text-muted">
                    {(c.weight * 100).toFixed(1)}%
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border-subtle text-xs text-text-muted">
              {data.constituents.length} de {data.constituents.length} mostrados. Pesos
              indicativos; atualizados por rebalanceamento.
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-foreground mb-3 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}
