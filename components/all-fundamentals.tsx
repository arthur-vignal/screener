"use client";

import { cn } from "@/lib/utils";

const ROWS: string[][] = [
  ["Index", "Market Cap", "Enterprise Value", "Income", "Sales", "Book/sh", "Cash/sh", "Dividend Est.", "Dividend TTM", "Dividend Ex-Date", "Dividend Gr. 3/5Y", "Payout", "Employees", "IPO"],
  ["P/E", "Forward P/E", "PEG", "P/S", "P/B", "P/C", "P/FCF", "EV/EBITDA", "EV/Sales", "Quick Ratio", "Current Ratio", "Debt/Eq", "LT Debt/Eq", "Option/Short"],
  ["EPS (ttm)", "EPS next Y", "EPS next Q", "EPS this Y", "EPS next Y", "EPS next 5Y", "EPS past 3/5Y", "Sales past 3/5Y", "EPS Y/Y TTM", "Sales Y/Y TTM", "EPS Q/Q", "Sales Q/Q", "Earnings", "EPS/Sales Surpr."],
  ["Insider Own", "Insider Trans", "Inst Own", "Inst Trans", "ROA", "ROE", "ROIC", "Gross Margin", "Oper. Margin", "Profit Margin", "SMA20", "SMA50", "SMA200", "Trades"],
  ["Shs Outstand", "Shs Float", "Short Float", "Short Ratio", "Short Interest", "52W High", "52W Low", "Volatility", "ATR (14)", "RSI (14)", "Beta", "Rel Volume", "Avg Volume", "Volume"],
  ["Perf Week", "Perf Month", "Perf Quarter", "Perf Half Y", "Perf YTD", "Perf Year", "Perf 3Y", "Perf 5Y", "Perf 10Y", "Recom", "Target Price", "Prev Close", "Price", "Change"],
];

const NEGATIVE_IS_BAD = /^(Income|ROA|ROE|ROIC|Gross Margin|Oper\. Margin|Profit Margin|Perf |Change|EPS |Sales )/;

function tone(label: string, value: string): string {
  if (!value || value === "-") return "text-faint";
  const match = value.match(/-?[\d,.]+/);
  if (!match) return "text-ink";
  const n = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(n)) return "text-ink";
  if (NEGATIVE_IS_BAD.test(label) || /SMA\d+|52W (High|Low)/.test(label)) {
    if (n > 0) return "text-positive";
    if (n < 0) return "text-negative";
  }
  return "text-ink";
}

export function AllFundamentals({ finviz }: { finviz: Record<string, string> }) {
  const columns = ROWS.filter((column) => column.some((label) => finviz[label] != null));
  if (columns.length === 0) {
    return <div className="py-5 text-[12px] text-faint">Finviz statistics unavailable.</div>;
  }

  return (
    <div className="border border-hairline-strong divide-y divide-hairline">
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className={cn("grid items-stretch", columnIndex > 0 && "border-t border-hairline-strong")}
          style={{ gridTemplateColumns: `repeat(${column.length}, minmax(0, 1fr))` }}
        >
          {column.map((label) => {
            const value = finviz[label] ?? "-";
            return (
              <div
                key={label}
                className="flex items-baseline justify-between gap-2 min-w-0 h-[34px] px-3 border-r border-hairline last:border-r-0"
              >
                <span className="text-[11px] text-muted truncate">{label}</span>
                <span className={cn("num text-[11.5px] font-semibold text-right truncate", tone(label, value))}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
