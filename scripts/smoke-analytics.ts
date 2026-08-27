/**
 * scripts/smoke-analytics.ts
 *
 * Smoke test for lib/analytics/. Runs every module against a real
 * Brapi bundle (PETR4) and reports each output.
 *
 * Run with:  BRAPI_TOKEN=… npx tsx scripts/smoke-analytics.ts
 */
import { getBrapiFull } from "../lib/brapi-full";
import { computeIntegrityBadge, computeIntegrityTimeline } from "../lib/analytics/integrity";
import {
  zScoreVsHistory,
  percentileVsPeers,
  classifyQuadrant,
} from "../lib/analytics/zscore";
import {
  roicOf,
  waccOf,
  totalDebtOf,
  suggestedDurationYears,
} from "../lib/analytics/roic-wacc";
import {
  computeYieldLiquido,
  dividendStreak,
} from "../lib/analytics/yield-liquido";
import { computeAccrualsTimeline } from "../lib/analytics/accruals";
import { computeFScoreTimeline, tierFor } from "../lib/analytics/fscore";
import { decomposeBeta, logReturns, equalWeightedSector } from "../lib/analytics/beta-decomp";

const fmt = (v: number | null | undefined, suffix = "%") =>
  v == null ? "—" : v.toFixed(2) + suffix;

const fmtB = (v: number | null | undefined) =>
  v == null ? "—" : (v / 1e9).toFixed(2) + "B";

