"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrapiFull } from "@/lib/brapi-full";

const BR = "\u{1F1E7}\u{1F1F7}";

type BrapiFull = Awaited<ReturnType<typeof getBrapiFull>>;

export default function ModelPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  return (
    <Suspense fallback={<ModelFallback />}>
      <ModelInner params={params} />
    </Suspense>
  );
}

function ModelFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-72" />
    </div>
  );
}

function ModelInner({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const [data, setData] = useState<BrapiFull | null>(null);

  useEffect(() => {
    getBrapiFull(symbol.toUpperCase())
      .then(setData)
      .catch(() => setData(null));
  }, [symbol]);

  if (!data) {
    return <ModelFallback />;
  }

  const q = data.quote;
  const profile = data.profile;
  const fd = data.financialData;
  const ks = data.keyStatistics;

  // Build a minimal 3-statement snapshot from what Brapi exposes.
  // Real P&L / balance sheet / cash flow statements require balance-sheet
  // endpoints (Cloudflare-blocked). Here we surface the fundamentals
  // available so the user can paste them into their Excel template.
  const rows: Array<{ metric: string; value: string }> = [
    {
      metric: "Receita (estimada por shares × market cap / P/S proxy)",
      value: q.marketCap && q.priceEarnings ? "—" : "—",
    },
    {
      metric: "Lucro líquido (market cap / P/E)",
      value: q.marketCap && q.priceEarnings
        ? `R$ ${(q.marketCap / q.priceEarnings / 1e9).toFixed(2)} bi`
        : "—",
    },
    {
      metric: "EPS (TTM)",
      value: q.earningsPerShare != null ? `R$ ${q.earningsPerShare.toFixed(2)}` : "—",
    },
    {
      metric: "Market cap",
      value: q.marketCap != null ? `R$ ${(q.marketCap / 1e9).toFixed(2)} bi` : "—",
    },
    {
      metric: "ROE (proxy = 1/P/L)",
      value: q.priceEarnings ? `${(100 / q.priceEarnings).toFixed(1)}%` : "—",
    },
    {
      metric: "Margem líquida (se reportada)",
      value: fd?.profitMargins != null ? `${(fd.profitMargins * 100).toFixed(1)}%` : "n/d",
    },
    {
      metric: "Receita TTM (financialData)",
      value: fd?.totalRevenue != null ? `R$ ${(fd.totalRevenue / 1e9).toFixed(2)} bi` : "n/d",
    },
    {
      metric: "EBITDA",
      value: fd?.ebitda != null ? `R$ ${(fd.ebitda / 1e9).toFixed(2)} bi` : "n/d",
    },
    {
      metric: "Free cash flow",
      value: fd?.freeCashflow != null ? `R$ ${(fd.freeCashflow / 1e9).toFixed(2)} bi` : "n/d",
    },
    {
      metric: "Dívida total",
      value: fd?.totalDebt != null ? `R$ ${(fd.totalDebt / 1e9).toFixed(2)} bi` : "n/d",
    },
    {
      metric: "Caixa total",
      value: fd?.totalCash != null ? `R$ ${(fd.totalCash / 1e9).toFixed(2)} bi` : "n/d",
    },
    {
      metric: "P/L (TTM)",
      value: q.priceEarnings != null ? q.priceEarnings.toFixed(2) : "—",
    },
    {
      metric: "P/VP",
      value: ks?.priceToBook != null ? ks.priceToBook.toFixed(2) : "n/d",
    },
    {
      metric: "EV/EBITDA",
      value: ks?.enterpriseToEbitda != null ? ks.enterpriseToEbitda.toFixed(2) : "n/d",
    },
    {
      metric: "ROE (Brapi)",
      value: fd?.returnOnEquity != null ? `${(fd.returnOnEquity * 100).toFixed(1)}%` : "n/d",
    },
    {
      metric: "Setor",
      value: profile?.sector ?? "—",
    },
  ];

  // CSV export
  const csv =
    "metric,value\n" +
    rows.map((r) => `"${r.metric.replace(/"/g, '""')}","${r.value.replace(/"/g, '""')}"`).join("\n");

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol.toUpperCase()}-sulfur-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <Link
        href={`/asset/${encodeURIComponent(symbol.toUpperCase())}`}
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-3 link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        {symbol.toUpperCase()}
      </Link>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            Auto-populate Modelo {BR}
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Snapshot dos fundamentais de <strong>{symbol.toUpperCase()}</strong>{" "}
            via Brapi Pro. Use o botão abaixo pra exportar um template CSV
            pronto pra colar no seu Excel. Demonstrações (DRE / BP / DFC)
            históricas ainda dependem dos endpoints de balanço da Brapi,
            bloqueados por anti-bot.
          </p>
        </div>
        <button
          onClick={downloadCsv}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </div>

      <div className="border border-hairline-strong overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.metric}
                className={cn(
                  "border-b border-hairline last:border-0",
                  i % 2 === 0 ? "bg-canvas" : "bg-surface-elevated",
                )}
              >
                <td className="py-2 px-3 text-ink">{r.metric}</td>
                <td className="py-2 px-3 num text-right text-ink font-medium">
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 border border-hairline-strong text-[11.5px] text-muted leading-relaxed flex items-start gap-2">
        <FileSpreadsheet className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong className="text-ink">Limitação:</strong> Os endpoints de
          <code className="bg-surface-elevated px-1.5 py-0.5 ml-1">/v2/stocks/{symbol}/balance-sheet</code>
          e <code className="bg-surface-elevated px-1.5 py-0.5 ml-1">/financial-data</code>
          retornam HTML (Cloudflare anti-bot). Sem esses endpoints, não dá pra
          popular DRE/BP/DFC históricos automaticamente. Os valores acima vêm
          do snapshot <code className="bg-surface-elevated px-1.5 py-0.5 ml-1">/quote?fundamental=true</code>{" "}
          + <code className="bg-surface-elevated px-1.5 py-0.5 ml-1">/profile</code>.
        </div>
      </div>
    </div>
  );
}
