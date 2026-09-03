import type {
  BrapiIncomeStatementPeriod,
  BrapiBalanceSheetPeriod,
} from "@/lib/brapi";
import { totalDebtOf } from "./roic-wacc";

/**
 * Calcula alavavancagem e cobertura de juros (B2 da spec 2026-08-29).
 *
 * Com SELIC no nível atual, alavancagem é o que quebra empresa no Brasil.
 * A página atual não tinha uma linha sobre isso em nenhuma das 3 seções.
 *
 * Cálculo:
 *   - dívida_bruta[t]  = totalDebtOf(balance) — soma granular CVM
 *     (loansAndFinancing + longTermLoansAndFinancing + leaseFinancing +
 *     longTermLeaseFinancing + debentures + longTermDebentures).
 *     Ver `totalDebtOf()` em analytics/roic-wacc.ts.
 *   - dívida_líquida[t] = dívida_bruta - cash - shortTermInvestments
 *   - ebitda_ltm[t] = soma 4 EBITDAs terminando em t
 *   - ebit_ltm[t] = soma 4 EBITs terminando em t
 *   - despesa_financeira_ltm[t] = abs(soma 4 interestExpense) [brapi retorna negativo]
 *   - alavancagem[t] = dívida_líquida / ebitda_ltm
 *   - cobertura[t] = ebit_ltm / despesa_financeira_ltm
 *
 * Casos especiais:
 *   - Caixa líquido (dívida < 0): plota alavancagem negativa (info valiosa)
 *   - EBITDA ≤ 0: pula o ponto (não calcula Infinity)
 *   - Setor financeiro (sectorDisp match): empty state (capital investido
 *     não tem significado em bancos)
 */

export type LeveragePoint = {
  endDate: string;
  grossDebt: number | null;
  netDebt: number | null;
  ebitdaLtm: number | null;
  ebitLtm: number | null;
  interestExpenseLtm: number | null;
  leverage: number | null;
  coverage: number | null;
};

export type LeverageSummary = {
  /** Última alavancagem (× EBITDA). */
  leverage: number | null;
  /** Última cobertura (× juros). */
  coverage: number | null;
  /** True se caixa líquido (dívida líquida < 0). */
  netCash: boolean;
  /** True se setor é Financial Services. */
  isFinancial: boolean;
};

const QUARTERS_LTM = 4;

function num(rec: Record<string, unknown>, key: string): number | null {
  const v = rec[key];
  return v != null && Number.isFinite(v) ? (v as number) : null;
}

function sumLTMField(
  rows: Array<Record<string, unknown>>,
  fromIndex: number,
  field: string,
): number | null {
  let sum = 0;
  let count = 0;
  for (let i = fromIndex; i >= 0 && count < QUARTERS_LTM; i--, count++) {
    const v = rows[i][field];
    if (v == null || !Number.isFinite(v)) return null;
    sum += v as number;
  }
  return count === QUARTERS_LTM ? sum : null;
}

/**
 * Brapi v2 tem `ebitda` (geralmente null) e `cleanEbitda` (populado).
 * Fallback: `ebitda` direto. Devolve o primeiro não-null.
 */
function pickEBITDA(row: Record<string, unknown>): number | null {
  return (
    (row.cleanEbitda as number | null | undefined) ??
    (row.ebitda as number | null | undefined) ??
    null
  );
}

export function computeLeverage(
  income: BrapiIncomeStatementPeriod[],
  balance: BrapiBalanceSheetPeriod[],
  opts: { sectorDisp: string | null },
): { summary: LeverageSummary; series: LeveragePoint[] } {
  const isFinancial =
    typeof opts.sectorDisp === "string" &&
    /financeiro|banco|segurador/i.test(opts.sectorDisp);

  if (isFinancial || income.length < QUARTERS_LTM) {
    return {
      summary: { leverage: null, coverage: null, netCash: false, isFinancial },
      series: [],
    };
  }

  const sortedIncome = [...income].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );
  const sortedBalance = [...balance].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );
  const balanceByDate = new Map<string, BrapiBalanceSheetPeriod>();
  for (const b of sortedBalance) balanceByDate.set(b.endDate, b);

  const series: LeveragePoint[] = [];
  for (let i = 0; i < sortedIncome.length; i++) {
    const row = sortedIncome[i];
    const bal = balanceByDate.get(row.endDate);
    if (!bal) continue;

    // Fix 2026-09-03: dívida granular CVM (loansAndFinancing +
    // longTermLoansAndFinancing + leaseFinancing + longTermLeaseFinancing
    // + debentures + longTermDebentures). Antes somava só shortLongTermDebt
    // + longTermDebt — campos que brapi v2 não popula pra empresas BR,
    // zerando o cálculo de leverage e mostrando "negativo" pra empresa.
    // Ver `totalDebtOf()` em analytics/roic-wacc.ts.
    const grossDebt = totalDebtOf(bal as Record<string, unknown>) ?? 0;
    const cash = num(bal as Record<string, unknown>, "cash") ?? 0;
    const shortTermInvestments =
      num(bal as Record<string, unknown>, "shortTermInvestments") ?? 0;

    const netDebt = grossDebt - cash - shortTermInvestments;

    // EBITDA LTM: usa cleanEbitda (populado) com fallback pra ebitda
    const ebitdaSum: number | null = (() => {
      let sum = 0;
      let count = 0;
      for (let j = i; j >= 0 && count < QUARTERS_LTM; j--, count++) {
        const v = pickEBITDA(sortedIncome[j] as Record<string, unknown>);
        if (v == null) return null;
        sum += v;
      }
      return count === QUARTERS_LTM ? sum : null;
    })();
    const ebitdaLtm = ebitdaSum;

    const ebitLtm = sumLTMField(
      sortedIncome as unknown as Array<Record<string, unknown>>,
      i,
      "ebit",
    );
    // interestExpense geralmente null; financialExpenses é a despesa
    // financeira total (negativa). Fallback progressivo.
    const interestExpenseRaw = sumLTMField(
      sortedIncome as unknown as Array<Record<string, unknown>>,
      i,
      "interestExpense",
    );
    const financialExpensesRaw = sumLTMField(
      sortedIncome as unknown as Array<Record<string, unknown>>,
      i,
      "financialExpenses",
    );
    const interestExpenseLtm =
      interestExpenseRaw != null
        ? Math.abs(interestExpenseRaw)
        : financialExpensesRaw != null && financialExpensesRaw < 0
          ? Math.abs(financialExpensesRaw)
          : null;

    const leverage = ebitdaLtm != null && ebitdaLtm > 0
      ? netDebt / ebitdaLtm
      : null;
    const coverage = ebitLtm != null && interestExpenseLtm != null && interestExpenseLtm > 0
      ? ebitLtm / interestExpenseLtm
      : null;

    series.push({
      endDate: row.endDate,
      grossDebt: grossDebt > 0 ? grossDebt : null,
      netDebt,
      ebitdaLtm,
      ebitLtm,
      interestExpenseLtm,
      leverage,
      coverage,
    });
  }

  const last = series.length > 0 ? series[series.length - 1] : null;
  return {
    summary: {
      leverage: last?.leverage ?? null,
      coverage: last?.coverage ?? null,
      netCash: last != null && (last.netDebt ?? 0) < 0,
      isFinancial: false,
    },
    series,
  };
}