(async () => {
  console.log("Fetching PETR4 bundle …");
  const data = await getBrapiFull("PETR4");
  if (!data) {
    console.error("bundle unavailable");
    process.exit(1);
  }

  console.log(`\nYears of data: ${data.balanceSheetHistory.length} BS, ${data.incomeStatementHistory.length} IS, ${data.cashflowHistory.length} CF, ${data.valueAddedHistory.length} DVA, ${data.keyStatisticsHistory.length} KS`);

  // ───────── Integrity ─────────
  console.log("\n=== INTEGRITY (latest year) ===");
  const integrity = computeIntegrityBadge(
    data.balanceSheetHistory[0],
    data.valueAddedHistory[0],
  );
  console.log(`  aggregate: ${integrity.status}`);
  for (const c of integrity.checks) {
    console.log(`  [${c.status}] ${c.label}${c.detail ? " — " + c.detail : ""}`);
  }

  console.log("\nIntegrity timeline (last 5 years):");
  const tl = computeIntegrityTimeline(
    data.balanceSheetHistory,
    data.valueAddedHistory,
  ).slice(-5);
  for (const y of tl) {
    console.log(`  ${y.endDate}: ${y.badge.status} (${y.badge.checks.filter(c => c.status === "ok").length}/${y.badge.checks.length} ok)`);
  }

  // ───────── Z-score ─────────
  console.log("\n=== Z-SCORE vs HISTORY ===");
  // The current snapshot uses 'priceEarnings' on quote (not 'trailingPE' on keyStatistics).
  const currentPE = data.quote.priceEarnings;
  if (currentPE != null) {
    const z = zScoreVsHistory(
      currentPE,
      data.keyStatisticsHistory,
      (r) => r.trailingPE,
    );
    if (z) {
      console.log(`  trailingPE current=${z.current.toFixed(2)} μ=${z.mu.toFixed(2)} σ=${z.sigma.toFixed(2)} z=${z.z.toFixed(2)} (n=${z.n})`);
      const peerPct = percentileVsPeers(z.current, [3, 5, 7, 8, 12, 15, 20]);
      if (peerPct) {
        console.log(`  vs fake peer set: percentile ${(peerPct.percentile * 100).toFixed(0)}% (n=${peerPct.n})`);
        const q = classifyQuadrant(z.z, peerPct.percentile < 0.5 ? -1 : 1);
        console.log(`  quadrant: ${q}`);
      }
    }
  }

  // ───────── ROIC ─────────
  console.log("\n=== ROIC ===");
  const roic = roicOf(
    data.incomeStatementHistory[0],
    data.balanceSheetHistory[0],
  );
  console.log(`  ROIC: ${fmt(roic)}`);
  const debt = totalDebtOf(data.balanceSheetHistory[0]);
  console.log(`  Total debt: ${fmtB(debt)}`);

  // ───────── WACC (using a synthetic 14.25% rate as 3a DI from earlier probe) ─────────
  console.log("\n=== WACC ===");
  const waccInput = {
    latestIncome: data.incomeStatementHistory[0],
    latestBalance: data.balanceSheetHistory[0],
    recentIncome: data.incomeStatementHistory.slice(0, 3),
    marketCap: data.quote.marketCap,
    riskFreeRatePercent: 14.25,
    beta: data.keyStatistics?.beta ?? 1,
    durationYears: 3,
  };
  const w = waccOf(waccInput);
  console.log(`  Ke: ${fmt(w.costOfEquityPercent)}`);
  console.log(`  Kd (after tax): ${fmt(w.costOfDebtAfterTaxPercent)}`);
  console.log(`  WACC: ${fmt(w.waccPercent)}`);
  console.log(`  ROIC − WACC: ${fmt(w.spreadPercent)}`);
  console.log(`  weights: E=${fmt(w.details.equityWeight)} D=${fmt(w.details.debtWeight)}`);
  console.log(`  suggested duration for sector ${data.profile?.sector}: ${suggestedDurationYears(data.profile?.sector)}a`);

  // ───────── Yield líquido ─────────
  console.log("\n=== YIELD LÍQUIDO ===");
  const yld = computeYieldLiquido(data.dividends, data.quote.regularMarketPrice);
  console.log(`  gross yield: ${fmt(yld.grossYieldPercent)}`);
  console.log(`  yield líquido: ${fmt(yld.yieldLiquidoPercent)}`);
  console.log(`  %JCP: ${fmt(yld.pctJCP)}`);
  console.log(`  years paying: ${yld.yearsPaying}`);
  const streak = dividendStreak(data.dividends);
  console.log(`  current streak: ${streak.currentStreak}a (longest ${streak.longestStreak}a)`);

  // ───────── Accruals ─────────
  console.log("\n=== ACCRUALS (last 5 years) ===");
  // history is sorted asc; last 5 are the most recent
  const aligned = data.incomeStatementHistory.slice(-5).map((inc, i) => ({
    income: inc,
    balance: data.balanceSheetHistory[data.incomeStatementHistory.length - 5 + i],
    cashflow: data.cashflowHistory[data.incomeStatementHistory.length - 5 + i],
  }));
  const acc = computeAccrualsTimeline(aligned);
  for (const row of acc.series) {
    console.log(`  ${row.endDate}: accruals=${fmt(row.accrualsPercent)}, cash conv=${fmt(row.cashConversionPercent)}`);
  }
  console.log(`  5y avg accruals: ${fmt(acc.avg5yPercent)}`);

  // ───────── F-Score ─────────
  console.log("\n=== F-SCORE (last 5 years) ===");
  const fAligned = data.incomeStatementHistory.slice(-5).map((inc, i) => ({
    income: inc,
    balance: data.balanceSheetHistory[data.incomeStatementHistory.length - 5 + i],
    cashflow: data.cashflowHistory[data.incomeStatementHistory.length - 5 + i],
    financialData: data.financialData ?? ({} as never),
  }));
  const ftl = computeFScoreTimeline(fAligned);
  for (const r of ftl) {
    const valid = r.score.signals.filter((s) => s.value != null);
    const ones = r.score.signals.filter((s) => s.value === 1).length;
    const signals = valid.length;
    console.log(`  ${r.endDate}: total=${r.score.total ?? "—"}/9 (${signals}/9 signals, ${ones} acertos) tier=${r.score.tier}`);
    if (r.score.total != null && r.score.total < 5) {
      console.log(`    signals:`);
      for (const s of r.score.signals) {
        const mark = s.value === 1 ? "✓" : s.value === 0 ? "✗" : "·";
        console.log(`      ${mark} ${s.label}: ${s.value === null ? "(sem dado)" : s.value === 1 ? "OK" : "NÃO"}`);
      }
    }
  }

  // ───────── Beta decomposition ─────────
  console.log("\n=== BETA DECOMP (synthetic — needs real Ibovespa + sector data) ===");
  // Use a fake asset price series and the closing prices from the bundle.
  const closes = data.balanceSheetHistory
    .map((b) => b.totalAssets)
    .filter((x): x is number => x != null && x > 0);
  // Synthetic market and sector — just exercising the math.
  const assetRets = logReturns(closes);
  const marketRets = assetRets.map((r) => r * 0.8 + (Math.random() - 0.5) * 0.02);
  const sectorRets = assetRets.map((r) => r * 0.3 + (Math.random() - 0.5) * 0.01);
  const decomp = decomposeBeta(assetRets, marketRets, sectorRets);
  console.log(`  β_mercado: ${decomp.betaMercado?.toFixed(2)}`);
  console.log(`  β_setorial: ${decomp.betaSetorial?.toFixed(2)}`);
  console.log(`  β_idiossincrático: ${decomp.betaIdiossincratico?.toFixed(2)}`);
  console.log(`  R² market: ${fmt(decomp.r2Mercado)} | total: ${fmt(decomp.r2Total)}`);

  console.log("\n✓ smoke complete");
})();
