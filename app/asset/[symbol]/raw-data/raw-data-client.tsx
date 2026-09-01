"use client";

/**
 * RawDataPageClient — tabela anual com 10 anos de demonstrações
 * financeiras (Receita · Margens · Balanço · Valuation).
 *
 * Color coded (positiva/negativa):
 *   - Receita YoY %: verde +, vermelho -, muted 0
 *   - Lucro, EBITDA, dívida líquida, ROE, ROA, dividend yield: igual
 *   - Ativos, equity, debt, P/L: muted — sem cor semântica
 *
 * Header: seta de voltar = router.back() (NÃO hardcoded pra home).
 */

import { useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { JSX } from "react";

import { AssetHeader } from "@/components/asset/asset-header";
import { DashboardDock } from "@/components/foundation/dashboard-dock";
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
  const router = useRouter();
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
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Voltar"
            title="Voltar"
            className="shrink-0 flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground/85 hover:bg-white/[0.04] hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <AssetHeader
            symbol={symbol}
            longName={null}
            shortName={null}
            sector="Raw data"
          />
        </div>

        <StaggerOnMount className="mt-6">
          <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border/40">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
                Demonstrações financeiras
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground/70 tabular-nums">
                {data?.range ?? "—"} · {data?.rows.length ?? 0} anos · fonte: brapi v2 Pro
              </div>
            </div>

            {isLoading ? (
              <RawSkeleton />
            ) : error || !data || data.rows.length === 0 ? (
              <EmptyState />
            ) : (
              <RawTable rows={data.rows} />
            )}
          </div>
        </StaggerOnMount>
      </main>

      <DashboardDock />
    </div>
  );
}

// ─── Tabela principal ──────────────────────────────────────────────────────────

function RawTable({ rows }: { rows: RawRow[] }): JSX.Element {
  const years = rows.map((r) => r.year);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] tabular-nums">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[#101116] text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55 font-semibold px-5 py-3 border-b border-border/40 min-w-[180px]">
              Métrica
            </th>
            {years.map((y) => (
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
          <SectionRow title="Resultado" colspan={years.length + 1} />
          <Row
            label="Receita total"
            values={rows.map((r) => r.totalRevenue)}
            format={formatBRL}
          />
          <Row
            label="Crescimento YoY"
            values={rows.map((r) => r.revenueGrowth)}
            format={formatPercent}
            colorCoded
          />
          <Row
            label="Lucro líquido"
            values={rows.map((r) => r.netIncome)}
            format={formatBRL}
            colorCoded
          />
          <Row
            label="EBITDA"
            values={rows.map((r) => r.ebitda)}
            format={formatBRL}
            colorCoded
          />

          <SectionRow title="Margens" colspan={years.length + 1} />
          <Row
            label="Margem bruta"
            values={rows.map((r) => r.grossMargin)}
            format={formatPercent}
          />
          <Row
            label="Margem operacional"
            values={rows.map((r) => r.operatingMargin)}
            format={formatPercent}
          />
          <Row
            label="Margem EBITDA"
            values={rows.map((r) => r.ebitdaMargin)}
            format={formatPercent}
          />
          <Row
            label="Margem líquida"
            values={rows.map((r) => r.profitMargin)}
            format={formatPercent}
          />

          <SectionRow title="Balanço" colspan={years.length + 1} />
          <Row
            label="Ativo total"
            values={rows.map((r) => r.totalAssets)}
            format={formatBRL}
          />
          <Row
            label="Equity"
            values={rows.map((r) => r.equity)}
            format={formatBRL}
          />
          <Row
            label="Caixa"
            values={rows.map((r) => r.cash)}
            format={formatBRL}
          />
          <Row
            label="Dívida total"
            values={rows.map((r) => r.totalDebt)}
            format={formatBRL}
          />
          <Row
            label="Dívida líquida"
            values={rows.map((r) => r.netDebt)}
            format={formatBRL}
            colorCoded
          />

          <SectionRow title="Retorno & Valuation" colspan={years.length + 1} />
          <Row
            label="P/L"
            values={rows.map((r) => r.trailingPE)}
            format={formatMultiple}
          />
          <Row
            label="ROE"
            values={rows.map((r) => r.returnOnEquity)}
            format={formatPercent}
            colorCoded
          />
          <Row
            label="ROA"
            values={rows.map((r) => r.returnOnAssets)}
            format={formatPercent}
            colorCoded
          />
          <Row
            label="Dividend yield"
            values={rows.map((r) => r.dividendYield)}
            format={formatPercent}
            colorCoded
          />
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  values,
  format,
  colorCoded,
}: {
  label: string;
  values: Array<number | null>;
  format: (v: number) => string;
  colorCoded?: boolean;
}): JSX.Element {
  return (
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
          {v != null ? format(v) : "—"}
        </td>
      ))}
    </tr>
  );
}

function SectionRow({
  title,
  colspan,
}: {
  title: string;
  colspan: number;
}): JSX.Element {
  return (
    <tr>
      <td
        colSpan={colspan}
        className="bg-white/[0.02] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55 font-semibold px-5 py-2 border-t border-border/40"
      >
        {title}
      </td>
    </tr>
  );
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