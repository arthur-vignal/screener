/**
 * b3-classify.ts — heuristic B3 ticker type classification.
 *
 * Types:
 *   - "stock"  : ação (PETR4, VALE3, ITUB4, ABEV3, ...)
 *   - "fii"    : fundo imobiliário (HGLG11, XPML11, ...) — ends in 11, denominacao em reais, setor "Fundos Imobiliários"
 *   - "etf"    : ETF de renda variável / BDR de ETF (BOVA11, IVVB11, ...) — ends in 11 and not a FII
 *   - "bdr"    : Brazilian Depositary Receipt (AAPL34, A1DM34, ...) — ends in 34/35/39 and is 4-5 chars
 *   - "fractional" : XYZ3F, XYZ4F — fractional shares, NOT a primary listing
 *
 * Heuristics applied in order:
 *   1. Ends with "F" (no other digits)  -> fractional
 *   2. Ends with "11" or "12" AND total length 6 -> FII (most FIIs are 5-char root + "11")
 *   3. Ends with "34" or "35" or "39" (BDR level codes) -> BDR
 *   4. 6 chars + ends in "11" -> could be FII or ETF; default ETF if not in known FII list
 *   5. Matches Brapi sector "Fundos Imobiliários" -> FII
 *   6. Default: stock
 *
 * Brapi enrichment (longName + sector) overrides these heuristics when both
 * agree with one of the canonical patterns above.
 */
export type BrAssetType = "stock" | "fii" | "etf" | "bdr" | "fractional";

export function classifyB3Ticker(
  symbol: string,
  hint?: { longName?: string | null; sector?: string | null }
): BrAssetType {
  const sym = symbol.toUpperCase();

  // Strip ".SA" if attached (we don't usually have it but be safe)
  const clean = sym.endsWith(".SA") ? sym.slice(0, -3) : sym;

  // 1. Fractional
  if (clean.endsWith("F") && !/\dF$/.test(clean.slice(0, -1))) {
    // pure "F" suffix
    return "fractional";
  }

  // 2. FII vs ETF for "11" suffix — FIIs have a 5-letter root + "11" (e.g. HGLG11, XPML11)
  // ETFs typically have a 4-letter root + "11" (e.g. BOVA11, IVVB11, BBSD11).
  // Both are 6 chars. Sector from Brapi disambiguates: "Fundos Imobiliários" => FII.
  if (clean.endsWith("11")) {
    // Known ETFs (Brapi confirms type=etf) take priority over FII.
    if (KNOWN_B3_ETFS.has(clean)) return "etf";
    if (hint?.sector === "Fundos Imobiliários") return "fii";
    // If longName contains "Fundo de Investimento Imobiliário" or "FII"
    if (
      hint?.longName &&
      /Fundo.{0,4}Investimento.{0,4}Imobili[aá]rio|FII\b/i.test(hint.longName)
    ) {
      return "fii";
    }
    // Default for "11" suffix: if 4-letter root + 11, likely FII (B3 convention).
    // ETFs are rarer and most use a 3-letter root or are listed elsewhere.
    return "fii";
  }

  // 3. BDR codes typically end with 34/35/36/39 (level classification).
  if (/3[4569]$/.test(clean) && clean.length >= 4) {
    return "bdr";
  }

  // 4. ETFs with other codes (e.g. BOVA11 handled above; some legacy ETs).
  if (hint?.sector === "Fundos Imobiliários") return "fii";

  // 5. Default
  return "stock";
}

/**
 * Known FII roots — used to bias classification. Optional, kept for future use.
 */
export const KNOWN_B3_ETFS: ReadonlySet<string> = new Set([
  "BOVA11", "BOVV11", "BOVX11", "IVVB11", "SMAL11",
  "BBSD11", "ECOO11", "PIBB11", "BRAX11", "MATB11",
  "DIVO11", "FIND11", "GOVE11", "ISUS11", "EURP11",
  "AGBH11", "XFIX11", "IMAB11", "IRFM11", "NTNB11",
  "BTCI11",
]);

export const KNOWN_FII_ROOTS: ReadonlySet<string> = new Set([
  "HGLG", "XPML", "HGRU", "BCFF", "KNRI", "BTLG", "VISC", "MXRF", "IRDM",
  "XPIN", "GGRC", "VGIR", "CPTS", "PVBI", "HABT", "RECT", "BARI", "HGBS",
  "RBRR", "RBRP", "RBRY", "FIIB", "TRXF", "AGRO", "ARRI", "ATSA", "BBFI",
  "BBPO", "BCIA", "BDIV", "BICR", "BIME", "BIFF", "BIPD", "BMII", "BPFF",
]);

/**
 * Filter a list of B3 tickers to only "stock" type (drop BDRs, FIIs, ETFs, fractional).
 * Useful for the dashboard market table.
 */
export function onlyB3Stocks<T extends { symbol: string }>(
  items: T[],
  hintFor?: (symbol: string) => { longName?: string | null; sector?: string | null } | undefined
): T[] {
  return items.filter((it) => {
    const t = classifyB3Ticker(it.symbol, hintFor ? hintFor(it.symbol) : undefined);
    return t === "stock";
  });
}
