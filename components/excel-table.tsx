"use client";

/**
 * ExcelTable — tabela estilo Excel com:
 *  - Coluna fixa à esquerda = label da métrica
 *  - 1 coluna por ano (linha do tempo histórica)
 *  - Search bar pra filtrar métricas (case-insensitive, busca no label E nas tags)
 *  - Filtro "Adicionar/remover colunas" — painel inline de checkboxes por coluna
 *  - Sticky header (thead fixo no scroll)
 *  - Sticky first column (label da métrica não some no scroll horizontal)
 *  - Fundo diferente do background geral (card surface)
 *  - Texto branco (#ffffff), mesma intensidade do price chart
 *  - Cores muted (não saturadas) pra valores positivos/negativos
 *  - Sinal redundante: ▲/▼ + sinal +/− além da cor (daltonismo)
 *  - tabular-nums em todas as colunas numéricas
 *
 * Props:
 *   metrics: MetricRow[]              — definição de cada linha da tabela
 *   columns: string[]                 — chaves das colunas (ex: ["2024", "2023"])
 *   formatHeader: (col: string) => string  — formata o header da coluna
 *   initialVisibleColumns?: string[]  — colunas visíveis no início (default: todas)
 *   searchPlaceholder?: string        — placeholder da search bar
 */

import { useMemo, useState } from "react";
import { Search, ArrowUp, ArrowDown, Minus, Settings2, X, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { compactBRL, formatMultiple, formatNumber, formatPercentRaw } from "@/lib/format";

export type CellFormat = "currency" | "percent" | "multiple" | "number";

export type MetricRow = {
  /** Identificador único da métrica */
  key: string;
  /** Label visível na primeira coluna */
  label: string;
  /** Descrição/ajuda (tooltip futuro) */
  description?: string;
  /** Tags de busca adicionais (ex: sigla, sinônimo) */
  tags?: string[];
  /** Categoria pra agrupar visualmente (renderiza como separador) */
  category?: string;
  /** Valores por coluna. null = "—", número = formatado conforme `format`. */
  values: Record<string, number | null>;
  /** Como formatar o número. Default: "number" */
  format?: CellFormat;
  /** Se true, valores < 0 viram verdes (ex: custo, despesa). Default: false */
  invertSign?: boolean;
};

type Props = {
  metrics: MetricRow[];
  columns: string[];
  /** Formata o label do header da coluna (ex: ano, trimestre) */
  formatHeader: (col: string) => string;
  /** Texto da search bar */
  searchPlaceholder?: string;
  /** Colunas visíveis inicialmente. Default: todas. */
  initialVisibleColumns?: string[];
  /** Loading skeleton (3 linhas) */
  loading?: boolean;
  /** Empty state quando não há métricas. */
  emptyMessage?: string;
};

function formatCell(value: number | null | null, format: CellFormat = "number"): string {
  if (value == null) return "—";
  switch (format) {
    case "currency":
      return compactBRL(value);
    case "percent":
      return formatPercentRaw(value);
    case "multiple":
      return formatMultiple(value);
    case "number":
      return formatNumber(value);
  }
}

function signFor(value: number | null, invertSign: boolean): "pos" | "neg" | "zero" | "none" {
  if (value == null || value === 0) return "none";
  const isPos = invertSign ? value < 0 : value > 0;
  return isPos ? "pos" : "neg";
}

export function ExcelTable({
  metrics,
  columns,
  formatHeader,
  searchPlaceholder = "Buscar métrica...",
  initialVisibleColumns,
  loading = false,
  emptyMessage = "Sem métricas disponíveis para este ativo.",
}: Props) {
  const [search, setSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(initialVisibleColumns ?? columns),
  );

  // Filtra métricas por search (label ou tags)
  const filteredMetrics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return metrics;
    return metrics.filter((m) => {
      const inLabel = m.label.toLowerCase().includes(q);
      const inKey = m.key.toLowerCase().includes(q);
      const inTags = m.tags?.some((t) => t.toLowerCase().includes(q));
      return inLabel || inKey || inTags;
    });
  }, [metrics, search]);

  // Mantém ordem das colunas visíveis
  const visibleColsOrdered = useMemo(
    () => columns.filter((c) => visibleColumns.has(c)),
    [columns, visibleColumns],
  );

  function toggleColumn(col: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-40 ml-auto" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
      {/* Toolbar: search + column picker */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-white/[0.04] border border-white/10 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors"
          />
        </div>
        <div className="ml-auto text-[12px] text-muted-foreground">
          {filteredMetrics.length} de {metrics.length} métricas
        </div>
        <ColumnPicker
          columns={columns}
          formatHeader={formatHeader}
          visibleColumns={visibleColumns}
          onToggle={toggleColumn}
        />
      </div>

      {/* Column picker inline (rendered conditionally) */}

      {/* Empty state */}
      {filteredMetrics.length === 0 && (
        <div className="py-16 px-6 text-center space-y-2">
          <p className="text-[14px] text-muted-foreground">{emptyMessage}</p>
          {search && (
            <p className="text-[12px] text-muted-foreground/60">
              Tente limpar a busca ou outro termo.
            </p>
          )}
        </div>
      )}

      {/* Tabela */}
      {filteredMetrics.length > 0 && (
        <div className="overflow-auto max-h-[calc(100vh-180px)]">
          <table className="w-full border-collapse text-[13px] tabular-nums">
            <thead className="sticky top-0 z-10 bg-[#101116] border-b border-white/10">
              <tr>
                <th className="sticky left-0 z-20 bg-[#101116] text-left font-normal text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 px-4 py-2.5 min-w-[220px] border-r border-white/10">
                  Métrica
                </th>
                {visibleColsOrdered.map((col) => (
                  <th
                    key={col}
                    className="text-right font-normal text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 px-4 py-2.5 min-w-[110px]"
                  >
                    {formatHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMetrics.map((row) => (
                <RowTr key={row.key} row={row} visibleCols={visibleColsOrdered} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RowTr({ row, visibleCols }: { row: MetricRow; visibleCols: string[] }) {
  return (
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
      <td className="sticky left-0 z-10 bg-[#101116] hover:bg-[#14151a] px-4 py-2.5 text-[13px] text-foreground border-r border-white/10">
        {row.label}
      </td>
      {visibleCols.map((col) => {
        const value = row.values[col] ?? null;
        const sign = signFor(value, row.invertSign ?? false);
        const colorClass =
          sign === "pos"
            ? "text-[var(--positive)]"
            : sign === "neg"
              ? "text-[var(--negative)]"
              : "text-foreground";
        const isNeg = value != null && value < 0;
        const signPrefix = isNeg ? "−" : value != null && value > 0 ? "+" : "";
        return (
          <td
            key={col}
            className={`text-right px-4 py-2.5 ${colorClass}`}
          >
            <span className="inline-flex items-center justify-end gap-1">
              {sign === "pos" && <ArrowUp className="h-3 w-3" />}
              {sign === "neg" && <ArrowDown className="h-3 w-3" />}
              {sign === "zero" && <Minus className="h-3 w-3 opacity-60" />}
              {signPrefix}
              {formatCell(value, row.format ?? "number")}
            </span>
          </td>
        );
      })}
    </tr>
  );
}


function ColumnPicker({
  columns,
  formatHeader,
  visibleColumns,
  onToggle,
}: {
  columns: string[];
  formatHeader: (col: string) => string;
  visibleColumns: Set<string>;
  onToggle: (col: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-[12.5px] text-foreground hover:bg-white/[0.08] hover:border-white/20 transition-colors focus:outline-none focus:border-white/20"
      >
        <Settings2 className="h-4 w-4" />
        Colunas
        <span className="text-muted-foreground/70 text-[11px]">({visibleColumns.size}/{columns.length})</span>
      </button>
      {open && (
        <>
          {/* Backdrop para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-white/10 bg-[#101116] shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                Mostrar / ocultar colunas
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {columns.map((col) => {
                const checked = visibleColumns.has(col);
                return (
                  <button
                    type="button"
                    key={col}
                    onClick={() => onToggle(col)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-white/[0.04] text-[12.5px] text-left"
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${
                        checked ? "bg-foreground border-foreground" : "border-white/20 bg-white/[0.04]"
                      }`}
                    >
                      {checked && <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />}
                    </span>
                    <span className="text-foreground">{formatHeader(col)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
