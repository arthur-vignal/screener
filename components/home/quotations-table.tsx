"use client";

/**
 * QuotationsTable — tabela de cotações (coluna central da /home).
 *
 * Pack 2026-09-08 — refator /home:
 *   - Header minimalista: "Cotações oficiais" + "Página X de Y" compacto
 *   - 3 ícones à direita (lupa / classe / tipo) + paginação chevron
 *   - Sem input de busca permanente — abre como barra flutuante liquid glass
 *   - Filtro classe (ON/PN) e tipo (ação/fii/etf/bdr) via dropdown
 *     com checkbox. Default ação. Default classe = "auto" (sem filtro
 *     → mostra ticker de maior volume).
 *
 * Paginação client-side: o card traz todas as páginas da B3
 * (~335 stocks / 548 FIIs / 284 BDRs / 100 ETFs). Cada página tem 50
 * ativos. Cache local em `allRows` (no /home).
 *
 * Search cross-page: filtra em todas as páginas já cacheadas. Quando
 * não acha nada, dispara prefetch da próxima página em background.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LineChart,
  Search,
} from "lucide-react";

import { Delta } from "@/components/foundation/delta";
import { Skeleton } from "@/components/foundation/skeleton";
import { TickerLogo } from "@/components/foundation/ticker-logo";
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
  rows: QuoteRow[];
  allRows?: QuoteRow[];
  onSearchMissNextPage?: () => void;
  hasMorePages?: boolean;
  loadingPageNav?: boolean;
  loading?: boolean;
  onRetry?: () => void;
  className?: string;
  assetType?: "stock" | "fii" | "etf" | "bdr";
  onAssetTypeChange?: (v: "stock" | "fii" | "etf" | "bdr") => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

/** Item de filtro com checkbox (compartilhado pelos dropdowns de classe e tipo). */
function CheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04] accent-[var(--primary)] cursor-pointer"
      />
      <div className="flex flex-col">
        <span className="text-[12px] text-foreground font-medium">{label}</span>
        {description && (
          <span className="text-[10px] text-muted-foreground/70">{description}</span>
        )}
      </div>
    </label>
  );
}

