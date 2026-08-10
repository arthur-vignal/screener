"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { B3_INDICES } from "@/lib/b3-indices";

type Index = {
  id: number;
  slug: string;
  name: string;
  description: string;
  universe: string;
  topN: number;
  isPublic: boolean;
  createdAt: number;
  owner: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SEED_INDICES = [
  {
    id: -1,
    slug: "sp500-momentum",
    name: "S&P 500 Momentum Score",
    description: "Top 50 ações do S&P 500 rankeadas por momentum 12-1.",
    methodology: "Universo: S&P 500. Critério: retorno 12 meses excluindo último mês. Top 50. Equal-weighted. Rebalanceamento mensal.",
    author: "platform",
    change24h: 0.42,
  },
  {
    id: -2,
    slug: "quality-value",
    name: "Quality-Value Composite",
    description: "Ações com ROE > 15% e P/E < 20, excluindo financials.",
    methodology: "Universo: S&P 500. Filtros: ROE TTM > 15%, P/E < 20. Equal-weighted. Rebalanceamento trimestral.",
    author: "platform",
    change24h: 0.18,
  },
  {
    id: -3,
    slug: "low-vol-defensive",
    name: "Low-Volatility Defensive",
    description: "Ações com baixa volatilidade histórica para proteção de capital.",
    methodology: "Universo: S&P 500. Ranking por volatilidade anualizada (menor melhor). Top 30. Equal-weighted.",
    author: "platform",
    change24h: -0.21,
  },
];

export default function IndicesPage() {
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [showingUserIndices, setShowingUserIndices] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="max-w-[1920px] mx-auto px-3 md:px-4 py-6 md:py-8">
      <PageHeader
        title="Indices"
        description="Crie screeners custom ou explore índices curados (Sulfur) e oficiais (B3)."
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setShowingUserIndices(false)}
            className={cn(
              "px-3 py-1.5 label-s border press",
              !showingUserIndices
                ? "border-ink text-ink bg-surface-elevated"
                : "border-hairline-strong text-muted hover:text-ink",
            )}
          >
            Pré-definidos
          </button>
          <button
            onClick={() => setShowingUserIndices(true)}
            className={cn(
              "px-3 py-1.5 label-s border press",
              showingUserIndices
                ? "border-ink text-ink bg-surface-elevated"
                : "border-hairline-strong text-muted hover:text-ink",
            )}
          >
            {user ? "Meus" : "Públicos"}
            {!user && <Lock className="inline w-3 h-3 ml-1" />}
          </button>
        </div>

        {user && (
          <Link href="/build" className="btn-primary inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Novo índice
          </Link>
        )}
      </div>

      {/* ===================== B3 OFFICIAL INDICES ===================== */}
      {!showingUserIndices && (
        <>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            Índices da B3
            <Badge tone="neutral" className="ml-2 text-[10px]">oficial</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {B3_INDICES.map((idx) => (
              <Link
                key={idx.code}
                href={`/indices/${idx.code.toLowerCase()}`}
                className="panel p-5 hover-lift group animate-fade-up"
              >
                <div className="flex items-start justify-between mb-2.5">
                  <h3 className="font-medium text-ink group-hover:text-brand-bright transition-colors duration-150">
                    {idx.code}
                  </h3>
                  <Badge tone="neutral" className="text-[9px]">
                    B3
                  </Badge>
                </div>
                <div className="text-xs text-muted mb-3">{idx.name}</div>
                <p className="text-sm text-body mb-3 line-clamp-2">{idx.description}</p>
                <div className="flex items-baseline justify-between pt-3 border-t border-hairline">
                  <span className="text-xs text-muted">
                    {idx.holdings.length} constituintes
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ===================== SEED / CUSTOM INDICES ===================== */}
      {!showingUserIndices ? (
        <>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            Pré-definidos (Sulfur)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SEED_INDICES.map((idx, i) => (
              <Link
                key={idx.id}
                href={`/indices/${idx.slug}`}
                className="panel p-5 hover-lift group animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <h3 className="font-medium text-ink group-hover:text-brand-bright transition-colors duration-150">
                    {idx.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted">por {idx.author}</span>
                </div>
                <p className="text-sm text-body mb-3 line-clamp-2">
                  {idx.description}
                </p>
                <div className="flex items-baseline justify-between pt-3 border-t border-hairline">
                  <span className="text-xs text-muted">{idx.methodology.slice(0, 60)}…</span>
                  <span
                    className={cn(
                      "text-sm font-tabular font-semibold",
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
        </>
      ) : (
        <UserIndices />
      )}
    </div>
  );
}

function UserIndices() {
  const { data, error, isLoading } = useSWR<{ indices: Index[] }>("/api/indices", fetcher);
  if (isLoading) return <div className="text-sm text-muted">Carregando…</div>;
  if (error || !data) return <div className="text-sm text-muted">Sem índices.</div>;
  if (data.indices.length === 0) {
    return (
      <div className="text-sm text-muted">
        Nenhum índice ainda. Crie um via{" "}
        <Link href="/build" className="link-underline text-ink">
          Build
        </Link>
        .
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.indices.map((idx, i) => (
        <Link
          key={idx.id}
          href={`/indices/${idx.slug}`}
          className="panel p-5 hover-lift group animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between mb-2.5">
            <h3 className="font-medium text-ink">{idx.name}</h3>
            <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
          </div>
          <p className="text-sm text-body mb-3 line-clamp-2">{idx.description}</p>
          <div className="flex items-baseline justify-between pt-3 border-t border-hairline">
            <span className="text-xs text-muted">top {idx.topN}</span>
            <span className="text-xs text-muted">{idx.universe}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
