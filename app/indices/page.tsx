"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    change24h: -0.08,
  },
  {
    id: -4,
    slug: "global-momentum",
    name: "Global Momentum",
    description: "ETFs globais com momentum positivo em 6 meses.",
    methodology: "Mix de ETFs globais. Rebalanceamento mensal.",
    author: "platform",
    change24h: 0.85,
  },
];

export default function IndicesPage() {
  const { data } = useSWR<{ indices: Index[] }>(
    "/api/indices?scope=public",
    fetcher,
  );
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const userIndices = data?.indices ?? [];
  const showingUserIndices = userIndices.length > 0;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl">
      <PageHeader
        title="Indices"
        description={
          user
            ? "Seus índices + índices públicos da plataforma"
            : "Índices pré-definidos pela plataforma"
        }
        actions={
          <Link
            href="/indices/new"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-brand text-on-brand hover:bg-brand-bright transition-colors press text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo índice
          </Link>
        }
      />

      {!user && (
        <div className="mb-6 panel p-4 flex items-center justify-between border-brand/30 anime-fade-up">
          <div className="text-sm text-body">
            <strong className="text-ink">Crie sua conta</strong> pra criar
            índices custom e ver performance real.
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center h-8 px-3 rounded-md bg-brand text-on-brand hover:bg-brand-bright transition-colors press text-xs font-medium"
          >
            Criar agora
          </Link>
        </div>
      )}

      {showingUserIndices ? (
        <>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            {user ? "Meus índices" : "Índices da plataforma"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {userIndices.map((idx, i) => (
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
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {idx.isPublic ? (
                    <Badge tone="neutral">Público</Badge>
                  ) : (
                    <Badge tone="neutral">
                      <Lock className="w-2.5 h-2.5 mr-1" />
                      Privado
                    </Badge>
                  )}
                  <span className="text-xs text-muted">@{idx.owner ?? "anon"}</span>
                  <span className="text-xs text-muted">· {idx.topN} ativos</span>
                </div>
                {idx.description && (
                  <p className="text-sm text-body line-clamp-2">
                    {idx.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {!showingUserIndices && (
        <>
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">
            Pré-definidos
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
      )}
    </div>
  );
}