/** Classifica ticker pelo último dígito. ON=3, PN=4/5/6. */
function getClass(symbol: string): "on" | "pn" | null {
  const last = symbol.slice(-1);
  if (last === "3") return "on";
  if (last === "4" || last === "5" || last === "6") return "pn";
  return null;
}

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
  // ── State local pra filtros cliente-side ────────────────────────────────
  const [classFilter, setClassFilter] = useState<{ on: boolean; pn: boolean }>({
    on: false,
    pn: false,
  });
  const [typeFilter, setTypeFilter] = useState({
    stock: true,
    fii: false,
    etf: false,
    bdr: false,
  });

  // ── Dropdowns: state de open + refs pra click-outside ───────────────────
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);
  const typeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const classMenuRef = useRef<HTMLDivElement | null>(null);
  const classTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Click-outside + Escape handler único pros 3 popovers.
  useEffect(() => {
    if (!typeMenuOpen && !classMenuOpen && !searchOpen) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (searchOpen) {
        const inOverlay = searchOverlayRef.current?.contains(target);
        const inTrigger = searchTriggerRef.current?.contains(target);
        if (!inOverlay && !inTrigger) setSearchOpen(false);
      }
      if (typeMenuOpen) {
        const inMenu = typeMenuRef.current?.contains(target);
        const inTrigger = typeTriggerRef.current?.contains(target);
        if (!inMenu && !inTrigger) setTypeMenuOpen(false);
      }
      if (classMenuOpen) {
        const inMenu = classMenuRef.current?.contains(target);
        const inTrigger = classTriggerRef.current?.contains(target);
        if (!inMenu && !inTrigger) setClassMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setTypeMenuOpen(false);
        setClassMenuOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [typeMenuOpen, classMenuOpen, searchOpen]);

  // Auto-focus no input quando a barra de busca abre.
  useEffect(() => {
    if (searchOpen) {
      const id = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [searchOpen]);

  // ── Filtros aplicados ───────────────────────────────────────────────────
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
  if (rows.length === 0 && !loadingPageNav) {
    return <EmptyTable onRetry={onRetry} className={className} />;
  }

  const showPagination = totalPages > 1 && onPageChange !== undefined;
  const searchActive = normalizedSearch !== "";
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  const typeSelectedCount = Object.values(typeFilter).filter(Boolean).length;
  const classSelectedCount =
    (classFilter.on ? 1 : 0) + (classFilter.pn ? 1 : 0);
  const classAuto = classSelectedCount === 0;

  let displayRows = filteredRows;

  // Filtro de tipo (checkbox multiselect).
  if (typeSelectedCount > 0) {
    displayRows = displayRows.filter((r) => {
      if (r.type === "stock" && typeFilter.stock) return true;
      if (r.type === "fii" && typeFilter.fii) return true;
      if (r.type === "etf" && typeFilter.etf) return true;
      if (r.type === "bdr" && typeFilter.bdr) return true;
      return false;
    });
  }

  // Filtro de classe (ON/PN).
  if (!classAuto && !searchActive) {
    displayRows = displayRows.filter((r) => {
      const c = getClass(r.symbol);
      if (c === "on" && classFilter.on) return true;
      if (c === "pn" && classFilter.pn) return true;
      return false;
    });
  } else if (classAuto && !searchActive && displayRows.length > 1) {
    // Auto = sem filtro marcado. Para tickers com ON/PN pares (PETR3/PETR4),
    // mostra só o de maior volume.
    const symbolMap = new Map<string, QuoteRow[]>();
    for (const r of displayRows) {
      const stripped = r.symbol.replace(/[3-6]$/, "");
      const arr = symbolMap.get(stripped) ?? [];
      arr.push(r);
      symbolMap.set(stripped, arr);
    }
    const deduped: QuoteRow[] = [];
    for (const group of symbolMap.values()) {
      if (group.length === 1) {
        deduped.push(group[0]!);
        continue;
      }
      const sorted = [...group].sort(
        (a, b) => (b.volume ?? 0) - (a.volume ?? 0),
      );
      deduped.push(sorted[0]!);
    }
    deduped.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    displayRows = deduped;
  }

  // Labels compactos pros badges dos triggers.
  const classLabel = !classAuto
    ? classFilter.on && classFilter.pn
      ? "ON·PN"
      : classFilter.on
        ? "ON"
        : "PN"
    : "auto";
  const typeLabel =
    typeSelectedCount === 0
      ? "todas"
      : typeSelectedCount === 4
        ? "todas"
        : (Object.entries(typeFilter) as Array<
            [keyof typeof typeFilter, boolean]
          >)
            .filter(([, v]) => v)
            .map(([k]) =>
              k === "stock"
                ? "ação"
                : k === "fii"
                  ? "fii"
                  : k === "etf"
                    ? "etf"
                    : "bdr",
            )
            .join("+");

  return (
    <div
      className={cn(
        "relative rounded-2xl fey-card overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* ── Header (sem labels "Cotações oficiais" / contagem, pedido 2026-09-10) ── */}
      <div className="px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
          </div>

          {/* Toolbar: ícones + paginação */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            {/* Search trigger */}
            {onSearchChange && (
              <button
                ref={searchTriggerRef}
                type="button"
                onClick={() => {
                  setSearchOpen((o) => !o);
                  setTypeMenuOpen(false);
                  setClassMenuOpen(false);
                }}
                aria-label="Buscar ativo"
                aria-expanded={searchOpen}
                className={cn(
                  "relative inline-flex items-center justify-center h-8 w-8 rounded-md border bg-white/[0.04] transition-colors",
                  searchOpen
                    ? "border-white/25 bg-white/[0.08] text-foreground"
                    : "border-white/10 text-foreground/85 hover:bg-white/[0.08] hover:border-white/20",
                )}
              >
                <Search className="h-3.5 w-3.5" strokeWidth={2} />
                {searchActive && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
                  />
                )}
              </button>
            )}

            {/* Class filter (ON/PN) */}
            <div className="relative">
              <button
                ref={classTriggerRef}
                type="button"
                onClick={() => {
                  setClassMenuOpen((o) => !o);
                  setTypeMenuOpen(false);
                  setSearchOpen(false);
                }}
                aria-label="Filtrar classe de ação"
                aria-expanded={classMenuOpen}
                className={cn(
                  "relative inline-flex items-center justify-center h-8 w-8 rounded-md border bg-white/[0.04] transition-colors",
                  classMenuOpen || !classAuto
                    ? "border-white/25 bg-white/[0.08] text-foreground"
                    : "border-white/10 text-foreground/85 hover:bg-white/[0.08] hover:border-white/20",
                )}
                title={`Classe: ${classLabel}`}
              >
                <LineChart className="h-3.5 w-3.5" strokeWidth={2} />
                {!classAuto && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 px-1 rounded-full text-[9px] font-semibold leading-tight bg-[var(--primary)] text-[#070709]"
                  >
                    {classFilter.on && classFilter.pn
                      ? "·"
                      : classFilter.on
                        ? "3"
                        : "4"}
                  </span>
                )}
              </button>
              {classMenuOpen && (
                <div
                  ref={classMenuRef}
                  role="menu"
                  className={cn(
                    "absolute right-0 top-9 z-40 min-w-[180px]",
                    "rounded-md bg-[#101116]/95 backdrop-blur-md border border-white/10",
                    "shadow-2xl overflow-hidden",
                  )}
                >
                  <div className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold">
                    Classe de ação
                  </div>
                  <CheckboxRow
                    label="ON"
                    description="Termina em 3"
                    checked={classFilter.on}
                    onChange={(v) =>
                      setClassFilter((p) => ({ ...p, on: v }))
                    }
                  />
                  <CheckboxRow
                    label="PN"
                    description="Termina em 4/5"
                    checked={classFilter.pn}
                    onChange={(v) =>
                      setClassFilter((p) => ({ ...p, pn: v }))
                    }
                  />
                  <div className="px-3 py-2 text-[10px] text-muted-foreground/60 border-t border-white/5">
                    Sem seleção = maior volume
                  </div>
                </div>
              )}
            </div>

            {/* Type filter (stock/fii/etf/bdr) */}
            <div className="relative">
              <button
                ref={typeTriggerRef}
                type="button"
                onClick={() => {
                  setTypeMenuOpen((o) => !o);
                  setClassMenuOpen(false);
                  setSearchOpen(false);
                }}
                aria-label="Filtrar tipo de ativo"
                aria-expanded={typeMenuOpen}
                className={cn(
                  "relative inline-flex items-center justify-center h-8 w-8 rounded-md border bg-white/[0.04] transition-colors",
                  typeMenuOpen || typeSelectedCount !== 1 || !typeFilter.stock
                    ? "border-white/25 bg-white/[0.08] text-foreground"
                    : "border-white/10 text-foreground/85 hover:bg-white/[0.08] hover:border-white/20",
                )}
                title={`Tipo: ${typeLabel}`}
              >
                <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                {typeSelectedCount > 1 && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[9px] font-semibold leading-tight flex items-center justify-center bg-[var(--primary)] text-[#070709]"
                  >
                    {typeSelectedCount}
                  </span>
                )}
              </button>
              {typeMenuOpen && (
                <div
                  ref={typeMenuRef}
                  role="menu"
                  className={cn(
                    "absolute right-0 top-9 z-40 min-w-[200px]",
                    "rounded-md bg-[#101116]/95 backdrop-blur-md border border-white/10",
                    "shadow-2xl overflow-hidden",
                  )}
                >
                  <div className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold border-b border-white/5">
                    Tipo de ativo
                  </div>
                  <CheckboxRow
                    label="Ação"
                    checked={typeFilter.stock}
                    onChange={(v) =>
                      setTypeFilter((p) => ({ ...p, stock: v }))
                    }
                  />
                  <CheckboxRow
                    label="FII"
                    description="Fundo imobiliário"
                    checked={typeFilter.fii}
                    onChange={(v) =>
                      setTypeFilter((p) => ({ ...p, fii: v }))
                    }
                  />
                  <CheckboxRow
                    label="ETF"
                    description="Fundo de índice"
                    checked={typeFilter.etf}
                    onChange={(v) =>
                      setTypeFilter((p) => ({ ...p, etf: v }))
                    }
                  />
                  <CheckboxRow
                    label="BDR"
                    description="Brazilian Depositary Receipt"
                    checked={typeFilter.bdr}
                    onChange={(v) =>
                      setTypeFilter((p) => ({ ...p, bdr: v }))
                    }
                  />
                </div>
              )}
            </div>

            {/* Pagination chevrons */}
            {showPagination && onPageChange && (
              <>
                <button
                  type="button"
                  onClick={() => !atStart && onPageChange(page - 1)}
                  disabled={atStart}
                  aria-label="Página anterior"
                  className={cn(
                    "inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors",
                    atStart
                      ? "border-white/5 text-muted-foreground/40 cursor-not-allowed"
                      : "border-white/10 text-foreground/85 hover:bg-white/[0.08] hover:border-white/20",
                  )}
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <span className="text-[11px] tabular-nums text-muted-foreground/85 font-medium px-1 min-w-[40px] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => !atEnd && onPageChange(page + 1)}
                  disabled={atEnd}
                  aria-label="Próxima página"
                  className={cn(
                    "inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors",
                    atEnd
                      ? "border-white/5 text-muted-foreground/40 cursor-not-allowed"
                      : "border-white/10 text-foreground/85 hover:bg-white/[0.08] hover:border-white/20",
                  )}
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Search overlay (liquid glass) — aparece sobre o header ── */}
        {searchOpen && onSearchChange && (
          <div
            ref={searchOverlayRef}
            className="absolute left-3 right-3 top-[68px] z-30 animate-[liquidGlassIn_200ms_ease-out]"
          >
            <div className="rounded-lg bg-[#0e0f13]/85 backdrop-blur-md border border-white/15 shadow-2xl px-3 py-2 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar ativo, setor..."
                className="flex-1 bg-transparent border-0 outline-none text-[13px] text-foreground placeholder:text-muted-foreground/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-[10px] text-muted-foreground/70 hover:text-foreground"
                >
                  limpar
                </button>
              )}
              <kbd className="hidden md:inline-block text-[10px] text-muted-foreground/60 px-1.5 py-0.5 rounded border border-white/10">
                Esc
              </kbd>
            </div>
          </div>
        )}
      </div>

      {/* ── Table (sem scroll interno — pedido 2026-09-10. Se a lista
          passar do card, a página inteira rola, evitando 2 scrollbars
          conflitando) ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">
              <th className="text-left px-4 py-2 font-medium">Ativo</th>
              <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Setor</th>
              <th className="text-right px-3 py-2 font-medium">24h</th>
              <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">7D</th>
              <th className="text-right px-3 py-2 font-medium hidden md:table-cell">30D</th>
              <th className="text-right px-3 py-2 font-medium hidden lg:table-cell">Vol</th>
              <th className="text-right px-4 py-2 font-medium hidden lg:table-cell">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-12 text-[13px] text-muted-foreground/60"
                >
                  Nenhum ativo encontrado
                </td>
              </tr>
            ) : (
              displayRows.map((r) => <QuoteRowComponent key={r.symbol} row={r} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuoteRowComponent({ row }: { row: QuoteRow }): JSX.Element {
  const sym = row.symbol;
  return (
    <tr className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-2.5">
        <Link
          href={`/asset/${sym}`}
          className="flex items-center gap-2.5 min-w-0 group"
        >
          <TickerLogo symbol={sym} className="h-6 w-6 rounded-md overflow-hidden shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tabular-nums text-foreground group-hover:text-white truncate">
              {sym}
            </div>
            <div className="text-[11px] text-muted-foreground/70 truncate max-w-[160px]">
              {formatCompanyName(row.longName)}
            </div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2.5 text-[11px] text-muted-foreground/80 hidden md:table-cell">
        {row.sector}
      </td>
      <td className="px-3 py-2.5 text-right">
        {row.changePercent != null ? (
          <Delta value={row.changePercent} showIcon={false} className="text-[12px] font-semibold tabular-nums" />
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right hidden sm:table-cell">
        {row.changePercent7d != null ? (
          <Delta value={row.changePercent7d} showIcon={false} className="text-[11px] font-medium tabular-nums text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right hidden md:table-cell">
        {row.changePercent30d != null ? (
          <Delta value={row.changePercent30d} showIcon={false} className="text-[11px] font-medium tabular-nums text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[11px] text-foreground/85 hidden lg:table-cell">
        {row.volume != null ? formatVolume(row.volume) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-[11px] text-foreground/85 hidden lg:table-cell">
        {row.marketCap != null ? formatMarketCap(row.marketCap) : "—"}
      </td>
    </tr>
  );
}

function LoadingTable({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn("rounded-2xl fey-card p-4 flex flex-col gap-2", className)}>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-3 w-32" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function EmptyTable({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn("rounded-2xl fey-card p-8 flex flex-col items-center gap-3", className)}>
      <div className="text-[13px] text-muted-foreground">
        Sem cotações disponíveis
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-[12px] text-[var(--primary)] hover:underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function formatMarketCap(mc: number): string {
  if (mc >= 1e12) return `${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9) return `${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `${(mc / 1e6).toFixed(0)}M`;
  return String(mc);
}
