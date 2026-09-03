"use client";

/**
 * QuotationsTable — tabela de cotações (coluna central da /home).
 *
 * Layout 3-coluna Fey-style:
 *   Coluna esquerda: ATIVO (bold) + nome longo muted
 *   Coluna central: SETOR (muted)
 *   Coluna direita: 24h | 7D | 30D | VOL | MKT CAP (variações coloridas + tabular-nums)
 *
 * Linhas clicáveis → /asset/[symbol].
 * Linhas com dados faltantes: muted, sem sinal.
 *
 * Paginação client-side (2026-08-31): o card traz todas as páginas da B3
 * (~335 stocks / 548 FIIs / 284 BDRs / 100 ETFs). Cada página tem 50
 * ativos. Cache local em `allRows` (no /home) — prefetch sob demanda
 * ao scrollar/navegar.
 *
 * Search cross-page: filtra em todas as páginas já cacheadas. Quando
 * não acha nada, dispara prefetch da próxima página em background
 * (até esgotar todas). Quando ainda não acha, mostra empty state
 * com mensagem específica.
 *
 * Coluna do meio (search + type filter) fica em <HomeMain>.
 */

import Link from "next/link";
import { useEffect } from "react";
import type { JSX } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Delta } from "@/components/foundation/delta";
import { Skeleton } from "@/components/foundation/skeleton";
import { TickerLogo } from "@/components/foundation/ticker-logo";
import { SegmentedControl } from "@/components/foundation/segmented-control";
import { formatCompanyName } from "@/lib/company-name";
import { cn } from "@/lib/utils";

export type QuoteRow = {
  symbol: string;
  longName: string | null;
  sector: string;
  price: number | null;
  currency: "BRL" | "USD";
  changePercent: number | null; // 24h
  changePercent7d: number | null;
  changePercent30d: number | null;
  volume: number | null;
  marketCap: number | null;
  type: "stock" | "fii" | "etf" | "bdr";
};

