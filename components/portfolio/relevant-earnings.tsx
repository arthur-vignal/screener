/**
 * RelevantEarnings — tabela compacta de earnings reports próximos
 * ou recentes para os tickers do portfolio.
 *
 * Estilo Fey: 4 colunas (ticker / empresa / data / EPS / chip Beat|Miss|Est).
 * Dados: mock simples baseado em holdings. Para a próxima leva, plugar
 * `brapiQuote(symbol, {modules: ['earnings']})` ou similar que traga
 * data de release + EPS estimado.
 */

import type { JSX } from "react";

type EarningsEntry = {
  symbol: string;
  company: string;
  when: string;       // ex: "Today at 5:00 AM", "Mar 13 at 4:00 AM"
  eps: number;
  status: "Beat" | "Miss" | "Est";
};

type Props = {
  symbols: string[];
};

const COMPANY_NAMES: Record<string, string> = {
  PETR3: "Petrobras ON",
  PETR4: "Petrobras PN",
  VALE3: "Vale S.A.",
  ITUB4: "Itaú Unibanco",
  BBAS3: "Banco do Brasil",
  BBDC4: "Bradesco PN",
  ABEV3: "Ambev S/A",
  WEGE3: "WEG S.A.",
  MGLU3: "Magazine Luiza",
  RENT3: "Localiza",
};

function mockEarnings(symbol: string, idx: number): EarningsEntry {
  const company = COMPANY_NAMES[symbol] ?? symbol;
  // Datas mock alternando: alguns hoje, outros próximos dias
  const whenOptions = [
    "Today at 5:00 AM",
    "Mar 13 at 4:00 AM",
    "Mar 21 at 4:00 AM",
    "Mar 27 at 5:00 AM",
    "Apr 04 at 4:00 AM",
  ];
  const statusOptions: EarningsEntry["status"][] = ["Beat", "Est", "Miss"];
  return {
    symbol,
    company,
    when: whenOptions[idx % whenOptions.length]!,
    eps: Number((Math.random() * 3 + 0.1).toFixed(2)),
    status: statusOptions[idx % statusOptions.length]!,
  };
}

export function RelevantEarnings({ symbols }: Props): JSX.Element {
  if (symbols.length === 0) return <></>;
  const entries = symbols.slice(0, 6).map((s, i) => mockEarnings(s, i));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
          Relevant earnings
        </h3>
        <button
          type="button"
          aria-label="Expandir"
          className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
      <ul>
        {entries.map((e, i) => (
          <li
            key={e.symbol + i}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-2 hover:bg-white/[0.02] transition-colors text-[12px] border-b border-white/[0.04] last:border-b-0"
          >
            <span className="font-semibold tracking-tight text-foreground w-14">
              {e.symbol}
            </span>
            <span className="text-muted-foreground/85 truncate">
              {e.company}
            </span>
            <span className="text-muted-foreground/70 tabular-nums">
              {e.when}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-foreground tabular-nums">
                {e.eps.toFixed(2)}
              </span>
              <span
                className={
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-tight " +
                  (e.status === "Beat"
                    ? "bg-[#4dbe95]/15 text-[#4dbe95]"
                    : e.status === "Miss"
                    ? "bg-[#d84f68]/15 text-[#d84f68]"
                    : "bg-white/[0.04] text-muted-foreground/85")
                }
              >
                {e.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
