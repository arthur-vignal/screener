"use client";

/**
 * MetricsTable — tabela detalhada estilo print AGRO3.
 *
 * Header sticky com search box + toggle BRL/USD vs Percent.
 * Linhas agrupadas por categoria (Valuation, Rentabilidade, etc).
 * Coluna METRICA + valor + delta + caret à direita.
 * Clicar linha navega pra drilldown correspondente.
 */

import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { JSX } from "react";

import { Delta } from "@/components/foundation/delta";
import { MetricGroupHeader } from "@/components/foundation/metric-row";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricRow = {
  /** Categoria (eyebrow). Ex: "Valuation". */
  group: string;
  /** Label principal. Ex: "P/L". */
  label: string;
  /** Sublabel muted. Ex: "trailing". */
  sublabel?: string;
  /** Drilldown destino. */
  href: string;
  /** Valor formatado em modo moeda. */
  valueCurrency?: string | null;
  /** Valor formatado em modo percentual. */
  valuePercent?: string | null;
  /** Valor formatado em modo múltiplo. */
  valueMultiple?: string | null;
  /** Delta % (opcional). */
  delta?: number | null;
};

type Props = {
  rows: MetricRow[];
  currency: "BRL" | "USD";
  loading?: boolean;
  className?: string;
};

export function MetricsTable({
  rows,
  currency,
  loading,
  className,
}: Props): JSX.Element {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"currency" | "percent" | "multiple">(
    "multiple"
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        (r.sublabel ?? "").toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q)
    );
  }, [rows, query]);

  // Agrupa linhas por categoria
  const grouped = useMemo(() => {
    const out: Array<{ group: string; rows: MetricRow[] }> = [];
    for (const r of filtered) {
      const last = out[out.length - 1];
      if (last && last.group === r.group) last.rows.push(r);
      else out.push({ group: r.group, rows: [r] });
    }
    return out;
  }, [filtered]);

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-[#101116]", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/40">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
            Métricas detalhadas
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground/70 tabular-nums">
            {filtered.length} métricas
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle value={mode} onChange={setMode} />
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
              strokeWidth={2}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar métrica…"
              aria-label="Buscar métrica"
              className={cn(
                "h-8 pl-8 pr-3 rounded-md w-[200px]",
                "bg-white/[0.02] border border-white/10",
                "text-[12px] text-foreground placeholder:text-muted-foreground/60",
                "focus:outline-none focus:border-white/20 focus:bg-white/[0.04]",
                "transition-colors"
              )}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <LoadingRows />
      ) : grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {grouped.map(({ group, rows: gRows }) => (
            <div key={group}>
              <MetricGroupHeader label={group} />
              {gRows.map((r, idx) => (
                <Row
                  key={`${group}-${idx}-${r.label}`}
                  row={r}
                  mode={mode}
                  currency={currency}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function Row({
  row,
  mode,
  currency,
}: {
  row: MetricRow;
  mode: "currency" | "percent" | "multiple";
  currency: "BRL" | "USD";
}): JSX.Element {
  const value =
    mode === "currency"
      ? row.valueCurrency ?? "—"
      : mode === "percent"
        ? row.valuePercent ?? "—"
        : row.valueMultiple ?? "—";

  return (
    <a
      href={row.href}
      className={cn(
        "flex items-center gap-3 px-5 py-3.5 transition-colors",
        "border-b border-border/40 last:border-b-0",
        "hover:bg-white/[0.02] cursor-pointer group"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-foreground truncate">
            {row.label}
          </span>
          {row.sublabel && (
            <span className="text-[12px] text-muted-foreground/70 truncate">
              {row.sublabel}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right flex items-baseline gap-2.5 tabular-nums">
        {mode === "currency" && currency !== "BRL" && row.valueCurrency && (
          <span className="text-[11px] text-muted-foreground/70">
            {currency}
          </span>
        )}
        <span className="text-[14px] font-semibold text-foreground">
          {value}
        </span>
        {row.delta != null && <Delta value={row.delta} unit="percent" size="sm" />}
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
        strokeWidth={2}
      />
    </a>
  );
}

// ─── Mode toggle ────────────────────────────────────────────────────────────

function ModeToggle({
  value,
  onChange,
}: {
  value: "currency" | "percent" | "multiple";
  onChange: (v: "currency" | "percent" | "multiple") => void;
}): JSX.Element {
  return (
    <div
      className="inline-flex bg-white/[0.02] rounded-md border border-white/10 p-0.5"
      role="tablist"
    >
      <ModePill
        active={value === "multiple"}
        onClick={() => onChange("multiple")}
        label="Múltiplo"
      />
      <ModePill
        active={value === "percent"}
        onClick={() => onChange("percent")}
        label="%"
      />
      <ModePill
        active={value === "currency"}
        onClick={() => onChange("currency")}
        label="BRL"
      />
    </div>
  );
}

function ModePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded text-[11px] font-medium transition-colors",
        active
          ? "bg-white/[0.06] text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// ─── States ────────────────────────────────────────────────────────────────

function LoadingRows(): JSX.Element {
  return (
    <div className="p-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-3 border-b border-border/40 last:border-b-0"
        >
          <div className="h-3.5 w-32 rounded bg-white/[0.04] animate-pulse" />
          <div className="flex-1" />
          <div className="h-3.5 w-20 rounded bg-white/[0.04] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-[14px] text-foreground">
        Nenhuma métrica encontrada.
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground/85">
        Ajuste a busca ou aguarde o carregamento.
      </p>
    </div>
  );
}
