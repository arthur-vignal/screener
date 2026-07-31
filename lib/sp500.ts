/**
 * Wikipedia S&P 500 + S&P 400 + S&P 600 constituents scraper.
 * No API key required. Falls back to hardcoded list if Wikipedia is down.
 *
 * Source: https://en.wikipedia.org/wiki/List_of_S%26P_500_companies
 *
 * Cached for 24h since the list changes only quarterly.
 */

import { cached } from "./cache";

const SP500_URL =
  "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies";
const SP400_URL =
  "https://en.wikipedia.org/wiki/List_of_S%26P_400_companies";

export type Constituent = {
  ticker: string;
  name: string;
  cik?: number;
};

// Fallback to a smaller curated list if Wikipedia fetch fails.
const FALLBACK = [
  "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "BRK.B",
  "JPM", "V", "JNJ", "WMT", "PG", "MA", "HD", "CVX", "ABBV",
  "MRK", "KO", "PEP", "AVGO", "COST", "ORCL", "LLY", "BAC",
  "TMO", "CSCO", "ADBE", "MCD", "PFE", "DHR", "ABT", "NFLX",
  "CRM", "DIS", "INTC", "VZ", "NKE", "CMCSA", "TXN", "AMD",
  "QCOM", "UNH", "HON", "IBM", "AMGN", "PM", "LOW", "GS",
  "CAT", "SBUX", "RTX", "BLK", "ELV", "BA", "C", "DE",
  "GE", "AXP", "BKNG", "TJX", "GILD", "AMAT", "MMM", "ISRG",
];

async function fetchWikiTickers(url: string, maxRows = 600): Promise<Constituent[]> {
  return cached(`wiki:${url}`, 24 * 3600, async () => {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (screener; finance; research)",
      },
    });
    if (!r.ok) throw new Error(`wiki ${r.status}`);
    const html = await r.text();
    // The table is wrapped in a sortable wikitable class.
    // Each row has cells with the ticker symbol in the first column.
    // Pattern: <a rel="nofollow" class="external text" href="...">TICKER</a>
    const rows: Constituent[] = [];
    const seen = new Set<string>();
    // Pattern that matches Wikipedia's S&P 500/400/600 table layout:
    //   <td><a class="external text" href="...">TICKER</a></td>
    //   <td><a href="...">Company Name</a></td>
    const regex =
      /class="external[^"]*"[^>]*>([A-Z][A-Z0-9.\-]{0,5})<\/a>\s*<\/td>\s*<td[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
      const ticker = m[1].replace(".", "-");
      if (seen.has(ticker)) continue;
      seen.add(ticker);
      rows.push({ ticker, name: m[2] });
      if (rows.length >= maxRows) break;
    }
    return rows;
  });
}

export async function getSP500Tickers(): Promise<Constituent[]> {
  try {
    return await fetchWikiTickers(SP500_URL, 510);
  } catch {
    return FALLBACK.map((t) => ({ ticker: t, name: t }));
  }
}

export async function getSP400Tickers(): Promise<Constituent[]> {
  try {
    return await fetchWikiTickers(SP400_URL, 410);
  } catch {
    return [];
  }
}
