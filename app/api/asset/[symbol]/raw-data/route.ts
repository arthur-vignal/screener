/**
 * /api/asset/[symbol]/raw-data — série anual (10 anos) consolidada.
 *
 * Combina 4 fontes brapi v2 Pro em paralelo e retorna métricas por ano:
 *   - `/v2/stocks/income-statement?period=annual`  → receita, lucro, EBITDA
 *   - `/v2/stocks/balance-sheet?period=annual`     → ativo total, passivo, caixa
 *   - `/v2/stocks/financial-data?period=annual`    → ROE, ROA, margens, growth
 *   - `/v2/stocks/statistics?mode=history&period=annual` → P/L, dividendYield
 *
 * Faixa: 10 anos mais recentes (range=10y). brapi retorna 16 anos no
 * bundle, então 10y cabe sem corte. Pedido Arthur 2026-08-31: 10y para
 * capturar ciclos longos (Lava Jato, COVID).
 *
 * Cache 24h server-side via `cached()` em cada wrapper granular.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  brapiIncomeStatement,
  brapiBalanceSheet,
  brapiFinancialData,
  brapiStatistics,
} from "@/lib/brapi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const YEARS_TO_KEEP = 10;
const PERIOD = "annual";

type YearRow = {
  endDate: string;
  year: number;
  // Income
  totalRevenue: number | null;
  revenueGrowth: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  // Margins (do financial-data — fica na mesma row)
  grossMargin: number | null;
  ebitdaMargin: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  // Balance
  totalAssets: number | null;
  totalLiab: number | null;
  equity: number | null;
  cash: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  // Returns / ratios
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  // Fan-out paralelo — v2 endpoints são independentes.
  const [income, balance, finData, stats] = await Promise.all([
    brapiIncomeStatement({ symbol, period: PERIOD }),
    brapiBalanceSheet({ symbol, period: PERIOD }),
    brapiFinancialData({ symbol, mode: "history", period: PERIOD }),
    brapiStatistics({ symbol, mode: "history", period: PERIOD }),
  ]);

  const currentYear = new Date().getUTCFullYear();
  const minYear = currentYear - YEARS_TO_KEEP + 1; // inclusivo

  // Index por endDate — cada fonte tem o próprio array, alguns podem
  // ter anos faltando (ex: ticker novo com <16 anos).
  const byYear = new Map<string, YearRow>();

  function getOrCreate(endDate: string): YearRow {
    const y = Number(endDate.slice(0, 4));
    const existing = byYear.get(endDate);
    if (existing) return existing;
    const row: YearRow = {
      endDate,
      year: y,
      totalRevenue: null,
      revenueGrowth: null,
      grossProfit: null,
      operatingIncome: null,
      netIncome: null,
      ebitda: null,
      grossMargin: null,
      ebitdaMargin: null,
      operatingMargin: null,
      profitMargin: null,
      totalAssets: null,
      totalLiab: null,
      equity: null,
      cash: null,
      totalDebt: null,
      netDebt: null,
      returnOnEquity: null,
      returnOnAssets: null,
      trailingPE: null,
      dividendYield: null,
    };
    byYear.set(endDate, row);
    return row;
  }

  // Income — anual já vem pronto (soma 4Q já feita pela brapi).
  for (const r of income as Array<Record<string, unknown>>) {
    const endDate = String(r.endDate ?? "");
    if (!endDate) continue;
    const row = getOrCreate(endDate);
    const num = (k: string): number | null => {
      const v = r[k];
      return typeof v === "number" && Number.isFinite(v) ? (v as number) : null;
    };
    row.totalRevenue = num("totalRevenue");
    row.grossProfit = num("grossProfit");
    row.operatingIncome = num("operatingIncome");
    row.netIncome = num("netIncome");
    // EBITDA vem em fin-data (não income), deixar null aqui.
  }

  // Balance — point-in-time no último Q do ano.
  for (const r of balance as Array<Record<string, unknown>>) {
    const endDate = String(r.endDate ?? "");
    if (!endDate) continue;
    const row = getOrCreate(endDate);
    const num = (k: string): number | null => {
      const v = r[k];
      return typeof v === "number" && Number.isFinite(v) ? (v as number) : null;
    };
    row.totalAssets = num("totalAssets");
    row.totalLiab = num("totalLiab");
    if (row.totalAssets != null && row.totalLiab != null) {
      row.equity = row.totalAssets - row.totalLiab;
    }
    row.cash = num("cash");
    row.totalDebt = num("longTermDebt") ?? num("shortLongTermDebt");
    if (row.totalDebt != null && row.cash != null) {
      row.netDebt = row.totalDebt - row.cash;
    }
  }

  // Financial-data — ROE, ROA, margens, growth, EBITDA.
  for (const r of finData as Array<Record<string, unknown>>) {
    const endDate = String(r.endDate ?? "");
    if (!endDate) continue;
    const row = getOrCreate(endDate);
    const num = (k: string): number | null => {
      const v = r[k];
      return typeof v === "number" && Number.isFinite(v) ? (v as number) : null;
    };
    const pct = (k: string): number | null => {
      const v = num(k);
      return v != null ? v * 100 : null; // brapi devolve fração (0.07 = 7%)
    };
    row.grossMargin = pct("grossMargins");
    row.ebitdaMargin = pct("ebitdaMargins");
    row.operatingMargin = pct("operatingMargins");
    row.profitMargin = pct("profitMargins");
    row.returnOnEquity = pct("returnOnEquity");
    row.returnOnAssets = pct("returnOnAssets");
    row.revenueGrowth = pct("revenueGrowthAnnual");
    row.ebitda = num("ebitda");
    // netDebt do fin-data é mais confiável (totalDebt agregado)
    if (row.totalDebt == null) row.totalDebt = num("totalDebt");
    if (row.cash != null && row.totalDebt != null && row.netDebt == null) {
      row.netDebt = row.totalDebt - row.cash;
    }
  }

  // Stats — P/L, dividend yield anual.
  for (const r of stats as Array<Record<string, unknown>>) {
    const endDate = String(r.endDate ?? "");
    if (!endDate) continue;
    const row = getOrCreate(endDate);
    const num = (k: string): number | null => {
      const v = r[k];
      return typeof v === "number" && Number.isFinite(v) ? (v as number) : null;
    };
    row.trailingPE = num("trailingPE");
    const y = num("dividendYield") ?? num("yield");
    // brapi devolve em fração (0.07 = 7%), normalizar pra %
    row.dividendYield = y != null ? y * 100 : null;
  }

  // Filtra últimos N anos + ordena desc por endDate (mais recente primeiro).
  const rows = Array.from(byYear.values())
    .filter((r) => r.year >= minYear)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1));

  return NextResponse.json({
    symbol,
    rows,
    range: `${minYear}-${currentYear}`,
    fetchedAt: new Date().toISOString(),
  });
}