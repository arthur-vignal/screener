import type {
  BrapiFinancialDataPeriod,
  BrapiIncomeStatementPeriod,
  BrapiBalanceSheetPeriod,
  BrapiCashflowPeriod,
  BrapiKeyStatisticsPeriod,
} from "@/lib/brapi";

/**
 * Calcula ROIC vs WACC (A4 da spec 2026-08-29).
 *
 * Antes: componente era "ROE vs SELIC real" — ROE é alavancado e
 * SELIC nua não é Ke. Empresa alavancada parecia criar valor só pelo
 * efeito da alavancagem.
 *
 * Agora: ROIC = NOPAT / capital_investido, vs WACC = (E/V)·Ke + (D/V)·Kd·(1-t).
 *
 * Cálculo:
   - NOPAT[t] = EBIT[t] × (1 − t_efetiva), onde t_efetiva =
     incomeTax / incomeBeforeTax, clamp [0, 0.45] (alíquota efetiva)
   - capital_investido[t] = shortDebt + longDebt + equity - cash
     (fallbacks sucessivos quando campo null)
   - ROIC_ltm[t] = NOPAT_ltm / média(capital_investido[t], capital_investido[t-4])
     (denominador médio evita volatilidade por emissão/amortização)
   - Ke = ntnb_longa + beta × ERP, com ERP default 5.5% (constante lib/)
   - Kd[t] = abs(despesa_financeira_ltm) / média(divida_bruta[t], divida_bruta[t-4])
   - WACC = (E/V)·Ke + (D/V)·Kd·(1 − t)
 *
 * Premissas visíveis: ERP, beta (null → 1.0), alíquota. Documentadas
 * no tooltip.
 *
 * Financial Services: capital investido não tem significado (capital
 * regulatório ≠ capital operacional). Caller trata (empty state).
 */

export type ROICWACCSettings = {
  /** Equity Risk Premium default (%). */
  erp: number;
  /** NTN-B longa default usada como risk-free (%). */
  riskFreeRate: number;
  /** Alíquota marginal efetiva (%). */
  marginalTaxRate: number;
};

export const DEFAULT_ROIC_WACC_SETTINGS: ROICWACCSettings = {
  erp: 5.5,
  riskFreeRate: 13.5, // NTN-B 2045 ~7% real + ~6% IPCA esperado = ~13.5% nominal
  marginalTaxRate: 34.0, // IR + CSLL Brasil
};

export type ROICWACCPoint = {
  endDate: string;
  /** NOPAT em R$ (LTM, soma 4 quarters). */
  nopat: number | null;
  /** Capital investido em R$ (snapshot). */
  capitalInvestido: number | null;
  /** Capital investido 4Q atrás (pra média). */
  capitalInvestidoPrior: number | null;
  /** ROIC em % a.a. (LTM, denominador médio). */
  roic: number | null;
  /** Custo de equity Ke em % a.a. */
  ke: number | null;
  /** Custo de dívida Kd em % a.a. (after-tax). */
  kd: number | null;
  /** WACC em % a.a. */
  wacc: number | null;
  /** Spread ROIC − WACC em pp. */
  spread: number | null;
  /** True se ROIC > WACC (criação de valor). */
  creatingValue: boolean | null;
};

export type ROICWACCSummary = {
  /** ROIC do último quarter (%). */
  roic: number | null;
  /** WACC do último quarter (%). */
  wacc: number | null;
  /** Spread em pp. */
  spread: number | null;
  /** Beta usado (default 1.0 se brapi não retornou). */
  beta: number | null;
  /** Premissas (visíveis na UI). */
  settings: ROICWACCSettings;
  /** True se setor é Financial Services (não calcula). */
  isFinancial: boolean;
};

const QUARTERS_LTM = 4;

/**
 * Soma campos granulares de dívida total. Brapi v2 não tem um
 * `totalDebt` único — usa shortLongTermDebt + longTermDebt (debêntures,
 * financiamentos, leasing). Fallback progressivo quando campos faltam.
 *
 * Usado por fscore.ts, metrics-table.ts e qualquer analytics que
 * precise de dívida total consolidada.
 */
