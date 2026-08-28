"use client";

/**
 * DataTable — tabela estilo excel pra dados crus.
 *
 * Padrão (sulfur-ui-rules §6 + sulfur-redesign §2.4):
 *   - Header sticky com filtros por coluna
 *   - Linhas com divider border-border/40 (sem zebra)
 *   - Numéricos à direita + tabular-nums
 *   - Truncate nome em 200px
 *   - Search box no topo
 *   - Botão "Exportar CSV" canto superior direito
 */

import { Download, Search } from "lucide-react";
import {
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T & string;
  header: string;
  /** Alinhamento. Default: "left". */
  align?: "left" | "right" | "center";
  /** Largura customizada. Ex: "120px", "20%". */
  width?: string;
  /** Formatter customizado. Se omitido, usa toString(). */
  format?: (value: T[keyof T], row: T) => string;
  /** Se true, usa tabular-nums. Default: false. */
  numeric?: boolean;
  /** Trunca texto com max-width. Default: false. */
  truncate?: boolean;
  /** Largura do truncate. Default: 200px. */
  truncateMaxWidth?: string;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  /** Placeholder do search. Default: "Buscar métrica…". */
  searchPlaceholder?: string;
  /** Callback ao clicar em "Exportar CSV". */
  onExportCsv?: () => void;
  /** Label do botão de export. Default: "Exportar CSV". */
  exportLabel?: string;
  /** Mensagem de empty state. Default: "Sem dados para este período.". */
  emptyMessage?: string;
  /** Loading state. Se true, mostra skeleton. */
  loading?: boolean;
  /** Número de linhas no skeleton. Default: 8. */
  skeletonRows?: number;
  /** Caption acessível. */
  caption?: string;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = "Buscar métrica…",
  onExportCsv,
  exportLabel = "Exportar CSV",
  emptyMessage = "Sem dados para este período.",
  loading,
  skeletonRows = 8,
  caption,
  className,
}: Props<T>): JSX.Element {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = row[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(q);
      })
    );
  }, [data, columns, query]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full h-9 pl-9 pr-3 rounded-md",
              "bg-white/[0.02] border border-white/10",
              "text-[13px] text-foreground placeholder:text-muted-foreground/60",
              "focus:outline-none focus:border-white/20 focus:bg-white/[0.04]",
              "transition-colors"
            )}
            aria-label="Buscar na tabela"
          />
        </div>

        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-md",
              "bg-white/[0.04] border border-white/10 text-foreground",
              "text-[12px] font-medium",
              "hover:bg-white/[0.08] hover:border-white/20",
              "transition-colors"
            )}
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            {exportLabel}
          </button>
        )}
      </div>

      {/* Tabela */}
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-[#101116]",
          "overflow-hidden"
        )}
      >
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <table className="w-full text-[13px]" role="table">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="sticky top-0 z-10 bg-[#101116]/95 backdrop-blur-sm">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    className={cn(
                      "px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]",
                      "font-semibold text-muted-foreground/85",
                      "border-b border-border/40",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      !col.align && "text-left"
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-border/40">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4" width="80%" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-[13px] text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filtered.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-border/40 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    {columns.map((col) => {
                      const value = row[col.key];
                      const display = col.format
                        ? col.format(value as T[keyof T], row)
                        : (value as ReactNode);
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3",
                            col.numeric && "tabular-nums",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                            col.truncate && "truncate"
                          )}
                          style={
                            col.truncate
                              ? { maxWidth: col.truncateMaxWidth ?? "200px" }
                              : undefined
                          }
                        >
                          {display as ReactNode}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer com contagem */}
      {!loading && filtered.length > 0 && (
        <div className="text-[11px] text-muted-foreground/70 px-1">
          {filtered.length} {filtered.length === 1 ? "linha" : "linhas"}
          {query && data.length !== filtered.length
            ? ` de ${data.length}`
            : ""}
        </div>
      )}
    </div>
  );
}

// Helper pra gerar CSV a partir de data + columns.
export function rowsToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: Column<T>[]
): string {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = col.format
          ? col.format(row[col.key] as T[keyof T], row)
          : String(row[col.key] ?? "");
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headers, ...rows].join("\n");
}
