"use client";

/**
 * RawDataPageClient — tabela anual com 10 anos de demonstrações
 * financeiras (Receita · Margens · Balanço · Valuation).
 *
 * Recursos (2026-08-31):
 *   - Color coded: verde/vermelho pra lucro, margens, DY, ROE, ROA,
 *     dívida líquida.
 *   - Editor de colunas (anos) + métricas: dropdown com checkboxes
 *     por coluna, permite esconder/reabilitar.
 *   - Export CSV: baixa arquivo com todas as colunas/métricas
 *     atualmente visíveis.
 *
 * Header: AssetHeader com variant="raw-data" — seta esquerda =
 * router.back() (volta pra /asset/[symbol]).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  Columns3,
  Download,
} from "lucide-react";
import type { JSX } from "react";

import { AssetHeader } from "@/components/asset/asset-header";
import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import { StaggerOnMount } from "@/components/foundation/stagger";

type RawRow = {
  endDate: string;
  year: number;
  totalRevenue: number | null;
  revenueGrowth: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  grossMargin: number | null;
  ebitdaMargin: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  totalAssets: number | null;
  totalLiab: number | null;
  equity: number | null;
  cash: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
};

type RawResponse = {
  symbol: string;
  rows: RawRow[];
  range: string;
  fetchedAt: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

type Props = {
  symbol: string;
};

export function RawDataPageClient({ symbol }: Props): JSX.Element {
  const { data, error, isLoading } = useSWR<RawResponse>(
    `/api/asset/${symbol}/raw-data`,
    fetchJson,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    document.title = `Raw data · ${symbol} · Sulfur`;
  }, [symbol]);

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: "#070709" }}
    >
      <main className="w-[90%] mx-auto py-6 pb-32">
        <StaggerOnMount>
          <AssetHeader
            symbol={symbol}
            longName={null}
            shortName={null}
            sector="Raw data"
            variant="raw-data"
          />
        </StaggerOnMount>

        <StaggerOnMount className="mt-6">
          <RawDataCard
            symbol={symbol}
            data={data ?? null}
            loading={isLoading}
            error={error ?? null}
          />
        </StaggerOnMount>
      </main>

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Card principal ──────────────────────────────────────────────────────────

function RawDataCard({
  symbol,
  data,
  loading,
  error,
}: {
  symbol: string;
  data: RawResponse | null;
  loading: boolean;
  error: unknown;
}): JSX.Element {
  const [enabledYears, setEnabledYears] = useState<Set<number> | null>(null);
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string> | null>(
    null,
  );

  // Reset quando os dados mudam (símbolo novo ou refetch traz ano novo).
  const allYears = useMemo(
    () => (data ? data.rows.map((r) => r.year) : []),
    [data],
  );
  useEffect(() => {
    if (!data) return;
    setEnabledYears(new Set(allYears));
    setEnabledMetrics(new Set(METRIC_KEYS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.fetchedAt]);

  const visibleYears = useMemo(
    () =>
      enabledYears
        ? allYears.filter((y) => enabledYears.has(y))
        : allYears,
    [allYears, enabledYears],
  );

  const visibleMetricKeys = useMemo(
    () => (enabledMetrics ?? new Set(METRIC_KEYS)),
    [enabledMetrics],
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border/40 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
            Demonstrações financeiras
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground/70 tabular-nums">
            {data?.range ?? "—"} · {visibleYears.length}/{allYears.length} anos ·{" "}
            {visibleMetricKeys.size}/{METRIC_KEYS.length} métricas · fonte: brapi v2 Pro
          </div>
        </div>

        {data && data.rows.length > 0 && (
          <div className="flex items-center gap-2">
            <ColumnEditor
              allYears={allYears}
              enabledYears={enabledYears ?? new Set(allYears)}
              onToggleYear={(y) => {
                setEnabledYears((prev) => {
                  const next = new Set(prev ?? allYears);
                  if (next.has(y)) next.delete(y);
                  else next.add(y);
                  return next;
                });
              }}
              enabledMetrics={visibleMetricKeys}
              onToggleMetric={(key) => {
                setEnabledMetrics((prev) => {
                  const next = new Set(prev ?? new Set(METRIC_KEYS));
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                });
              }}
              onReset={() => {
                setEnabledYears(new Set(allYears));
                setEnabledMetrics(new Set(METRIC_KEYS));
              }}
            />
            <ExportCSVButton
              symbol={symbol}
              rows={data.rows}
              enabledYears={enabledYears ?? new Set(allYears)}
              enabledMetrics={visibleMetricKeys}
            />
          </div>
        )}
      </div>

      {loading ? (
        <RawSkeleton />
      ) : error || !data || data.rows.length === 0 ? (
        <EmptyState />
      ) : (
        <RawTable rows={data.rows} visibleYears={visibleYears} metricKeys={visibleMetricKeys} />
      )}
    </div>
  );
}

// ─── Editor de colunas + métricas ─────────────────────────────────────────────

function ColumnEditor({
  allYears,
  enabledYears,
  onToggleYear,
  enabledMetrics,
  onToggleMetric,
  onReset,
}: {
  allYears: number[];
  enabledYears: Set<number>;
  onToggleYear: (y: number) => void;
  enabledMetrics: Set<string>;
  onToggleMetric: (k: string) => void;
  onReset: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hiddenCount =
    allYears.length -
    enabledYears.size +
    (METRIC_KEYS.length - enabledMetrics.size);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/[0.04] border border-white/10 text-foreground text-[12px] font-medium hover:bg-white/[0.08] hover:border-white/20 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Columns3 className="h-3.5 w-3.5" strokeWidth={2} />
        Colunas
        {hiddenCount > 0 && (
          <span className="ml-1 px-1.5 rounded bg-white/[0.06] text-[10px] tabular-nums">
            −{hiddenCount}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 max-h-[480px] overflow-y-auto rounded-xl border border-white/10 bg-[#101116]/95 shadow-2xl shadow-black/40 backdrop-blur-md p-2"
        >
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55 font-semibold">
            Anos
          </div>
          {allYears.map((y) => {
            const checked = enabledYears.has(y);
            return (
              <button
                key={y}
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                onClick={() => onToggleYear(y)}
                className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-foreground/85 hover:bg-white/[0.04] transition-colors"
              >
                <span
                  className={
                    "inline-flex h-4 w-4 items-center justify-center rounded border " +
                    (checked
                      ? "bg-foreground/85 border-foreground/85 text-background"
                      : "border-white/20")
                  }
                >
                  {checked && (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M3 8 L7 12 L13 4" />
                    </svg>
                  )}
                </span>
                {y}
              </button>
            );
          })}
          <div className="my-1 mx-2 border-t border-white/[0.06]" />
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55 font-semibold">
            Métricas
          </div>
          {METRIC_DEFS.map((m) => {
            const checked = enabledMetrics.has(m.key);
            return (
              <button
                key={m.key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                onClick={() => onToggleMetric(m.key)}
                className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-foreground/85 hover:bg-white/[0.04] transition-colors"
              >
                <span
                  className={
                    "inline-flex h-4 w-4 items-center justify-center rounded border " +
                    (checked
                      ? "bg-foreground/85 border-foreground/85 text-background"
                      : "border-white/20")
                  }
                >
                  {checked && (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M3 8 L7 12 L13 4" />
                    </svg>
                  )}
                </span>
                {m.label}
              </button>
            );
          })}
          <div className="my-1 mx-2 border-t border-white/[0.06]" />
          <button
            type="button"
            onClick={onReset}
            className="w-full text-left px-2 py-1.5 rounded-md text-[12px] text-muted-foreground/85 hover:bg-white/[0.04] hover:text-foreground transition-colors"
          >
            Mostrar tudo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function ExportCSVButton({
  symbol,
  rows,
  enabledYears,
  enabledMetrics,
}: {
  symbol: string;
  rows: RawRow[];
  enabledYears: Set<number>;
  enabledMetrics: Set<string>;
}): JSX.Element {
  function handleExport() {
    const csv = buildCSV(rows, enabledYears, enabledMetrics);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}-raw-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/[0.04] border border-white/10 text-foreground text-[12px] font-medium hover:bg-white/[0.08] hover:border-white/20 transition-colors"
    >
      <Download className="h-3.5 w-3.5" strokeWidth={2} />
      Export CSV
    </button>
  );
}

function buildCSV(
  rows: RawRow[],
  enabledYears: Set<number>,
  enabledMetrics: Set<string>,
): string {
  const filteredRows = rows.filter((r) => enabledYears.has(r.year));
  const visibleMetrics = METRIC_DEFS.filter((m) => enabledMetrics.has(m.key));
  const years = filteredRows.map((r) => r.year);

  const lines: string[] = [];
  // Cabeçalho
  lines.push(["Métrica", ...years.map(String)].join(","));
  // Linhas por métrica
  for (const m of visibleMetrics) {
    const cells: string[] = [csvEscape(m.label)];
    for (const r of filteredRows) {
      const v = r[m.key] as number | null | undefined;
      if (v == null) {
        cells.push("");
      } else {
        cells.push(csvFormatNumber(v, m.format));
      }
    }
    lines.push(cells.join(","));
  }
  // BOM pro Excel reconhecer UTF-8.
  return "\ufeff" + lines.join("\r\n");
}

function csvEscape(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvFormatNumber(v: number, format: MetricFormat): string {
  // Em CSV, números saem sem formatação (raw decimal) — Excel/spreadsheet
  // aplicam formato. Valores percentuais vêm como fração (0.07) — Excel
  // interpreta como 7% se formatar a célula.
  if (format === "percent") return v.toFixed(4);
  return v.toFixed(0);
}

// ─── Definição de métricas ────────────────────────────────────────────────────

type MetricFormat = "currency" | "percent" | "multiple";

type MetricDef = {
  key: keyof Omit<
    RawRow,
    "endDate" | "year"
  >;
  label: string;
  format: MetricFormat;
};

const METRIC_DEFS: MetricDef[] = [
  { key: "totalRevenue", label: "Receita total", format: "currency" },
  { key: "revenueGrowth", label: "Crescimento YoY", format: "percent" },
  { key: "grossProfit", label: "Lucro bruto", format: "currency" },
  { key: "operatingIncome", label: "Lucro operacional", format: "currency" },
  { key: "netIncome", label: "Lucro líquido", format: "currency" },
  { key: "ebitda", label: "EBITDA", format: "currency" },
  { key: "grossMargin", label: "Margem bruta", format: "percent" },
  { key: "operatingMargin", label: "Margem operacional", format: "percent" },
  { key: "ebitdaMargin", label: "Margem EBITDA", format: "percent" },
  { key: "profitMargin", label: "Margem líquida", format: "percent" },
  { key: "totalAssets", label: "Ativo total", format: "currency" },
  { key: "equity", label: "Equity", format: "currency" },
  { key: "cash", label: "Caixa", format: "currency" },
  { key: "totalDebt", label: "Dívida total", format: "currency" },
  { key: "netDebt", label: "Dívida líquida", format: "currency" },
  { key: "trailingPE", label: "P/L", format: "multiple" },
  { key: "returnOnEquity", label: "ROE", format: "percent" },
  { key: "returnOnAssets", label: "ROA", format: "percent" },
  { key: "dividendYield", label: "Dividend yield", format: "percent" },
];

const METRIC_KEYS = METRIC_DEFS.map((m) => m.key);

// ─── Tabela principal ──────────────────────────────────────────────────────────

function RawTable({
  rows,
  visibleYears,
  metricKeys,
}: {
  rows: RawRow[];
  visibleYears: number[];
  metricKeys: Set<string>;
}): JSX.Element {
  // Mapa ano → row pra lookup O(1).
  const byYear = new Map<number, RawRow>();
  for (const r of rows) byYear.set(r.year, r);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] tabular-nums">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[#101116] text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55 font-semibold px-5 py-3 border-b border-border/40 min-w-[180px]">
              Métrica
            </th>
            {visibleYears.map((y) => (
              <th
                key={y}
                className="text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55 font-semibold px-3 py-3 border-b border-border/40 min-w-[100px]"
              >
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRIC_DEFS.filter((m) => metricKeys.has(m.key)).map((m, idx) => {
            const isSectionStart = ["totalRevenue", "grossMargin", "totalAssets", "trailingPE"].includes(m.key);
            return (
              <Row
                key={m.key}
                label={m.label}
                values={visibleYears.map((y) => byYear.get(y)?.[m.key] as number | null | undefined)}
                format={getFormatter(m.format)}
                colorCoded={m.key !== "trailingPE" && m.key !== "totalAssets" && m.key !== "equity" && m.key !== "cash" && m.key !== "totalDebt" && m.key !== "grossProfit" && m.key !== "operatingIncome"}
                isSectionStart={isSectionStart}
                sectionTitle={isSectionStart ? SECTION_TITLES[m.key] : undefined}
                idx={idx}
                colspan={visibleYears.length + 1}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const SECTION_TITLES: Record<string, string> = {
  totalRevenue: "Resultado",
  grossMargin: "Margens",
  totalAssets: "Balanço",
  trailingPE: "Retorno & Valuation",
};

function Row({
  label,
  values,
  format,
  colorCoded,
  isSectionStart,
  sectionTitle,
  idx,
  colspan,
}: {
  label: string;
  values: Array<number | null | undefined>;
  format: (v: number) => string;
  colorCoded?: boolean;
  isSectionStart?: boolean;
  sectionTitle?: string;
  idx: number;
  colspan: number;
}): JSX.Element {
  return (
    <>
      {isSectionStart && (
        <tr>
          <td
            colSpan={colspan}
            className={
              "bg-white/[0.02] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55 font-semibold px-5 py-2 " +
              (idx === 0 ? "" : "border-t border-border/40")
            }
          >
            {sectionTitle}
          </td>
        </tr>
      )}
      <tr className="border-b border-border/20 last:border-b-0">
        <th className="sticky left-0 z-10 bg-[#101116] text-left text-[12px] text-foreground/85 font-normal px-5 py-2.5">
          {label}
        </th>
        {values.map((v, i) => (
          <td
            key={i}
            className={cn(
              "text-right px-3 py-2.5 tabular-nums",
              colorCoded && v != null
                ? v === 0
                  ? "text-muted-foreground/55"
                  : v > 0
                    ? "text-[var(--positive)]"
                    : "text-[var(--negative)]"
                : "text-foreground",
            )}
          >
            {v != null && Number.isFinite(v) ? format(v) : "—"}
          </td>
        ))}
      </tr>
    </>
  );
}

function getFormatter(format: MetricFormat): (v: number) => string {
  if (format === "currency") return formatBRL;
  if (format === "percent") return formatPercent;
  return formatMultiple;
}

function RawSkeleton(): JSX.Element {
  return (
    <div className="p-5 space-y-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
          <div className="flex-1 grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, j) => (
              <div
                key={j}
                className="h-3 bg-white/[0.04] rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-[14px] text-foreground">
        Sem dados brapi pra esse ticker.
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground/85">
        Pode ser ticker novo demais ou endpoint brapi indisponível.
      </p>
    </div>
  );
}

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatBRL(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `R$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `R$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `R$${(v / 1e6).toFixed(1)}M`;
  return v.toFixed(0);
}

function formatPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

function formatMultiple(v: number): string {
  return `${v.toFixed(1)}×`;
}

function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}