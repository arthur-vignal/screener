/**
 * lib/analytics/fscore.ts
 *
 * Piotroski F-Score — 9 binary signals scored 0/1 each. Total 0..9.
 *
 * The classic Piotroski uses 9 signals split across 3 categories:
 *   1. Profitability (4): ROA > 0, OCF > 0, ΔROA > 0, OCF > Net Income
 *   2. Leverage/Liquidity (3): ΔDebt < 0, ΔCurrentRatio > 0, ΔShares < 0
 *   3. Operating Efficiency (2): ΔGrossMargin > 0, ΔAssetTurnover > 0
 *
 * We use a Brazilian-friendly adaptation: ΔROE in place of ΔROA, since
 * Brazilian analysts track ROE more closely. Asset turnover uses total
 * revenue / total assets instead of cogs/sales.
 *
 * Inputs are nullable per row — null fields are treated as the
 * "indifferent" state (no point awarded, no point deducted).
 */

import type {
  BrapiBalanceSheet,
  BrapiCashflow,
  BrapiFinancialData,
  BrapiIncomeStatement,
} from "@/lib/brapi-full";

export type FScoreSignal = {
  id: string;
  label: string;
  /** 1 = signal present, 0 = signal absent. null = data missing, not counted. */
  value: 0 | 1 | null;
};

export type FScoreResult = {
  /** 0..9. null when fewer than 6 signals are computable. */
  total: number | null;
  signals: FScoreSignal[];
  /** Strength tier for UI badge. */
  tier: "forte" | "neutro" | "fraco" | "indisponivel";
};

const TIER_FORK = { forte: 7, fraco: 4 };

export function tierFor(total: number | null): FScoreResult["tier"] {
  if (total == null) return "indisponivel";
  if (total >= TIER_FORK.forte) return "forte";
  if (total <= TIER_FORK.fraco) return "fraco";
  return "neutro";
}

/** Δ of a nullable number. NaN-safe. */
function delta(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null) return null;
  return curr - prev;
}

/**
 * Compute the F-Score for a single year, given the current and previous
 * year's statements. Caller is responsible for aligning the years.
 *
 * Pass `prev = null` for the first year — only 4 signals become
 * computable (the 5 Δ-based signals require a comparison).
 */
