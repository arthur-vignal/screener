"use client";

import { cn } from "@/lib/utils";

type Category = { title: string; rows: { label: string; value: string }[] };

// ——— Universal value formatters ———

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

function fmtBRL(n: number): string {
  if (Math.abs(n) >= 1e9) return `R$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `R$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `R$${(n / 1e3).toFixed(2)}K`;
  return `R$${n.toFixed(2)}`;
}

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

// ——— US path: legacy Finviz label-based parser (regex on strings) ———

const FINVIZ_CATEGORIES: { match: RegExp; title: string }[] = [
  { match: /^(Index|Market Cap|Enterprise Value|Income|Sales|Book|Cash|Dividend|Payout|Employees|IPO)/i, title: "Company" },
  { match: /^(P\/E|P\/S|P\/B|P\/C|P\/FCF|Forward P\/E|PEG|EV\/)/i, title: "Valuation" },
  { match: /^(EPS |Sales |Earnings)/i, title: "Growth" },
  { match: /^(ROA|ROE|ROIC|Gross Margin|Oper\. Margin|Profit Margin)/i, title: "Profitability" },
  { match: /^(Insider|Inst )/i, title: "Ownership" },
  { match: /^(Shs |Short |52W|Volatility|ATR|RSI|SMA|Beta|Rel Volume|Avg Volume|Volume|Trades)/i, title: "Technical" },
  { match: /^(Perf |Recom|Target Price|Prev Close|Price|Change)/i, title: "Performance" },
];

