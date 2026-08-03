/**
 * SEC EDGAR client for company fundamentals.
 *
 * Uses the public XBRL data API to fetch raw financials, then derives ratios.
 * No auth required. Rate limit: 10 req/sec (be a good citizen).
 *
 * Covers US-listed companies (S&P 500, Nasdaq 100, any US ticker).
 * Does NOT cover BR, crypto, or international.
 *
 * Concepts we use:
 *  - NetIncomeLoss → net income (for ROE, P/L)
 *  - Revenues → revenue (for margins)
 *  - StockholdersEquity → equity (for ROE, P/VP)
 *  - CommonStockSharesOutstanding → shares (for EPS, market cap)
 *  - OperatingIncomeLoss → operating income (for operating margin)
 */

import { cached } from "./cache";

const SEC_BASE = "https://data.sec.gov";

export type SecFiling = {
  end: string;
  val: number;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  accn: string;
};

export type Fundamentals = {
  cik: number;
  symbol: string;
  // Quarterly TTM values
  ttmNetIncome: number | null;
  ttmRevenue: number | null;
  ttmOperatingIncome: number | null;
  // Most recent quarter values
  latestNetIncome: number | null;
  latestRevenue: number | null;
  latestOperatingIncome: number | null;
  // Balance sheet (most recent quarter)
  equity: number | null;
  shares: number | null;
  // Calculated ratios
  pe: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  netMargin: number | null;
  operatingMargin: number | null;
  eps: number | null;
  bookValuePerShare: number | null;
  // Source filing metadata
  asOf: string | null;
};

/**
 * Load SEC ticker → CIK mapping (cached for 30 days).
 * Returns Map<upper_symbol, cik_str>.
 */
export async function getCikMap(): Promise<Map<string, number>> {
  return cached("sec:cik-map", 30 * 24 * 3600, async () => {
    const r = await fetch(`${SEC_BASE}/files/company_tickers.json`, {
      headers: { "User-Agent": "screener-v2 (research@example.com)" },
    });
    if (!r.ok) {
      throw new Error(`SEC tickers.json failed: ${r.status}`);
    }
    const data = (await r.json()) as Record<
      string,
      { cik_str: number; ticker: string; title: string }
    >;
    const map = new Map<string, number>();
    for (const v of Object.values(data)) {
      map.set(v.ticker.toUpperCase(), v.cik_str);
    }
    return map;
  });
}

/**
 * Fetch raw SEC records for a given concept (NetIncomeLoss, Revenues, etc).
 * Returns all units (USD or shares), sorted by end date descending.
 */
async function fetchSecConcept(
  cik: number,
  concept: string,
): Promise<SecFiling[]> {
  const paddedCik = cik.toString().padStart(10, "0");
  return cached(`sec:${paddedCik}:${concept}`, 24 * 3600, async () => {
    const r = await fetch(`${SEC_BASE}/api/xbrl/companyconcept/CIK${paddedCik}/us-gaap/${concept}.json`, {
      headers: { "User-Agent": "screener-v2 (research@example.com)" },
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { units?: Record<string, SecFiling[]> };
    const usd = data.units?.USD ?? [];
    const shares = data.units?.shares ?? [];
    return [...usd, ...shares].sort((a, b) => b.end.localeCompare(a.end));
  });
}

/**
 * Get the N most recent UNIQUE 10-Q quarterly filings (dedup by fy+fp).
 * Returns them in chronological order (oldest first).
 */
function getLastNQuarters(records: SecFiling[], n = 4): SecFiling[] {
  const quarterly = records.filter((r) => r.form?.startsWith("10-Q"));
  const seen = new Set<string>();
  const unique: SecFiling[] = [];
  for (const r of quarterly) {
    const key = `${r.fy}-${r.fp}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
    if (unique.length >= n) break;
  }
  return unique.reverse(); // oldest first
}

/**
 * Fetch all fundamentals for a ticker.
 * Returns null if the company is not in SEC (BR/international/crypto).
 */
export async function getSecFundamentals(symbol: string): Promise<Fundamentals | null> {
  const upper = symbol.toUpperCase();

  const cikMap = await getCikMap();
  const cik = cikMap.get(upper);
  if (!cik) return null;

  const [ni, rev, opInc, equity, shares] = await Promise.all([
    fetchSecConcept(cik, "NetIncomeLoss"),
    fetchSecConcept(cik, "Revenues").catch(() => [] as SecFiling[]),
    fetchSecConcept(cik, "OperatingIncomeLoss").catch(() => [] as SecFiling[]),
    fetchSecConcept(cik, "StockholdersEquity"),
    fetchSecConcept(cik, "CommonStockSharesOutstanding"),
  ]);

  if (ni.length === 0 && equity.length === 0) return null;

  // TTM = sum of last 4 unique quarters
  const niTTM = sumTTM(ni);
  const revTTM = sumTTM(rev);
  const opIncTTM = sumTTM(opInc);

  // Most recent quarter
  const latestNI = ni[0]?.val ?? null;
  const latestRev = rev[0]?.val ?? null;

  // Equity (most recent)
  const latestEq = equity[0]?.val ?? null;
  const latestShares = shares[0]?.val ?? null;
  const asOf = equity[0]?.end ?? shares[0]?.end ?? ni[0]?.end ?? null;

  // Ratios
  const eps = latestShares && niTTM ? niTTM / latestShares : null;
  const bookValue = latestShares && latestEq ? latestEq / latestShares : null;
  const roe = latestEq && niTTM ? niTTM / latestEq : null;
  const netMargin = revTTM && niTTM ? niTTM / revTTM : null;
  const operatingMargin = revTTM && opIncTTM ? opIncTTM / revTTM : null;

  return {
    cik,
    symbol: upper,
    ttmNetIncome: niTTM,
    ttmRevenue: revTTM,
    ttmOperatingIncome: opIncTTM,
    latestNetIncome: latestNI,
    latestRevenue: latestRev,
    latestOperatingIncome: opInc[0]?.val ?? null,
    equity: latestEq,
    shares: latestShares,
    // Ratios that need price come from getCombinedFundamentals() (Yahoo + SEC)
    pe: null,
    pb: null,
    ps: null,
    roe,
    netMargin,
    operatingMargin,
    eps,
    bookValuePerShare: bookValue,
    asOf,
  };
}

function sumTTM(records: SecFiling[]): number | null {
  const quarters = getLastNQuarters(records, 4);
  if (quarters.length === 0) return null;
  return quarters.reduce((acc, r) => acc + r.val, 0);
}
