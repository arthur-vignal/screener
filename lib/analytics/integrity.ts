/**
 * lib/analytics/integrity.ts
 *
 * Cross-validates accounting identities in the Brapi bundle. Drives the
 * "selo de integridade" UI element from spec section 9 (transversal).
 *
 * Each check returns a `Check` with:
 *   - id: stable identifier
 *   - label: short PT-BR description
 *   - status: 'ok' | 'warn' | 'fail' | 'skip'
 *   - detail: explanation when warn/fail
 *
 * Tolerances are loose because Brapi rounds and reclassifies some
 * accounts across periods; we want to flag obvious breakage, not
 * millisecond rounding noise.
 */

import type {
  BrapiBalanceSheet,
  BrapiValueAdded,
} from "@/lib/brapi-full";

export type IntegrityStatus = "ok" | "warn" | "fail" | "skip";

export type IntegrityCheck = {
  id: string;
  label: string;
  status: IntegrityStatus;
  detail?: string;
};

export type IntegrityBadge = {
  /** Aggregate status — worst across all checks. */
  status: IntegrityStatus;
  /** Per-check breakdown. */
  checks: IntegrityCheck[];
};

/** Pick worst status. ok < warn < fail. */
function worst(a: IntegrityStatus, b: IntegrityStatus): IntegrityStatus {
  const rank: Record<IntegrityStatus, number> = {
    ok: 0,
    skip: 0,
    warn: 1,
    fail: 2,
  };
  return rank[a] >= rank[b] ? a : b;
}

/** Ratio with tolerance. ok if |ratio - 1| ≤ tol. */
function ratioCheck(
  numerator: number | null,
  denominator: number | null,
  tol: number,
): { status: IntegrityStatus; detail?: string } {
  if (numerator == null || denominator == null) {
    return { status: "skip", detail: "campo ausente" };
  }
  if (denominator === 0) {
    return { status: "skip", detail: "denominador zero" };
  }
  const ratio = numerator / denominator;
  const diff = Math.abs(ratio - 1);
  if (diff <= tol) return { status: "ok" };
  if (diff <= tol * 3) return { status: "warn", detail: `desvio ${(diff * 100).toFixed(1)}%` };
  return { status: "fail", detail: `desvio ${(diff * 100).toFixed(1)}%` };
}

/**
 * 1. totalAssets == totalCurrentAssets + nonCurrentAssets (long-term).
 * Brapi v2 doesn't expose `nonCurrentAssets` directly; instead we
 * verify totalAssets >= totalCurrentAssets (always true if data is sane).
 */
function checkAssetsIdentity(bs: BrapiBalanceSheet): IntegrityCheck {
  if (bs.totalAssets == null || bs.totalCurrentAssets == null) {
    return {
      id: "assets-identity",
      label: "Ativos (corrente + não-corrente)",
      status: "skip",
    };
  }
  // longTermAssets = totalAssets - totalCurrentAssets
  const longTermAssets = bs.totalAssets - bs.totalCurrentAssets;
  if (longTermAssets < 0) {
    return {
      id: "assets-identity",
      label: "Ativos (corrente + não-corrente)",
      status: "fail",
      detail: "Ativo corrente > ativo total",
    };
  }
  return {
    id: "assets-identity",
    label: "Ativos (corrente + não-corrente)",
    status: "ok",
  };
}

/**
 * 2. distributionOfAddedValue == addedValueToDistribute (DVA identity).
 * Brapi does NOT satisfy this strictly in the probe — see notes in the
 * commit message. We use a 15% tolerance to flag obvious breakage only.
 */
function checkDvaIdentity(va: BrapiValueAdded): IntegrityCheck {
  if (va.addedValueToDistribute == null || va.distributionOfAddedValue == null) {
    return {
      id: "dva-identity",
      label: "DVA (distribuição = a distribuir)",
      status: "skip",
    };
  }
  return {
    id: "dva-identity",
    label: "DVA (distribuição = a distribuir)",
    ...ratioCheck(va.distributionOfAddedValue, va.addedValueToDistribute, 0.15),
  };
}

/**
 * 3. DVA sum(5 stakeholders) ~= addedValueToDistribute.
 * The discrepancy comes from `addedValueReceivedOnTransfer` (financial
 * income + equity income + others) which is INCLUDED in
 * addedValueToDistribute but NOT in the 5 stakeholders directly.
 *
 * tolerance = 50% — this check is informational only, flags big drifts.
 */
function checkDvaStakeholderSum(va: BrapiValueAdded): IntegrityCheck {
  if (va.addedValueToDistribute == null) {
    return {
      id: "dva-stakeholders",
      label: "DVA (soma dos 5 stakeholders)",
      status: "skip",
    };
  }
  const sum =
    (va.teamRemuneration ?? 0) +
    (va.taxes ?? 0) +
    (va.remunerationOfThirdPartyCapitals ?? 0) +
    (va.ownEquityRemuneration ?? 0) +
    (va.retainedEarningsOrLoss ?? 0);
  return {
    id: "dva-stakeholders",
    label: "DVA (soma dos 5 stakeholders)",
    ...ratioCheck(sum, va.addedValueToDistribute, 0.5),
  };
}

/**
 * 4. PL > 0 sanity check. Negative equity happens (prejuízo acumulado)
 * but persistent negative equity across years is a red flag.
 */
function checkEquitySanity(bs: BrapiBalanceSheet): IntegrityCheck {
  if (bs.shareholdersEquity == null) {
    return {
      id: "equity-sanity",
      label: "Patrimônio líquido",
      status: "skip",
    };
  }
  if (bs.shareholdersEquity < 0) {
    return {
      id: "equity-sanity",
      label: "Patrimônio líquido",
      status: "warn",
      detail: "PL negativo (prejuízo acumulado > capital)",
    };
  }
  return { id: "equity-sanity", label: "Patrimônio líquido", status: "ok" };
}

/**
 * Run all checks for a single fiscal year. Returns the worst status
 * as the headline.
 */
export function computeIntegrityBadge(
  balanceSheet: BrapiBalanceSheet,
  valueAdded?: BrapiValueAdded,
): IntegrityBadge {
  const checks: IntegrityCheck[] = [
    checkAssetsIdentity(balanceSheet),
    checkEquitySanity(balanceSheet),
  ];
  if (valueAdded) {
    checks.push(checkDvaIdentity(valueAdded));
    checks.push(checkDvaStakeholderSum(valueAdded));
  }

  let aggregate: IntegrityStatus = "ok";
  for (const c of checks) {
    aggregate = worst(aggregate, c.status);
  }

  return { status: aggregate, checks };
}

/**
 * Run integrity over the full historical series. Returns per-year badges
 * + an aggregate "any year failed" badge for the header.
 */
export function computeIntegrityTimeline(
  balanceSheetHistory: BrapiBalanceSheet[],
  valueAddedHistory?: BrapiValueAdded[],
): Array<{
  endDate: string;
  badge: IntegrityBadge;
}> {
  if (valueAddedHistory && valueAddedHistory.length === balanceSheetHistory.length) {
    return balanceSheetHistory.map((bs, i) => ({
      endDate: bs.endDate,
      badge: computeIntegrityBadge(bs, valueAddedHistory[i]),
    }));
  }
  return balanceSheetHistory.map((bs) => ({
    endDate: bs.endDate,
    badge: computeIntegrityBadge(bs),
  }));
}
