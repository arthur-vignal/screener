"use client";

/**
 * /asset/[symbol]/stats/financials — página Excel-style com TODAS as
 * métricas de DRE + BP + DFC históricas.
 *
 * Origem: lib/brapi-full.ts (incomeStatementHistory + balanceSheetHistory +
 * cashflowHistory).
 *
 * Página serve dado cru: o usuário faz o que quiser com ele.
 * Cor única no fundo (#101116) — superfície de card, diferente do canvas geral.
 * Texto branco #ffffff (mesma intensidade do price chart).
 * Variações positivo/negativo: cor muted + seta + sinal +/− (daltonismo).
 */

import { use, useMemo } from "react";
import { useAssetBundle } from "../../lib/use-asset-bundle";
import { useAssetBackground } from "@/lib/use-asset-background";
import { AssetSubheader } from "../../components/asset-subheader";
import { ExcelTable, type MetricRow } from "@/components/excel-table";
import { Skeleton } from "@/components/ui/skeleton";

type HistoricalRow = { endDate: string } & Record<string, number | null | undefined>;

function num(r: HistoricalRow | undefined, field: string): number | null {
  if (!r) return null;
  const v = r[field];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function valueMapByYear(
  rows: HistoricalRow[] | undefined,
  field: string,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const r of rows ?? []) {
    const y = r.endDate?.slice(0, 4);
    if (!y) continue;
    out[y] = num(r, field);
  }
  return out;
}

function derived(
  rows: HistoricalRow[] | undefined,
  numField: string,
  denField: string,
  fn: (n: number, d: number) => number | null,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const r of rows ?? []) {
    const y = r.endDate?.slice(0, 4);
    if (!y) continue;
    const n = num(r, numField);
    const d = num(r, denField);
    out[y] = n != null && d != null && d !== 0 ? fn(n, d) : null;
  }
  return out;
}

function derivedCross(
  rowsA: HistoricalRow[] | undefined,
  rowsB: HistoricalRow[] | undefined,
  fieldA: string,
  fieldB: string,
  fn: (a: number, b: number) => number | null,
): Record<string, number | null> {
  const map = (rows: HistoricalRow[] | undefined, field: string) =>
    valueMapByYear(rows, field);
  const a = map(rowsA, fieldA);
  const b = map(rowsB, fieldB);
  const years = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Record<string, number | null> = {};
  for (const y of years) {
    const av = a[y];
    const bv = b[y];
    out[y] = av != null && bv != null ? fn(av, bv) : null;
  }
  return out;
}

function derivedThree(
  rowsA: HistoricalRow[] | undefined,
  rowsB: HistoricalRow[] | undefined,
  rowsC: HistoricalRow[] | undefined,
  fieldA: string,
  fieldB: string,
  fieldC: string,
  fn: (a: number, b: number, c: number) => number | null,
): Record<string, number | null> {
  const a = valueMapByYear(rowsA, fieldA);
  const b = valueMapByYear(rowsB, fieldB);
  const c = valueMapByYear(rowsC, fieldC);
  const years = new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(c)]);
  const out: Record<string, number | null> = {};
  for (const y of years) {
    const av = a[y];
    const bv = b[y];
    const cv = c[y];
    out[y] = av != null && bv != null && cv != null && cv !== 0 ? fn(av, bv, cv) : null;
  }
  return out;
}

