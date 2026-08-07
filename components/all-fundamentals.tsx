"use client";

import { cn } from "@/lib/utils";

type Category = { title: string; rows: { label: string; value: string }[] };

const CATEGORIES: { match: RegExp; title: string }[] = [
  { match: /^(Index|Market Cap|Enterprise Value|Income|Sales|Book|Cash|Dividend|Payout|Employees|IPO)/i, title: "Company" },
  { match: /^(P\/E|P\/S|P\/B|P\/C|P\/FCF|Forward P\/E|PEG|EV\/)/i, title: "Valuation" },
  { match: /^(EPS |Sales |Earnings)/i, title: "Growth" },
  { match: /^(ROA|ROE|ROIC|Gross Margin|Oper\. Margin|Profit Margin)/i, title: "Profitability" },
  { match: /^(Insider|Inst )/i, title: "Ownership" },
  { match: /^(Shs |Short |52W|Volatility|ATR|RSI|SMA|Beta|Rel Volume|Avg Volume|Volume|Trades)/i, title: "Technical" },
  { match: /^(Perf |Recom|Target Price|Prev Close|Price|Change)/i, title: "Performance" },
];

function tone(label: string, value: string): string {
  if (!value || value === "-") return "text-faint";
  const match = value.match(/-?[\d,.]+/);
  if (!match) return "text-ink";
  const n = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(n)) return "text-ink";
  const isContextLabel = /^(Perf|Change|ROA|ROE|ROIC|Gross Margin|Oper\. Margin|Profit Margin|EPS |Sales |SMA\d+|52W (High|Low))/.test(label);
  if (isContextLabel) {
    if (n > 0) return "text-positive";
    if (n < 0) return "text-negative";
  }
  return "text-ink";
}

export function AllFundamentals({ finviz }: { finviz: Record<string, string> | undefined | null }) {
  const safeFinviz = finviz ?? {};
  const available = Object.entries(safeFinviz).filter(([, v]) => v && v !== "-");
  if (available.length === 0) {
    return <div className="py-5 text-[12px] text-faint">Finviz statistics unavailable.</div>;
  }

  const categories: Category[] = [];
  for (const { title, match } of CATEGORIES) {
    const rows = available
      .filter(([label]) => match.test(label))
      .map(([label, value]) => ({ label, value }));
    if (rows.length > 0) categories.push({ title, rows });
  }
  if (available.some(([label]) => !categories.some((c) => c.rows.some((r) => r.label === label)))) {
    const used = new Set(categories.flatMap((c) => c.rows.map((r) => r.label)));
    const extras = available.filter(([label]) => !used.has(label));
    if (extras.length > 0) categories.push({ title: "Other", rows: extras.map(([label, value]) => ({ label, value })) });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <div key={cat.title} className="border border-hairline-strong">
          <div className="px-3 py-2 bg-canvas-soft border-b border-hairline-strong label-s label-muted-2 uppercase tracking-wider">
            {cat.title}
          </div>
          <div>
            {cat.rows.map(({ label, value }) => (
              <div
                key={label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center h-[34px] px-3 border-b border-hairline last:border-b-0"
              >
                <span className="text-[12px] text-muted truncate pr-2">{label}</span>
                <span className={cn("num text-[12.5px] font-semibold text-right whitespace-nowrap tabular-nums", tone(label, value))}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
