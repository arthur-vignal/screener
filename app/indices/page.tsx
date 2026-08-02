"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowRight, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Indices</h1>
          <p className="text-sm text-text-secondary">
            {user
              ? "Seus índices + índices públicos da plataforma"
              : "Índices pré-definidos pela plataforma"}
          </p>
        </div>
        {user && (
          <Link
            href="/indices/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Novo índice
          </Link>
        )}
      </div>

      {!user && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center justify-between">
          <div className="text-sm">
            <strong className="text-foreground">Crie sua conta</strong> pra criar
            índices custom e ver performance real.
          </div>
          <Link
            href="/signup"
            className="text-xs px-3 py-1.5 rounded-md bg-foreground text-background"
          >
            Criar agora
          </Link>
        </div>
      )}

      {showingUserIndices ? (
        <>
          <h2 className="text-sm uppercase tracking-wider text-text-muted font-medium mb-3">
            {user ? "Meus índices" : "Índices da plataforma"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {userIndices.map((idx) => (
              <Link
                key={idx.id}
                href={`/indices/${idx.slug}`}
                className="rounded-lg border border-border bg-surface p-5 hover:border-foreground/30 hover:bg-surface-elevated transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {idx.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {idx.isPublic ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted uppercase tracking-wider">
                      Público
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted uppercase tracking-wider inline-flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Privado
                    </span>
                  )}
                  <span className="text-xs text-text-muted">@{idx.owner ?? "anon"}</span>
                  <span className="text-xs text-text-muted">· {idx.topN} ativos</span>
                </div>
                {idx.description && (
                  <p className="text-sm text-text-secondary line-clamp-2">
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
          <h2 className="text-sm uppercase tracking-wider text-text-muted font-medium mb-3">
            Pré-definidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SEED_INDICES.map((idx) => (
              <Link
                key={idx.id}
                href={`/indices/${idx.slug}`}
                className="rounded-lg border border-border bg-surface p-5 hover:border-foreground/30 hover:bg-surface-elevated transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {idx.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-text-muted">por {idx.author}</span>
                </div>
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                  {idx.description}
                </p>
                <div className="flex items-baseline justify-between pt-3 border-t border-border-subtle">
                  <span className="text-xs text-text-muted">{idx.methodology.slice(0, 60)}…</span>
                  <span
                    className={cn(
                      "text-sm font-mono font-semibold tabular-nums",
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
