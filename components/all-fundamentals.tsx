"use client";

import { cn } from "@/lib/utils";

/**
 * AllFundamentals — exhaustive list of every metric exposed by
 * /api/asset/[ticker], grouped by category. Each row renders a label
 * (mono uppercase) and the value in tabular mono.
 *
 * Categories (Ledger spec):
 *   Valuation · Profitability · Per share · Cash flow · Dividends · Risk · 52w
 */

type MetricDef = {
  key: string;
  label: string;
  format?: "currency" | "percent" | "ratio" | "number";
};

const CATEGORIES: { title: string; rows: MetricDef[] }[] = [
  {
    title: "Valuation",
    rows: [
      { key: "peRatio", label: "P/E (TTM)", format: "ratio" },
      { key: "pegRatio", label: "PEG", format: "ratio" },
      { key: "priceToBook", label: "P/B", format: "ratio" },
      { key: "priceToSales", label: "P/S", format: "ratio" },
      { key: "evEbitda", label: "EV/EBITDA", format: "ratio" },
      { key: "evRevenue", label: "EV/Revenue", format: "ratio" },
    ],
  },
  {
    title: "Profitability",
    rows: [
      { key: "grossMargin", label: "Gross margin", format: "percent" },
      { key: "operatingMargin", label: "Operating margin", format: "percent" },
      { key: "profitMargin", label: "Net margin", format: "percent" },
      { key: "roe", label: "ROE", format: "percent" },
      { key: "roa", label: "ROA", format: "percent" },
      { key: "roic", label: "ROIC", format: "percent" },
    ],
  },
  {
    title: "Per share",
    rows: [
      { key: "eps", label: "EPS", format: "currency" },
      { key: "bookValuePerShare", label: "Book value / share", format: "currency" },
      { key: "revenuePerShare", label: "Revenue / share", format: "currency" },
    ],
  },
  {
    title: "Cash flow",
    rows: [
      { key: "freeCashFlowYield", label: "FCF yield", format: "percent" },
      { key: "currentRatio", label: "Current ratio", format: "ratio" },
      { key: "debtEquity", label: "Debt / equity", format: "ratio" },
    ],
  },
  {
    title: "Dividends",
    rows: [
      { key: "dividendYield", label: "Dividend yield", format: "percent" },
      { key: "payoutRatio", label: "Payout ratio", format: "percent" },
    ],
  },
  {
    title: "Risk · 52w",
    rows: [
      { key: "beta", label: "Beta (5Y)", format: "ratio" },
      { key: "yearHigh", label: "52w high", format: "currency" },
      { key: "yearLow", label: "52w low", format: "currency" },
    ],
  },
];

function formatValue(v: number | null | undefined, fmt?: MetricDef["format"]): string {
  if (v == null || !Number.isFinite(v)) return "—";
  switch (fmt) {
    case "currency":
      return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    case "percent":
      // The API returns ratios as decimals (0.18 = 18%). Multiply by 100.
      return `${(v * 100).toFixed(2)}%`;
    case "ratio":
      return v.toFixed(2);
    case "number":
    default:
      return v.toLocaleString("en-US");
  }
}

type Metrics = Record<string, number | null | undefined>;

export function AllFundamentals({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
      {CATEGORIES.map((cat) => {
        const hasAny = cat.rows.some((r) => metrics[r.key] != null);
        if (!hasAny) return null;
        return (
          <div key={cat.title}>
            <h3 className="label label-muted-2 mb-2">{cat.title}</h3>
            <div className="border-t border-hairline-strong">
              {cat.rows.map((r) => {
                const v = metrics[r.key];
                const present = v != null && Number.isFinite(v);
                return (
                  <div
                    key={r.key}
                    className="flex items-center justify-between h-[33px] border-b border-hairline"
                  >
                    <span className="label-s label-muted-2">{r.label}</span>
                    <span
                      className={cn(
                        "num text-[12.5px]",
                        present ? "text-ink" : "text-faint",
                      )}
                    >
                      {formatValue(v, r.format)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}