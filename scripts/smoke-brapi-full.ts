import { getBrapiFull } from "../lib/brapi-full";

const tickers = ["PETR4", "ITUB4", "BBSE3", "WEGE3", "VALE3"];

(async () => {
  for (const t of tickers) {
    const data = await getBrapiFull(t);
    if (!data) {
      console.log(`${t}: null response`);
      continue;
    }
    const vah = data.valueAddedHistory;
    const latest = vah[0];
    const bal = data.balanceSheetHistory[0];
    const ish = data.incomeStatementHistory[0];
    const csh = data.cashflowHistory[0];
    const ksh = data.keyStatisticsHistory;

    const fmt = (v: number | null | undefined, suffix = "B") =>
      v != null ? (v / 1e9).toFixed(2) + suffix : "NULL";

    console.log(`\n=== ${t} ===`);
    console.log(`  DVA: ${vah.length} anos, endDate=${latest?.endDate ?? "—"}`);
    console.log(`  DVA revenue: ${fmt(latest?.revenue)}`);
    console.log(`  DVA netAddedValue: ${fmt(latest?.netAddedValue)}`);
    console.log(`  DVA grossAddedValue: ${fmt(latest?.grossAddedValue)}`);
    console.log(`  DVA addedValueToDistribute: ${fmt(latest?.addedValueToDistribute)}`);
    console.log(`  DVA teamRemuneration: ${fmt(latest?.teamRemuneration)}`);
    console.log(`  DVA taxes: ${fmt(latest?.taxes)}`);
    console.log(`  DVA remunerationOfThirdPartyCapitals: ${fmt(latest?.remunerationOfThirdPartyCapitals)}`);
    console.log(`  DVA ownEquityRemuneration: ${fmt(latest?.ownEquityRemuneration)}`);
    console.log(`  DVA dividends: ${fmt(latest?.dividends)}`);
    console.log(`  DVA retainedEarningsOrLoss: ${fmt(latest?.retainedEarningsOrLoss)}`);

    // Identity check: addedValueToDistribute == sum(5 stakeholders)
    const sum =
      (latest?.teamRemuneration ?? 0) +
      (latest?.taxes ?? 0) +
      (latest?.remunerationOfThirdPartyCapitals ?? 0) +
      (latest?.ownEquityRemuneration ?? 0) +
      (latest?.retainedEarningsOrLoss ?? 0);
    const expected = latest?.addedValueToDistribute ?? null;
    if (expected != null && expected !== 0) {
      const ratio = sum / expected;
      const ok = Math.abs(ratio - 1) < 0.02;
      console.log(
        `  DVA integrity (sum/distribute): ${ratio.toFixed(3)} ${
          ok ? "✓" : "✗ FAIL (>2% desvio)"
        }`
      );
    }

    // Banks / insurers special fields
    if (latest?.financialIntermediationRevenue != null) {
      console.log(`  [bank] financialIntermediationRevenue: ${fmt(latest.financialIntermediationRevenue)}`);
    }
    if (latest?.insuranceOperationsRevenue != null) {
      console.log(`  [insurance] insuranceOperationsRevenue: ${fmt(latest.insuranceOperationsRevenue)}`);
    }

    // Balance sheet (new field names)
    console.log(`  BS[0] shareholdersEquity: ${fmt(bal?.shareholdersEquity)} (era totalStockholderEquity)`);
    console.log(`  BS[0] loansAndFinancing: ${fmt(bal?.loansAndFinancing)}`);
    console.log(`  BS[0] longTermLoansAndFinancing: ${fmt(bal?.longTermLoansAndFinancing)}`);

    // Income statement (new field names)
    console.log(`  IS[0] cleanNopat: ${fmt(ish?.cleanNopat)} (NO recalcular de ebit*tax)`);
    console.log(`  IS[0] financialExpenses: ${fmt(ish?.financialExpenses)}`);
    console.log(`  IS[0] interestExpense (often NULL): ${fmt(ish?.interestExpense)}`);

    // New: annual cashflow + keyStatisticsHistory
    console.log(`  CF[0] operatingCashFlow: ${fmt(csh?.operatingCashFlow)}`);
    console.log(`  CF[0] freeCashFlow: ${fmt(csh?.freeCashFlow)}`);
    console.log(`  KeyStatsHistory len: ${ksh.length} (z-score source)`);
    console.log(`  CashflowHistory len: ${data.cashflowHistory.length}`);
  }
})();
