"use client";

import { useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";



type IndexCategory = "predefined" | "community" | "yours";
type IndexEntry = {
  id: string;
  name: string;
  description: string;
  author: string;
  category: IndexCategory;
  sparkline: number[];
  change24h: number;
  methodology: string;
};

// Indices pré-definidos (placeholders — implementação futura)
const INDEXES: IndexEntry[] = [
  {
    id: "sp500-momentum",
    name: "S&P 500 Momentum Score",
    description:
      "Top 50 ações do S&P 500 rankeadas por momentum 12-1 (performance excluindo o último mês). Equal-weighted, rebalanceamento mensal.",
    author: "platform",
    category: "predefined",
    sparkline: Array.from({ length: 30 }, (_, i) => 100 + i * 0.5 + Math.sin(i / 3) * 3),
    change24h: 0.42,
    methodology:
      "Universo: S&P 500. Critério: retorno 12 meses excluindo último mês. Top 50. Equal-weighted. Rebalanceamento mensal. Sem alavancagem.",
  },
  {
    id: "quality-value",
    name: "Quality-Value Composite",
    description:
      "Ações com ROE > 15% e P/E < 20, excluindo financials. Foco em qualidade operacional + valuation.",
    author: "platform",
    category: "predefined",
    sparkline: Array.from({ length: 30 }, (_, i) => 100 + i * 0.3 + Math.sin(i / 4) * 2),
    change24h: 0.18,
    methodology:
      "Universo: S&P 500. Filtros: ROE TTM > 15%, P/E < 20, exclui Financials. Equal-weighted. Rebalanceamento trimestral.",
  },
  {
    id: "low-vol-defensive",
    name: "Low-Vol Defensive",
    description:
      "Bottom 20% por volatilidade 60d, com filtro de dividend yield mínimo de 1%.",
    author: "platform",
    category: "predefined",
    sparkline: Array.from({ length: 30 }, (_, i) => 100 + i * 0.2 + Math.sin(i / 5) * 1.5),
    change24h: -0.08,
    methodology:
      "Universo: Russell 1000. Filtros: volatilidade realizada 60d no bottom 20%, dividend yield > 1%. Equal-weighted. Rebalanceamento mensal.",
  },
  {
    id: "global-momentum",
    name: "Global Equity Momentum",
    description:
      "Ações de mercados desenvolvidos (US, EU, JP) com maior momentum 6-12m. FX-hedged.",
    author: "platform",
    category: "predefined",
    sparkline: Array.from({ length: 30 }, (_, i) => 100 + i * 0.4 + Math.sin(i / 3) * 4),
    change24h: 0.85,
    methodology:
      "Universo: MSCI World. Filtros: momentum 6-12m. Top 50. FX-hedged via forwards 1m. Equal-weighted.",
  },
  {
    id: "crypto-top10",
    name: "Crypto Top 10 Equal Weight",
    description:
      "Top 10 criptomoedas por market cap, equal-weighted, rebalanceamento semanal.",
    author: "platform",
    category: "predefined",
    sparkline: Array.from({ length: 30 }, (_, i) => 100 + i * 1.2 + Math.sin(i / 2) * 8),
    change24h: 1.32,
    methodology:
      "Universo: top 10 cryptos por market cap. Equal-weighted. Rebalanceamento semanal. Exclui stablecoins.",
  },
];

export default function IndexListPage() {
  const [filter, setFilter] = useState<IndexCategory | "all">("all");

  const filtered = INDEXES.filter((i) => filter === "all" || i.category === filter);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Index</h1>
        <p className="text-sm text-text-secondary">
          Índices financeiros, econômicos e customizados. Visualize metodologia e composição.
        </p>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-surface border border-border rounded-md p-0.5 w-fit">
        {[
          { value: "all", label: "Todos" },
          { value: "predefined", label: "Pré-definidos" },
          { value: "community", label: "Comunidade" },
          { value: "yours", label: "Seus" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as IndexCategory | "all")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded transition-colors",
              filter === f.value
                ? "bg-foreground text-background"
                : "text-text-secondary hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((idx) => (
          <Link
            key={idx.id}
            href={`/indices/${idx.id}`}
            className="rounded-lg border border-border bg-surface p-5 hover:border-foreground/30 hover:bg-surface-elevated transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                {idx.name}
              </h3>
              <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-xs text-text-muted mb-3 line-clamp-2">
              {idx.description}
            </div>
            <div className="h-16 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={idx.sparkline.map((v, i) => ({ i, v }))}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={idx.change24h >= 0 ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-text-muted">por {idx.author}</span>
              <span
                className={cn(
                  "font-mono font-medium tabular-nums",
                  idx.change24h >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {idx.change24h >= 0 ? "+" : ""}
                {idx.change24h.toFixed(2)}% (24h)
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-border-subtle bg-surface-elevated/40 p-6 flex items-start gap-4">
        <Info className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
        <div className="text-sm text-text-secondary">
          <p className="mb-2">
            <strong className="text-foreground">Criação de índices</strong> virá em uma próxima
            fase. Hoje mostramos apenas índices pré-definidos pela plataforma.
          </p>
          <p>
            Quando disponível, você poderá definir universo, filtros (P/E, ROE, setor), critérios
            de ranking (momentum, valor, qualidade) e frequência de rebalanceamento.
          </p>
        </div>
      </div>
    </div>
  );
}
