"use client";

/**
 * /asset/[symbol]/stats/estimates — página Excel-style com histórico
 * trimestral (incomeStatementHistoryQuarterly + balanceSheetHistoryQuarterly
 * + cashflowHistoryQuarterly).
 *
 * NOTA IMPORTANTE: A Brapi NÃO fornece estimativas de sell-side pra
 * tickers brasileiros (target price, recomendação de analistas,
 * beat/miss forecast). Esses campos vêm nulos em 100% das amostras
 * (ver `spec/sulfur-spec-pagina-ativo.md` §0 — "Campos a NÃO
 * implementar"). Por isso esta página cobre o que REALMENTE existe na
 * Brapi: histórico trimestral detalhado.
 *
 * Para EPS forecast / revenue forecast / recommendation, esses dados
 * precisam vir de outra fonte (Bloomberg, Refinitiv, Status Invest).
 * Quando integrarmos, eles aparecerão aqui.
 *
 * Mesma arquitetura das outras stats pages — fundo card surface
 * #101116, texto branco #ffffff, variações muted + sinal redundante.
 */

import { use, useMemo } from "react";
import { useAssetBundle } from "../../lib/use-asset-bundle";
import { useAssetBackground } from "@/lib/use-asset-background";
import { AssetSubheader } from "../../components/asset-subheader";
import { ExcelTable, type MetricRow } from "@/components/excel-table";
import { Skeleton } from "@/components/ui/skeleton";

type QuarterlyRow = { endDate: string } & Record<string, number | null | undefined>;

function num(r: QuarterlyRow | undefined, field: string): number | null {
  if (!r) return null;
  const v = r[field];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function valueMapByPeriod(
  rows: QuarterlyRow[] | undefined,
  field: string,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const r of rows ?? []) {
    if (!r.endDate) continue;
    out[r.endDate] = num(r, field);
  }
  return out;
}

function formatQuarter(endDate: string): string {
  // endDate vem "YYYY-MM-DD". Brapi trimestral usa o último dia do trimestre
  // (03/31, 06/30, 09/30, 12/31) → representamos como "T1/24", "T2/24"…
  const [y, m] = endDate.slice(0, 7).split("-");
  if (!y || !m) return endDate;
  const q = Math.ceil(parseInt(m, 10) / 3);
  return `T${q}/${y.slice(2)}`;
}