function tone(label: string, value: string): string {
  if (!value || value === "—") return "text-faint";
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

// ——— BR path: semantic mapper from metrics object ———

type Metrics = Record<string, number | null>;

type FieldFormat = "pct" | "ratio" | "brl-currency" | "usd-currency" | "date" | "int";

const METRIC_GROUPS: { title: string; fields: Array<[string, string, FieldFormat]> }[] = [
  {
    title: "Valuation",
    fields: [
      ["peRatio", "P/E", "ratio"],
      ["forwardPE", "Forward P/E", "ratio"],
      ["pegRatio", "PEG", "ratio"],
      ["priceToBook", "P/VP", "ratio"],
      ["priceToSales", "P/Receita", "ratio"],
      ["evRevenue", "EV / Receita", "brl-currency"],
      ["evEbitda", "EV / EBITDA", "brl-currency"],
      ["earningsYield", "Earnings Yield", "pct"],
    ],
  },
  {
    title: "Profitability",
    fields: [
      ["roe", "ROE", "pct"],
      ["roa", "ROA", "pct"],
      ["roic", "ROIC", "pct"],
      ["grossMargin", "Margem Bruta", "pct"],
      ["operatingMargin", "Margem Operacional", "pct"],
      ["profitMargin", "Margem Líquida", "pct"],
    ],
  },
  {
    title: "Per share",
    fields: [
      ["eps", "EPS (LPA)", "brl-currency"],
      ["forwardEps", "EPS Estimado", "brl-currency"],
      ["bookValuePerShare", "Valor Patrimonial / ação", "brl-currency"],
      ["revenuePerShare", "Receita / ação", "brl-currency"],
      ["totalCashPerShare", "Caixa / ação", "brl-currency"],
      ["dividendRate", "Dividendo / ação", "brl-currency"],
    ],
  },
  {
    title: "Growth",
    fields: [
      ["earningsGrowthQuarterly", "Lucro T/T (Q/Q)", "pct"],
      ["earningsGrowthAnnual", "Lucro A/A (Y/Y)", "pct"],
      ["revenueGrowthQuarterly", "Receita T/T (Q/Q)", "pct"],
      ["revenueGrowthAnnual", "Receita A/A (Y/Y)", "pct"],
    ],
  },
  {
    title: "Cash flow",
    fields: [
      ["freeCashFlow", "Free Cash Flow", "brl-currency"],
      ["operatingCashFlow", "Caixa Operacional", "brl-currency"],
    ],
  },
  {
    title: "Dividends",
    fields: [
      ["dividendYield", "Dividend Yield", "pct"],
      ["payoutRatio", "Payout Ratio", "pct"],
      ["lastDividendValue", "Último Dividendo", "brl-currency"],
      ["lastDividendDate", "Data Último Dividendo", "date"],
    ],
  },
  {
    title: "Balance sheet",
    fields: [
      ["totalCash", "Caixa Total", "brl-currency"],
      ["totalDebt", "Dívida Total", "brl-currency"],
      ["debtEquity", "Dívida / PL", "ratio"],
      ["currentRatio", "Liquidez Corrente", "ratio"],
      ["quickRatio", "Liquidez Seca", "ratio"],
      ["totalRevenue", "Receita Total", "brl-currency"],
      ["ebitda", "EBITDA", "brl-currency"],
    ],
  },
  {
    title: "Risk",
    fields: [
      ["beta", "Beta", "ratio"],
      ["yearHigh", "52w High", "brl-currency"],
      ["yearLow", "52w Low", "brl-currency"],
    ],
  },
  {
    title: "Share structure",
    fields: [
      ["sharesOutstanding", "Ações em Circulação", "int"],
      ["floatShares", "Free Float", "int"],
      ["heldPercentInsiders", "Insiders", "pct"],
      ["heldPercentInstitutions", "Instituições", "pct"],
    ],
  },
  {
    title: "Analyst targets",
    fields: [
      ["targetHighPrice", "Alvo (máx)", "brl-currency"],
      ["targetLowPrice", "Alvo (mín)", "brl-currency"],
      ["targetMeanPrice", "Alvo (média)", "brl-currency"],
      ["targetMedianPrice", "Alvo (mediano)", "brl-currency"],
      ["recommendationMean", "Recomendação (1=Buy, 5=Sell)", "ratio"],
      ["numberOfAnalystOpinions", "# Analistas", "int"],
    ],
  },
];

function formatField(value: unknown, fmt: FieldFormat, currency: string): string {
  if (value == null) return "";
  if (fmt === "date") return String(value);
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  switch (fmt) {
    case "pct":
      return fmtPct(value);
    case "ratio":
      return fmtRatio(value);
    case "int":
      return Math.round(value).toLocaleString("pt-BR");
    case "brl-currency":
    case "usd-currency":
      return currency === "BRL" ? fmtBRL(value) : fmtUSD(value);
    default:
      return String(value);
  }
}

type AllFundamentalsProps = {
  /** US path — legacy Finviz snapshot (label → value). */
  finviz?: Record<string, string> | null;
  /** BR/US path — normalized metrics map (semantic key → numeric value). */
  metrics?: Record<string, number | null> | null;
  /** Determines currency formatting in BR paths. Defaults to USD. */
  currency?: string;
};

export function AllFundamentals({ finviz, metrics, currency = "USD" }: AllFundamentalsProps) {
  // Prefer BR/US semantic metrics when present and non-empty.
  const metricsArr = metrics ? Object.entries(metrics) : [];
  const hasMetrics = metricsArr.some(([, v]) => v != null);

  if (hasMetrics) {
    const categories: Category[] = [];
    for (const group of METRIC_GROUPS) {
      const rows: { label: string; value: string }[] = [];
      for (const [key, label, fmt] of group.fields) {
        const v = metrics?.[key];
        const value = formatField(v, fmt, currency);
        if (value) rows.push({ label, value });
      }
      if (rows.length > 0) categories.push({ title: group.title, rows });
    }

    if (categories.length === 0) {
      return (
        <div className="py-5 text-[12px] text-faint">
          No fundamental data available for this ticker.
        </div>
      );
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

  // Fallback: Finviz US path (legacy string-based parser).
  const safeFinviz = finviz ?? {};
  const available = Object.entries(safeFinviz).filter(([, v]) => v && v !== "-");
  if (available.length === 0) {
    return (
      <div className="py-5 text-[12px] text-faint">
        Fundamental data unavailable for this ticker.
      </div>
    );
  }

  const categories: Category[] = [];
  for (const { title, match } of FINVIZ_CATEGORIES) {
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