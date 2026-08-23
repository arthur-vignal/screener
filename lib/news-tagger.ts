/**
 * News ticker tagger — given an article headline + summary, detect
 * which B3 tickers are mentioned and return them with offsets so the
 * UI can render clickable ticker chips inside the headline text.
 *
 * Strategy:
 *  1. Build an index of aliases (lowercased) → tickers from
 *     lib/b3-tickers.ts.
 *  2. For each alias, search the input string (case-insensitive, with
 *     word boundaries). Aliases are sorted longest-first so that
 *     "Itaú Unibanco" matches before "Itaú".
 *  3. Merge overlapping ranges. Prefer the longer alias when two
 *     candidates collide (e.g. "Vale" vs "Vale S.A.").
 *  4. Dedupe by ticker symbol — the same company may be matched by
 *     multiple aliases.
 *
 * Output: { symbols: Set<string>, ranges: Array<{ start, end, symbol }> }
 *
 *   symbols  — set of unique tickers mentioned (e.g. {PETR4, VALE3})
 *   ranges   — for the headline renderer: each match with offsets
 *
 * The server uses this in /api/news/multi to add relatedTickers to
 * each item. The client uses the relatedTickers to render the chips.
 */

import { B3_BY_SYMBOL, buildAliasIndex } from "./b3-tickers";

export type TaggerMatch = {
  symbol: string;
  start: number;
  end: number;
  matchedText: string;
  matchedAlias: string;
};

export type TaggerResult = {
  symbols: string[];
  matches: TaggerMatch[];
};

/**
 * Pre-build an ordered list of (regex, symbol, alias) entries.
 * Sort aliases longest-first so "Itaú Unibanco" wins over "Itaú".
 */
function buildTaggerIndex(): Array<{
  alias: string;
  symbol: string;
  regex: RegExp;
}> {
  const aliasIndex = buildAliasIndex();
  const entries: Array<{ alias: string; symbol: string; regex: RegExp }> = [];
  for (const [alias, symbols] of aliasIndex.entries()) {
    if (alias.length < 4) continue; // skip "S/A", "Cia" — too short
    for (const symbol of symbols) {
      const entry = B3_BY_SYMBOL[symbol];
      if (!entry) continue;
      // Use \b only on the start to allow matches inside compound words
      // when the alias is multi-token (rare in our data, all aliases
      // are single tokens).
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "giu");
      entries.push({ alias, symbol, regex });
    }
  }
  // Sort by alias length DESC so longer matches win.
  entries.sort((a, b) => b.alias.length - a.alias.length);
  return entries;
}

let _taggerIndex: ReturnType<typeof buildTaggerIndex> | null = null;
function getTaggerIndex() {
  if (!_taggerIndex) _taggerIndex = buildTaggerIndex();
  return _taggerIndex;
}

/**
 * Detect B3 tickers mentioned in the given text. Returns both the
 * unique symbols and the precise ranges so the renderer can replace
 * the matched text with a ticker chip while preserving the rest.
 */
export function tagTickers(text: string): TaggerResult {
  if (!text) return { symbols: [], matches: [] };

  const index = getTaggerIndex();
  // Matches: sorted by start asc, then by length desc.
  const candidates: TaggerMatch[] = [];
  for (const { alias, symbol, regex } of index) {
    // Reset lastIndex for each RegExp.
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      candidates.push({
        symbol,
        start: m.index,
        end: m.index + m[0].length,
        matchedText: m[0],
        matchedAlias: alias,
      });
      if (m.index === regex.lastIndex) regex.lastIndex++; // safety
    }
  }

  // Sort by start asc, then by length desc (longer wins on overlap).
  candidates.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  // Drop overlapping ranges — keep the first (which is the longest
  // because of the sort above).
  const kept: TaggerMatch[] = [];
  let lastEnd = -1;
  for (const c of candidates) {
    if (c.start >= lastEnd) {
      kept.push(c);
      lastEnd = c.end;
    }
  }

  // Dedupe by symbol — same ticker matched by multiple aliases only counts once.
  const seen = new Set<string>();
  const symbols: string[] = [];
  for (const c of kept) {
    if (!seen.has(c.symbol)) {
      seen.add(c.symbol);
      symbols.push(c.symbol);
    }
  }

  return { symbols, matches: kept };
}

/**
 * Convenience: tag a headline and a summary together and union the
 * results. Used by the API route when adding relatedTickers to an
 * item.
 */
export function tagNewsItem(headline: string, summary: string): string[] {
  const a = tagTickers(headline);
  const b = tagTickers(summary);
  return Array.from(new Set([...a.symbols, ...b.symbols]));
}
