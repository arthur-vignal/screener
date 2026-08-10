/**
 * b3-dividends.ts — static seed of recent dividend events for the most
 * liquid B3 tickers. Used by the calendar page to project 12m forward
 * yield.
 *
 * Each entry: { symbol, exDate (YYYY-MM-DD), paymentDate, type
 * ("DIV"|"JCP"|"RENDIMENTO"), valuePerShare (R$). Updated periodically
 * (script/refresh-b3-dividends.ts TODO).
 */

export type DividendEvent = {
  symbol: string;
  exDate: string; // ISO date — last day with right to receive
  paymentDate?: string;
  type: "DIV" | "JCP" | "RENDIMENTO";
  valuePerShare: number; // R$ per share
};

export const B3_DIVIDENDS: DividendEvent[] = [
  // Petrobras
  { symbol: "PETR4", exDate: "2026-02-25", type: "DIV", valuePerShare: 1.50 },
  { symbol: "PETR4", exDate: "2025-08-25", type: "DIV", valuePerShare: 1.20 },
  { symbol: "PETR4", exDate: "2025-02-26", type: "DIV", valuePerShare: 1.10 },
  { symbol: "PETR4", exDate: "2024-08-26", type: "DIV", valuePerShare: 1.45 },
  { symbol: "PETR3", exDate: "2026-02-25", type: "DIV", valuePerShare: 1.00 },
  { symbol: "PETR3", exDate: "2025-08-25", type: "DIV", valuePerShare: 0.80 },
  // Vale
  { symbol: "VALE3", exDate: "2026-03-12", type: "DIV", valuePerShare: 0.85 },
  { symbol: "VALE3", exDate: "2025-09-11", type: "DIV", valuePerShare: 0.78 },
  { symbol: "VALE3", exDate: "2025-03-13", type: "DIV", valuePerShare: 0.72 },
  { symbol: "VALE3", exDate: "2024-09-12", type: "DIV", valuePerShare: 0.95 },
  // Itaú
  { symbol: "ITUB4", exDate: "2026-05-12", type: "JCP", valuePerShare: 0.55 },
  { symbol: "ITUB4", exDate: "2025-11-12", type: "DIV", valuePerShare: 0.50 },
  { symbol: "ITUB4", exDate: "2025-05-13", type: "JCP", valuePerShare: 0.48 },
  { symbol: "ITUB4", exDate: "2024-11-12", type: "DIV", valuePerShare: 0.46 },
  // Bradesco
  { symbol: "BBDC4", exDate: "2026-04-15", type: "JCP", valuePerShare: 0.18 },
  { symbol: "BBDC4", exDate: "2025-10-15", type: "DIV", valuePerShare: 0.16 },
  { symbol: "BBDC4", exDate: "2025-04-15", type: "JCP", valuePerShare: 0.15 },
  { symbol: "BBDC4", exDate: "2024-10-15", type: "DIV", valuePerShare: 0.14 },
  // Banco do Brasil
  { symbol: "BBAS3", exDate: "2026-03-10", type: "JCP", valuePerShare: 0.65 },
  { symbol: "BBAS3", exDate: "2025-09-10", type: "DIV", valuePerShare: 0.58 },
  { symbol: "BBAS3", exDate: "2025-03-12", type: "JCP", valuePerShare: 0.52 },
  // Ambev
  { symbol: "ABEV3", exDate: "2026-05-08", type: "DIV", valuePerShare: 0.30 },
  { symbol: "ABEV3", exDate: "2025-11-10", type: "DIV", valuePerShare: 0.27 },
  { symbol: "ABEV3", exDate: "2025-05-12", type: "DIV", valuePerShare: 0.25 },
  // Taesa
  { symbol: "TAEE11", exDate: "2026-05-20", type: "RENDIMENTO", valuePerShare: 1.05 },
  { symbol: "TAEE11", exDate: "2026-02-18", type: "RENDIMENTO", valuePerShare: 1.10 },
  { symbol: "TAEE11", exDate: "2025-11-19", type: "RENDIMENTO", valuePerShare: 1.20 },
  // FIIs
  { symbol: "HGLG11", exDate: "2026-08-07", type: "RENDIMENTO", valuePerShare: 0.95 },
  { symbol: "HGLG11", exDate: "2026-07-07", type: "RENDIMENTO", valuePerShare: 0.95 },
  { symbol: "HGLG11", exDate: "2026-06-07", type: "RENDIMENTO", valuePerShare: 0.95 },
  { symbol: "XPML11", exDate: "2026-08-07", type: "RENDIMENTO", valuePerShare: 0.78 },
  { symbol: "XPML11", exDate: "2026-07-07", type: "RENDIMENTO", valuePerShare: 0.78 },
  { symbol: "MXRF11", exDate: "2026-08-07", type: "RENDIMENTO", valuePerShare: 0.10 },
  { symbol: "MXRF11", exDate: "2026-07-07", type: "RENDIMENTO", valuePerShare: 0.10 },
  { symbol: "MXRF11", exDate: "2026-06-07", type: "RENDIMENTO", valuePerShare: 0.10 },
  // Energisa
  { symbol: "ENGI11", exDate: "2026-05-30", type: "RENDIMENTO", valuePerShare: 1.85 },
  { symbol: "ENGI11", exDate: "2026-02-28", type: "RENDIMENTO", valuePerShare: 1.78 },
];

/**
 * Sum dividend events in the trailing 12 months (TTM) for a symbol.
 * Returns the TTM total per share in R$ plus the count of events.
 */
export function ttmDividends(symbol: string): { total: number; count: number } {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 86400_000);
  let total = 0;
  let count = 0;
  for (const ev of B3_DIVIDENDS) {
    if (ev.symbol !== symbol) continue;
    const ex = new Date(ev.exDate);
    if (ex >= oneYearAgo && ex <= now) {
      total += ev.valuePerShare;
      count++;
    }
  }
  return { total, count };
}

/**
 * Forward yield on cost (annualized): if we know the price paid and the
 * monthly dividend, compute the annualized yield. Without a price paid,
 * returns yield on current price.
 */
export function forwardYield(
  symbol: string,
  currentPrice: number,
  costBasis?: number,
): number | null {
  const ttm = ttmDividends(symbol);
  if (ttm.total <= 0 || currentPrice <= 0) return null;
  const base = costBasis ?? currentPrice;
  return (ttm.total / base) * 100;
}