type Props = {
  /** Rows da página atual. Renderizadas quando search está vazia. */
  rows: QuoteRow[];
  /**
   * Rows de TODAS as páginas já cacheadas no /home. Usado pelo
   * search cross-page (filtra em todas). Opcional — sem isso,
   * search filtra só em `rows`.
   */
  allRows?: QuoteRow[];
  /**
   * Callback quando search não acha nada em `allRows` e ainda há
   * páginas não carregadas — dispara prefetch da próxima em
   * background. Opcional.
   */
  onSearchMissNextPage?: () => void;
  /** Tem mais páginas não carregadas? Usado pra decidir se vale prefetch. */
  hasMorePages?: boolean;
  /** Carregando a próxima página em background (search miss). */
  loadingPageNav?: boolean;
  loading?: boolean;
  /** Callback de retry quando erro. */
  onRetry?: () => void;
  className?: string;
  /** Tipo de ativo selecionado. */
  assetType?: "stock" | "fii" | "etf" | "bdr";
  onAssetTypeChange?: (v: "stock" | "fii" | "etf" | "bdr") => void;
  /** Search query (controlada externamente). */
  search?: string;
  onSearchChange?: (v: string) => void;
  /** Paginação. `page` é 1-indexed. */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

export function QuotationsTable({
  rows,
  allRows,
  onSearchMissNextPage,
  hasMorePages,
  loadingPageNav = false,
  loading,
  onRetry,
  className,
  assetType = "stock",
  onAssetTypeChange,
  search = "",
  onSearchChange,
  page = 1,
  totalPages = 1,
  onPageChange,
}: Props): JSX.Element {
  // Search cross-page:
  //   - search vazia → mostra rows da página atual
  //   - search com texto → filtra em allRows (cache de páginas já
  //     carregadas). 0 matches + hasMorePages → prefetch.
  const normalizedSearch = search.trim().toLowerCase();
  const baseRows =
    normalizedSearch && allRows && allRows.length > 0 ? allRows : rows;
  const filteredRows = normalizedSearch
    ? baseRows.filter((r) => {
        const sym = r.symbol.toLowerCase();
        const nameRaw = (r.longName ?? "").toLowerCase();
        const nameFmt = formatCompanyName(r.longName).toLowerCase();
        return (
          sym.includes(normalizedSearch) ||
          nameRaw.includes(normalizedSearch) ||
          nameFmt.includes(normalizedSearch)
        );
      })
    : rows;

  useEffect(() => {
      if (!normalizedSearch || !onSearchMissNextPage || loadingPageNav) return;
      // Continua avançando página se filteredRows não tem match exato com a busca.
      // Critério conservador: se não tem match exato no símbolo OU longName, prefetch.
      const exactMatch = filteredRows.some(
        (r) =>
          r.symbol.toLowerCase() === normalizedSearch ||
          (r.longName ?? "").toLowerCase().includes(normalizedSearch),
      );
      if (filteredRows.length === 0 || (!exactMatch && hasMorePages)) {
        onSearchMissNextPage();
      }
    }, [
      normalizedSearch,
      filteredRows,
      hasMorePages,
      onSearchMissNextPage,
      loadingPageNav,
    ]);

  if (loading) return <LoadingTable className={className} />;
    // EmptyTable só aparece quando NÃO está carregando próxima página
    // (senão a /home mostra 'Sem cotações' entre cliques de paginação).
    if (rows.length === 0 && !loadingPageNav)
      return <EmptyTable onRetry={onRetry} className={className} />;

  const showPagination = totalPages > 1 && onPageChange !== undefined;
  const searchActive = normalizedSearch !== "";

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] overflow-hidden flex flex-col",
        className
      )}
    >
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
              Cotações oficiais
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/70 tabular-nums">
              {searchActive
                ? `${filteredRows.length} de ${(allRows ?? rows).length} ativos`
                : showPagination
                  ? `Página ${page} de ${totalPages}`
                  : `${rows.length} ativos`}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {showPagination && (
              <PaginationNav
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
                loading={loadingPageNav}
              />
            )}
            {onAssetTypeChange && (
              <SegmentedControl
                value={assetType}
                onChange={(v) =>
                  onAssetTypeChange(v as "stock" | "fii" | "etf" | "bdr")
                }
                segments={[
                  { value: "stock", label: "Ações" },
                  { value: "fii", label: "FIIs" },
                  { value: "etf", label: "ETFs" },
                  { value: "bdr", label: "BDRs" },
                ]}
              />
            )}
            {onSearchChange && (
              <SearchBox value={search} onChange={onSearchChange} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_repeat(5,minmax(0,0.8fr))] gap-3">
          <HeaderCell>Ativo</HeaderCell>
          <HeaderCell>Setor</HeaderCell>
          <HeaderCell align="right">24h</HeaderCell>
          <HeaderCell align="right">7D</HeaderCell>
          <HeaderCell align="right">30D</HeaderCell>
          <HeaderCell align="right">Vol</HeaderCell>
          <HeaderCell align="right">Mkt cap</HeaderCell>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {filteredRows.map((row) => (
          <Row key={row.symbol} row={row} />
        ))}
        {filteredRows.length === 0 && search.trim() !== "" && (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-foreground">
              Nenhum ativo encontrado para &quot;{search}&quot;.
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/85">
              {loadingPageNav
                ? "Buscando em outras páginas…"
                : hasMorePages
                  ? "Buscando em outras páginas automaticamente…"
                  : "Busca por símbolo (ex: PETR4) ou nome da empresa."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PaginationNav({
  page,
  totalPages,
  onPageChange,
  loading,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  loading?: boolean;
}): JSX.Element {
  const atStart = page <= 1;
  const atEnd = page >= totalPages;
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => !atStart && onPageChange(page - 1)}
        disabled={atStart || loading}
        className={cn(
          "inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-white/[0.04] text-foreground/85 hover:bg-white/[0.08] hover:border-white/20 transition-colors",
          (atStart || loading) && "opacity-40 cursor-not-allowed",
        )}
        title="Página anterior"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="px-2 text-[11px] tabular-nums text-muted-foreground/85 min-w-[64px] text-center">
        {page} / {totalPages}
      </div>
      <button
        type="button"
        onClick={() => !atEnd && onPageChange(page + 1)}
        disabled={atEnd || loading}
        className={cn(
          "inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-white/[0.04] text-foreground/85 hover:bg-white/[0.08] hover:border-white/20 transition-colors",
          (atEnd || loading) && "opacity-40 cursor-not-allowed",
        )}
        title="Próxima página"
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function HeaderCell({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}): JSX.Element {
  return (
    <div
      className={cn(
        "text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold",
        align === "right" && "text-right"
      )}
    >
      {children}
    </div>
  );
}

function Row({ row }: { row: QuoteRow }): JSX.Element {
  const priceStr = formatPrice(row.price, row.currency);
  const hasPrice = row.price != null;

  return (
    <Link
      href={`/asset/${row.symbol}`}
      className={cn(
        "grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_repeat(5,minmax(0,0.8fr))] gap-4 px-5 py-4",
        "border-b border-border/40 last:border-b-0",
        "items-center transition-colors hover:bg-white/[0.02]",
        !hasPrice && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <TickerLogo symbol={row.symbol} size="md" />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-foreground truncate">
            {row.symbol}
          </div>
          {row.longName && (
            <div className="text-[12px] text-muted-foreground/85 truncate">
              {formatCompanyName(row.longName)}
            </div>
          )}
        </div>
      </div>

      <div className="text-[13px] text-muted-foreground/85 truncate">
        {row.sector}
      </div>

      <DeltaCell value={row.changePercent} />
      <DeltaCell value={row.changePercent7d} />
      <DeltaCell value={row.changePercent30d} />

      <div className="text-[13px] tabular-nums text-muted-foreground/85 text-right">
        {row.volume != null ? formatCompact(row.volume) : "—"}
      </div>

      <div className="text-[13px] tabular-nums text-foreground text-right">
        {row.marketCap != null ? formatCompact(row.marketCap) : "—"}
      </div>
    </Link>
  );
}

function DeltaCell({ value }: { value: number | null }): JSX.Element {
  if (value == null) {
    return (
      <div className="text-[13px] tabular-nums text-muted-foreground/40 text-right">
        —
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <Delta value={value} unit="percent" size="md" />
    </div>
  );
}

// ─── Loading ────────────────────────────────────────────────────────────────

function LoadingTable({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] overflow-hidden p-2 flex flex-col",
        className
      )}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-2 py-3 border-b border-border/40 last:border-b-0"
        >
          <Skeleton roundedFull className="h-7 w-7" />
          <Skeleton className="h-3 w-16" />
          <div className="flex-1" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty ──────────────────────────────────────────────────────────────────

function EmptyTable({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#101116] px-6 py-12 text-center",
        className
      )}
    >
      <p className="text-[14px] text-foreground">Sem cotações no momento.</p>
      <p className="mt-2 text-[12px] text-muted-foreground/85">
        Pode ser horário de pré-mercado ou instabilidade na Brapi.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-4 inline-flex items-center justify-center h-9 px-3 rounded-md",
            "border border-white/10 bg-white/[0.04]",
            "text-[12px] font-medium text-foreground",
            "hover:bg-white/[0.08] transition-colors"
          )}
        >
          Recarregar
        </button>
      )}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <div className="relative">
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        strokeWidth={2}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar ativo, setor…"
        aria-label="Buscar"
        className={cn(
          "h-8 pl-8 pr-3 rounded-md",
          "bg-white/[0.02] border border-white/10",
          "text-[12px] text-foreground placeholder:text-muted-foreground/60",
          "focus:outline-none focus:border-white/20 focus:bg-white/[0.04]",
          "transition-colors w-[200px]"
        )}
      />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(v: number | null, currency: "BRL" | "USD"): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(0);
}