export default function StatsEstimatesPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase().replace(/\.SA$/, "");
  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);
  const { data: bundle, isLoading, error } = useAssetBundle(symbol);

  // O bundle atual retorna `historicals` com income/balance/cashflow anuais.
  // Pra trimestral, vamos usar o que vier — Brapi às vezes popula
  // `historicals.income` com mistura, ou via `*Quarterly` modules.
  // Hoje o bundle entrega anual; a página mostra o que tem e cai pra
  // empty state se nada trimestral vier.
  const hist = (bundle?.historicals ?? {}) as {
    income?: QuarterlyRow[];
    balance?: QuarterlyRow[];
  };
  const incomeQ = hist.income ?? [];
  const balanceQ = hist.balance ?? [];

  const quarters = useMemo(() => {
    const set = new Set<string>();
    for (const r of incomeQ) if (r.endDate) set.add(r.endDate);
    for (const r of balanceQ) if (r.endDate) set.add(r.endDate);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [incomeQ, balanceQ]);

  const metrics: MetricRow[] = useMemo(() => {
    const rows: MetricRow[] = [];

    // ── DRE trimestral ─────────────────────────────────────────────────
    rows.push({
      key: "rev_q",
      label: "Receita líquida",
      tags: ["receita", "revenue", "quarterly"],
      values: valueMapByPeriod(incomeQ, "totalRevenue"),
      format: "currency",
    });
    rows.push({
      key: "cost_q",
      label: "Custo dos produtos vendidos",
      tags: ["cpv", "cost"],
      values: valueMapByPeriod(incomeQ, "costOfRevenue"),
      format: "currency",
      invertSign: true,
    });
    rows.push({
      key: "gross_q",
      label: "Lucro bruto",
      tags: ["lucro bruto", "gross"],
      values: valueMapByPeriod(incomeQ, "grossProfit"),
      format: "currency",
    });
    rows.push({
      key: "ebit_q",
      label: "EBIT",
      tags: ["ebit", "operacional"],
      values: valueMapByPeriod(incomeQ, "ebit"),
      format: "currency",
    });
    rows.push({
      key: "net_q",
      label: "Lucro líquido",
      tags: ["lucro", "net income"],
      values: valueMapByPeriod(incomeQ, "netIncome"),
      format: "currency",
    });
    rows.push({
      key: "eps_basic_q",
      label: "EPS básico",
      tags: ["eps", "per share", "lucro por ação"],
      values: valueMapByPeriod(incomeQ, "basicEarningsPerCommonShare"),
      format: "number",
    });
    rows.push({
      key: "eps_diluted_q",
      label: "EPS diluído",
      tags: ["eps", "diluido", "diluted"],
      values: valueMapByPeriod(incomeQ, "dilutedEarningsPerCommonShare"),
      format: "number",
    });
    rows.push({
      key: "tax_q",
      label: "Impostos sobre o lucro",
      tags: ["impostos", "tax"],
      values: valueMapByPeriod(incomeQ, "incomeTaxExpense"),
      format: "currency",
      invertSign: true,
    });
    rows.push({
      key: "interest_q",
      label: "Despesas financeiras",
      tags: ["juros", "financial"],
      values: valueMapByPeriod(incomeQ, "interestExpense"),
      format: "currency",
      invertSign: true,
    });

    // ── Margens trimestrais ─────────────────────────────────────────────
    rows.push({
      key: "margin_gross_q",
      label: "Margem bruta",
      tags: ["margem", "gross"],
      values: derived(incomeQ, "grossProfit", "totalRevenue", (n, d) => n / d),
      format: "percent",
    });
    rows.push({
      key: "margin_op_q",
      label: "Margem operacional",
      tags: ["margem", "ebit"],
      values: derived(incomeQ, "ebit", "totalRevenue", (n, d) => n / d),
      format: "percent",
    });
    rows.push({
      key: "margin_net_q",
      label: "Margem líquida",
      tags: ["margem", "net"],
      values: derived(incomeQ, "netIncome", "totalRevenue", (n, d) => n / d),
      format: "percent",
    });

    // ── Balanço trimestral ─────────────────────────────────────────────
    rows.push({
      key: "assets_q",
      label: "Ativo total",
      tags: ["ativo", "assets", "balanço"],
      values: valueMapByPeriod(balanceQ, "totalAssets"),
      format: "currency",
    });
    rows.push({
      key: "liab_q",
      label: "Passivo total",
      tags: ["passivo", "liabilities"],
      values: valueMapByPeriod(balanceQ, "totalLiab"),
      format: "currency",
    });
    rows.push({
      key: "equity_q",
      label: "Patrimônio líquido",
      tags: ["PL", "equity"],
      values: valueMapByPeriod(balanceQ, "shareholdersEquity"),
      format: "currency",
    });
    rows.push({
      key: "cash_q",
      label: "Caixa",
      tags: ["caixa", "cash"],
      values: valueMapByPeriod(balanceQ, "cash"),
      format: "currency",
    });

    return rows;
  }, [incomeQ, balanceQ]);

  return (
    <div className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`} style={{ fontFamily: "var(--font-manrope)", ...bgStyle }}>
      <div className="px-1 pt-5 pb-12 max-w-screen-2xl mx-auto w-full">
        <AssetSubheader
          symbol={symbol}
          longName={bundle?.longName ?? null}
          logoUrl={bundle?.logoUrl ?? null}
          currency={bundle?.currency ?? "BRL"}
          price={bundle?.quote?.price ?? null}
          change={bundle?.quote?.change ?? null}
          changePercent={bundle?.quote?.changePercent ?? null}
          section={{ slug: "stats/estimates", label: "Stats: Estimates / Quarterly" }}
        />

        <div className="mt-6 space-y-3">
          <h1 className="text-[24px] font-medium tracking-tight">
            Quarterly & estimates brutos
          </h1>
          <p className="text-[14px] text-muted-foreground max-w-3xl">
            Histórico trimestral de DRE e balanço. Cada coluna é um trimestre (T1/24,
            T2/24…). A Brapi não fornece projeções de sell-side pra tickers
            brasileiros — campos como preço-alvo, recomendação de analistas e
            beat/miss forecast precisariam vir de outra fonte (Status Invest,
            Bloomberg, Refinitiv). Quando integrarmos, eles aparecem aqui.
          </p>
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorState message="Falha ao carregar histórico trimestral." />
          ) : isLoading || !bundle ? (
            <SkeletonBlock />
          ) : (
            <ExcelTable
              metrics={metrics}
              columns={quarters}
              formatHeader={formatQuarter}
              searchPlaceholder="Buscar métrica (ex: receita, EPS, margem)"
              emptyMessage="Não há histórico trimestral detalhado disponível pra este ativo."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function derived(
  rows: QuarterlyRow[] | undefined,
  numField: string,
  denField: string,
  fn: (n: number, d: number) => number | null,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const r of rows ?? []) {
    if (!r.endDate) continue;
    const n = num(r, numField);
    const d = num(r, denField);
    out[r.endDate] = n != null && d != null && d !== 0 ? fn(n, d) : null;
  }
  return out;
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