export default function StatsFinancialsPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase().replace(/\.SA$/, "");
  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);
  const { data: bundle, isLoading, error } = useAssetBundle(symbol);

  const historicals = (bundle?.historicals ?? {}) as {
    income?: HistoricalRow[];
    balance?: HistoricalRow[];
    cashflow?: HistoricalRow[];
  };

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const arr of [historicals.income, historicals.balance, historicals.cashflow]) {
      for (const r of arr ?? []) {
        if (r.endDate) set.add(r.endDate);
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [historicals]);

  const metrics: MetricRow[] = useMemo(() => {
    const rows: MetricRow[] = [];
    const push = (
      key: string,
      label: string,
      field: "income" | "balance" | "cashflow",
      fieldName: string,
      format: "currency" | "percent" | "multiple" | "number" = "currency",
      tags?: string[],
      invertSign = false,
    ) => {
      const arr =
        field === "income" ? historicals.income : field === "balance" ? historicals.balance : historicals.cashflow;
      rows.push({
        key,
        label,
        tags,
        values: valueMapByYear(arr, fieldName),
        format,
        invertSign,
      });
    };

    // ── DRE ─────────────────────────────────────────────────────────────
    push("rev", "Receita líquida", "income", "totalRevenue", "currency", ["receita", "revenue", "faturamento"]);
    push("cost", "Custo dos produtos vendidos", "income", "costOfRevenue", "currency", ["cpv", "cost"], true);
    push("gross", "Lucro bruto", "income", "grossProfit", "currency", ["lucro bruto", "gross profit"]);
    push("opex", "Despesas operacionais", "income", "totalOperatingExpenses", "currency", ["opex", "despesas"], true);
    push("ebit", "EBIT", "income", "ebit", "currency", ["lucro operacional", "operating income"]);
    push("financial", "Despesas financeiras", "income", "financialExpenses", "currency", ["juros", "financial"], true);
    push("tax", "Impostos sobre o lucro", "income", "incomeTaxExpense", "currency", ["impostos", "tax"], true);
    push("net", "Lucro líquido", "income", "netIncome", "currency", ["lucro", "net income", "resultado"]);

    // ── Margens (calculadas) ────────────────────────────────────────────
    rows.push({
      key: "margin_gross",
      label: "Margem bruta",
      tags: ["margem", "margin", "gross"],
      values: derived(historicals.income, "grossProfit", "totalRevenue", (n, d) => n / d),
      format: "percent",
    });
    rows.push({
      key: "margin_op",
      label: "Margem operacional",
      tags: ["margem", "EBIT"],
      values: derived(historicals.income, "ebit", "totalRevenue", (n, d) => n / d),
      format: "percent",
    });
    rows.push({
      key: "margin_net",
      label: "Margem líquida",
      tags: ["margem", "net"],
      values: derived(historicals.income, "netIncome", "totalRevenue", (n, d) => n / d),
      format: "percent",
    });

    // ── Balanço patrimonial ──────────────────────────────────────────────
    push("assets", "Ativo total", "balance", "totalAssets", "currency", ["balanço", "ativo", "assets"]);
    push("liab", "Passivo total", "balance", "totalLiab", "currency", ["balanço", "passivo", "liabilities"]);
    push("equity", "Patrimônio líquido", "balance", "shareholdersEquity", "currency", ["PL", "equity", "patrimonio"]);
    push("cash", "Caixa e equivalentes", "balance", "cash", "currency", ["caixa", "cash"]);
    push("debt_lt", "Dívida de longo prazo", "balance", "longTermDebt", "currency", ["dívida", "debt", "long term"]);
    push("debt_st", "Dívida de curto prazo", "balance", "shortLongTermDebt", "currency", ["dívida", "debt", "short term"]);
    push("debt_total", "Dívida bruta total", "balance", "totalDebt", "currency", ["dívida total", "total debt"]);

    // ── Dívida líquida e alavancagem ─────────────────────────────────────
    rows.push({
      key: "net_debt",
      label: "Dívida líquida",
      tags: ["dívida", "net debt", "alavancagem"],
      values: derivedCross(historicals.balance, historicals.balance, "totalDebt", "cash", (d, c) => d - c),
      format: "currency",
    });
    rows.push({
      key: "debt_to_equity",
      label: "Dívida / PL",
      tags: ["alavancagem", "leverage", "debt equity"],
      values: derivedCross(historicals.balance, historicals.balance, "totalDebt", "shareholdersEquity", (d, e) => d / e),
      format: "multiple",
    });

    // ── Fluxo de caixa ──────────────────────────────────────────────────
    push("ocf", "Caixa operacional (OCF)", "cashflow", "operatingCashFlow", "currency", ["OCF", "operacional", "operating"]);
    push("capex", "Capex", "cashflow", "capitalExpenditures", "currency", ["capex", "investimento"], true);
    push("fcf", "Free cash flow (FCF)", "cashflow", "freeCashFlow", "currency", ["FCF", "livre"]);
    push("div_paid", "Dividendos pagos", "cashflow", "dividendsPaid", "currency", ["proventos pagos", "dividends paid"], true);

    // ── Qualidade do lucro ──────────────────────────────────────────────
    rows.push({
      key: "accruals",
      label: "Accruals ((Lucro líquido − OCF) / Ativo total)",
      tags: ["accruals", "qualidade"],
      values: derivedThree(
        historicals.income,
        historicals.cashflow,
        historicals.balance,
        "netIncome",
        "operatingCashFlow",
        "totalAssets",
        (ni, ocf, ta) => (ni - ocf) / ta,
      ),
      format: "percent",
    });

    return rows;
  }, [historicals]);

  return (
    <div className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`} style={{ fontFamily: "var(--font-manrope)", ...bgStyle }}>
      <div className="px-6 pt-5 pb-12 max-w-screen-2xl mx-auto w-full">
        <AssetSubheader
          symbol={symbol}
          longName={bundle?.longName ?? null}
          logoUrl={bundle?.logoUrl ?? null}
          currency={bundle?.currency ?? "BRL"}
          price={bundle?.quote?.price ?? null}
          change={bundle?.quote?.change ?? null}
          changePercent={bundle?.quote?.changePercent ?? null}
          section={{ slug: "stats/financials", label: "Stats: Financials" }}
        />

        <div className="mt-6 space-y-2">
          <h1 className="text-[24px] font-medium tracking-tight">
            Financials brutos
          </h1>
          <p className="text-[14px] text-muted-foreground max-w-3xl">
            Dados brutos de DRE, balanço patrimonial e fluxo de caixa. Cada coluna é um
            período anual. Use a busca pra filtrar métricas e o seletor de colunas pra
            focar nos anos que importam.
          </p>
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorState message="Falha ao carregar dados fundamentalistas." />
          ) : isLoading || !bundle ? (
            <SkeletonBlock />
          ) : (
            <ExcelTable
              metrics={metrics}
              columns={years}
              formatHeader={(col) => col.slice(0, 4)}
              searchPlaceholder="Buscar métrica (ex: receita, ROE, dívida)"
              emptyMessage="Não há dados fundamentalistas disponíveis para este ativo."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] px-6 py-12 text-center space-y-2">
      <p className="text-[14px]">{message}</p>
      <p className="text-[12px] text-muted-foreground">
        Tente recarregar a página. Se persistir, o dado pode não estar disponível na Brapi.
      </p>
    </div>
  );
}