export function computeFScore(
  curr: {
    income: BrapiIncomeStatement;
    balance: BrapiBalanceSheet;
    cashflow: BrapiCashflow;
    financialData: BrapiFinancialData;
  },
  prev: {
    income: BrapiIncomeStatement;
    balance: BrapiBalanceSheet;
    financialData: BrapiFinancialData;
  } | null,
): FScoreResult {
  const { income: ci, balance: cb, cashflow: cc, financialData: cf } = curr;
  const signals: FScoreSignal[] = [];

  // Profitability ──────────────────────────────────────
  // 1. ROE > 0 (BR-adapted in place of ROA > 0)
  signals.push({
    id: "roe-positive",
    label: "ROE > 0",
    value:
      cf.returnOnEquity != null
        ? cf.returnOnEquity > 0
          ? 1
          : 0
        : null,
  });

  // 2. Operating Cash Flow > 0
  signals.push({
    id: "ocf-positive",
    label: "Caixa operacional > 0",
    value: cc.operatingCashFlow != null ? (cc.operatingCashFlow > 0 ? 1 : 0) : null,
  });

  // 3. ΔROE > 0 (current ROE higher than prior)
  if (prev) {
    const dRoe = delta(cf.returnOnEquity, prev.financialData.returnOnEquity);
    signals.push({
      id: "delta-roe",
      label: "ROE crescente",
      value: dRoe != null ? (dRoe > 0 ? 1 : 0) : null,
    });
  } else {
    signals.push({ id: "delta-roe", label: "ROE crescente", value: null });
  }

  // 4. OCF > Net Income (accruals < 0 — quality signal)
  signals.push({
    id: "ocf-vs-ni",
    label: "Caixa operacional > lucro líquido",
    value:
      cc.operatingCashFlow != null && ci.netIncome != null && ci.netIncome > 0
        ? cc.operatingCashFlow > ci.netIncome
          ? 1
          : 0
        : null,
  });

  // Leverage / Liquidity ───────────────────────────────
  // 5. ΔDebt < 0 (debt going down)
  if (prev) {
    const dDebt = delta(curr.balance.longTermDebt, prev.balance.longTermDebt);
    signals.push({
      id: "delta-debt",
      label: "Dívida decrescente",
      value: dDebt != null ? (dDebt < 0 ? 1 : 0) : null,
    });
  } else {
    signals.push({ id: "delta-debt", label: "Dívida decrescente", value: null });
  }

  // 6. ΔCurrentRatio > 0
  if (prev) {
    const dCr = delta(cf.currentRatio, prev.financialData.currentRatio);
    signals.push({
      id: "delta-current-ratio",
      label: "Liquidez corrente crescente",
      value: dCr != null ? (dCr > 0 ? 1 : 0) : null,
    });
  } else {
    signals.push({ id: "delta-current-ratio", label: "Liquidez corrente crescente", value: null });
  }

  // 7. ΔSharesOutstanding < 0 (buybacks dilute positively — fewer shares)
  if (prev) {
    const dSh = delta(cf.totalRevenue, prev.financialData.totalRevenue); // placeholder — Brapi doesn't expose shares here
    // We don't have shares outstanding in the income/balance — skip.
    void dSh;
    signals.push({ id: "delta-shares", label: "Recompra de ações", value: null });
  } else {
    signals.push({ id: "delta-shares", label: "Recompra de ações", value: null });
  }

  // Operating Efficiency ──────────────────────────────
  // 8. ΔGrossMargin > 0 (profitMargins used as proxy — Brapi doesn't
  //    expose grossMargins in income statement).
  if (prev) {
    const dPm = delta(cf.profitMargins, prev.financialData.profitMargins);
    signals.push({
      id: "delta-margin",
      label: "Margem crescente",
      value: dPm != null ? (dPm > 0 ? 1 : 0) : null,
    });
  } else {
    signals.push({ id: "delta-margin", label: "Margem crescente", value: null });
  }

  // 9. ΔAssetTurnover > 0 (revenue / total assets)
  if (prev) {
    const currTurnover =
      cf.totalRevenue != null && cb.totalAssets != null && cb.totalAssets > 0
        ? cf.totalRevenue / cb.totalAssets
        : null;
    const prevTurnover =
      prev.financialData.totalRevenue != null &&
      prev.balance.totalAssets != null &&
      prev.balance.totalAssets > 0
        ? prev.financialData.totalRevenue / prev.balance.totalAssets
        : null;
    const dTurnover = delta(currTurnover, prevTurnover);
    signals.push({
      id: "delta-asset-turnover",
      label: "Giro do ativo crescente",
      value: dTurnover != null ? (dTurnover > 0 ? 1 : 0) : null,
    });
  } else {
    signals.push({ id: "delta-asset-turnover", label: "Giro do ativo crescente", value: null });
  }

  const valid = signals.filter((s) => s.value != null);
  const total = valid.length >= 6 ? valid.reduce((s, x) => s + (x.value ?? 0), 0) : null;

  return { total, signals, tier: tierFor(total) };
}

/**
 * Compute F-Score across the full history. Returns chronological series
 * for charting.
 */
export function computeFScoreTimeline(
  history: Array<{
    income: BrapiIncomeStatement;
    balance: BrapiBalanceSheet;
    cashflow: BrapiCashflow;
    financialData: BrapiFinancialData;
  }>,
): Array<{ endDate: string; score: FScoreResult }> {
  return history.map((curr, i) => {
    const prev = i > 0 ? history[i - 1] : null;
    return {
      endDate: curr.income.endDate,
      score: computeFScore(
        curr,
        prev
          ? {
              income: prev.income,
              balance: prev.balance,
              financialData: prev.financialData,
            }
          : null,
      ),
    };
  });
}