export function totalDebtOf(balance: Record<string, unknown>): number | null {
  const shortDebt = getNumber(balance, "shortLongTermDebt") ?? 0;
  const longDebt = getNumber(balance, "longTermDebt") ?? 0;
  if (shortDebt === 0 && longDebt === 0) {
    // Fallback: tenta `totalDebt` direto (algumas respostas brapi)
    const direct = getNumber(balance, "totalDebt");
    return direct;
  }
  return shortDebt + longDebt;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getNumber(rec: Record<string, unknown>, key: string): number | null {
  const v = rec[key];
  return v != null && Number.isFinite(v) ? (v as number) : null;
}

/**
 * Soma N últimos quarters a partir de uma lista ordenada por data.
 */
function sumLTM(
  income: BrapiIncomeStatementPeriod[],
  fromIndex: number,
  field: keyof BrapiIncomeStatementPeriod,
): number {
  let sum = 0;
  let count = 0;
  for (let i = fromIndex; i >= 0 && count < QUARTERS_LTM; i--, count++) {
    const v = income[i][field];
    if (v == null || !Number.isFinite(v)) return NaN;
    sum += v as number;
  }
  return count === QUARTERS_LTM ? sum : NaN;
}

export function computeROICvsWACC(
  income: BrapiIncomeStatementPeriod[],
  balance: BrapiBalanceSheetPeriod[],
  _cashflow: BrapiCashflowPeriod[],
  _fdHistory: BrapiFinancialDataPeriod[] | null,
  stats: BrapiKeyStatisticsPeriod[] | null,
  opts: {
    sectorDisp: string | null;
    settings?: Partial<ROICWACCSettings>;
  },
): { summary: ROICWACCSummary; series: ROICWACCPoint[] } {
  const settings = {
    ...DEFAULT_ROIC_WACC_SETTINGS,
    ...(opts.settings ?? {}),
  };
  const isFinancial =
    typeof opts.sectorDisp === "string" &&
    /financeiro|banco|segurador/i.test(opts.sectorDisp);

  if (isFinancial || income.length < QUARTERS_LTM) {
    return {
      summary: {
        roic: null,
        wacc: null,
        spread: null,
        beta: null,
        settings,
        isFinancial,
      },
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

  // Beta do stats-history (mais recente)
  const lastStats = stats && stats.length > 0 ? stats[stats.length - 1] : null;
  const beta = lastStats?.beta != null && Number.isFinite(lastStats.beta)
    ? lastStats.beta
    : 1.0;

  // Ke via CAPM
  const ke = settings.riskFreeRate + beta * settings.erp;

  const series: ROICWACCPoint[] = [];
  for (let i = 0; i < sortedIncome.length; i++) {
    const row = sortedIncome[i];
    const ebit = getNumber(row as Record<string, unknown>, "ebit");
    const incomeBeforeTax = getNumber(
      row as Record<string, unknown>,
      "incomeBeforeTax",
    );
    const incomeTax = getNumber(
      row as Record<string, unknown>,
      "incomeTaxExpense",
    );
    if (
      ebit == null ||
      incomeBeforeTax == null ||
      incomeTax == null ||
      incomeBeforeTax <= 0
    ) {
      continue;
    }
    const tEfetiva = clamp(incomeTax / incomeBeforeTax, 0, 0.45);

    // NOPAT LTM: prefere soma 4 quarters de `cleanNopat` (brapi já
    // exclui não-recorrentes). Fallback: soma EBIT LTM × (1-t) usando
    // a alíquota efetiva do quarter.
    let nopat: number;
    const cleanNopatSum = sumLTM(
      sortedIncome,
      i,
      "cleanNopat" as keyof BrapiIncomeStatementPeriod,
    );
    if (Number.isFinite(cleanNopatSum) && cleanNopatSum > 0) {
      nopat = cleanNopatSum;
    } else {
      const ebitLTMSum = sumLTM(
        sortedIncome,
        i,
        "ebit" as keyof BrapiIncomeStatementPeriod,
      );
      if (!Number.isFinite(ebitLTMSum)) continue;
      nopat = ebitLTMSum * (1 - tEfetiva);
    }

    // Capital investido no quarter end. brapi v2 balance-sheet tem
    // campos granulares que podem vir null em séries antigas — fallback
    // para `totalLiab` (soma de tudo que a empresa deve) quando
    // equity/disaggregated debt não estão disponíveis.
    const bal = balanceByDate.get(row.endDate);
    if (!bal) continue;
    const shortDebt = getNumber(bal as Record<string, unknown>, "shortLongTermDebt") ?? 0;
    const longDebt = getNumber(bal as Record<string, unknown>, "longTermDebt") ?? 0;
    const cash = getNumber(bal as Record<string, unknown>, "cash") ?? 0;
    let equity = getNumber(bal as Record<string, unknown>, "totalEquity") ?? 0;
    if (equity === 0) {
      // Fallback: equity = totalAssets - totalLiab (equação contábil)
      const assets = getNumber(bal as Record<string, unknown>, "totalAssets") ?? 0;
      const liab = getNumber(bal as Record<string, unknown>, "totalLiab") ?? 0;
      equity = assets - liab;
    }
    const debt = shortDebt + longDebt;
    const capitalInvestido = debt + equity - cash;
    if (capitalInvestido <= 0) continue;

    // Capital investido 4Q atrás (pra média)
    let capitalInvestidoPrior: number | null = null;
    if (i >= QUARTERS_LTM) {
      const priorIncome = sortedIncome[i - QUARTERS_LTM];
      const priorBal = balanceByDate.get(priorIncome.endDate);
      if (priorBal) {
        const pShort = getNumber(priorBal as Record<string, unknown>, "shortLongTermDebt") ?? 0;
        const pLong = getNumber(priorBal as Record<string, unknown>, "longTermDebt") ?? 0;
        const pCash = getNumber(priorBal as Record<string, unknown>, "cash") ?? 0;
        const pEquity = getNumber(priorBal as Record<string, unknown>, "totalEquity") ?? 0;
        capitalInvestidoPrior = pShort + pLong + pEquity - pCash;
      }
    }

    // Kd: despesa financeira LTM / dívida bruta. Brapi v2 tem
    // `interestExpense` (geralmente null) e `financialExpenses`
    // (populado como negativo). Usa fallback progressivo.
    const interestExpenseSum = sumLTM(
      sortedIncome,
      i,
      "interestExpense" as keyof BrapiIncomeStatementPeriod,
    );
    const financialExpensesSum = sumLTM(
      sortedIncome,
      i,
      "financialExpenses" as keyof BrapiIncomeStatementPeriod,
    );
    const interestAbs =
      Number.isFinite(interestExpenseSum) && interestExpenseSum > 0
        ? Math.abs(interestExpenseSum)
        : Number.isFinite(financialExpensesSum) && financialExpensesSum < 0
          ? Math.abs(financialExpensesSum)
          : null;
    let kd: number | null = null;
    if (interestAbs != null && debt > 0) {
      kd = (interestAbs / debt) * 100; // % a.a.
    }
    const kdAfterTax = kd != null ? kd * (1 - settings.marginalTaxRate / 100) : null;

    // WACC
    // Se debt=0 (série antiga onde brapi não retorna dívida
    // granular), assumir capital 100% equity → WACC = Ke.
    const total = equity + debt;
    const wacc =
      kdAfterTax == null
        ? ke
        : total > 0
          ? (equity / total) * ke + (debt / total) * kdAfterTax
          : null;

    // ROIC com denominador médio
    const denomMedio =
      capitalInvestidoPrior != null && capitalInvestidoPrior > 0
        ? (capitalInvestido + capitalInvestidoPrior) / 2
        : capitalInvestido;
    const roic = denomMedio > 0 ? (nopat / denomMedio) * 100 : null;

    const spread = roic != null && wacc != null ? roic - wacc : null;

    series.push({
      endDate: row.endDate,
      nopat,
      capitalInvestido,
      capitalInvestidoPrior,
      roic,
      ke,
      kd,
      wacc,
      spread,
      creatingValue: spread != null ? spread > 0 : null,
    });
  }

  const last = series.length > 0 ? series[series.length - 1] : null;
  return {
    summary: {
      roic: last?.roic ?? null,
      wacc: last?.wacc ?? null,
      spread: last?.spread ?? null,
      beta,
      settings,
      isFinancial: false,
    },
    series,
  };
}