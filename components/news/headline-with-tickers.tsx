"use client";

/**
 * Render an article headline (or summary) with clickable B3 ticker
 * chips inserted at every detected match. Used by NewsWidget (home)
 * and NewsCard (asset page).
 *
 * Usage:
 *   const matches = tagTickers(headline).matches;
 *   <p>{renderHeadline(headline, matches)}</p>
 *
 * Each match becomes a <TickerChip> that links to /asset/[symbol].
 * Non-matched text is rendered as plain text — no innerHTML, no
 * dangerouslySetInnerHTML — so XSS is impossible by construction.
 */

import { Fragment } from "react";
import { TickerChip } from "@/components/news/ticker-chip";
import type { TaggerMatch } from "@/lib/news-tagger";

/**
 * Render a string with ticker chips inserted at the given offsets.
 *
 * The caller is responsible for running tagTickers() and passing the
 * matches. This function does the actual slicing + rendering.
 *
 * Accepts any object with `{ symbol, start, end }` — extra fields
 * (`matchedText`, `matchedAlias`) are ignored. Lets callers like
 * `matchTickersBySymbols` (which builds matches from server-side
 * `tickers` array) plug in without rebuilding the full TaggerMatch
 * shape.
 */
type TaggerMatchLike = {
  symbol: string;
  start: number;
  end: number;
};

export function renderHeadline(
  text: string,
  matches: TaggerMatchLike[],
): React.ReactNode {
  if (!text || matches.length === 0) return text;

  // Sort matches by start asc (defensive — server should already do this).
  const sorted = [...matches].sort((a, b) => a.start - b.start);

  const out: React.ReactNode[] = [];
  let cursor = 0;
  for (const m of sorted) {
    if (m.start < cursor) continue; // skip overlapping
    if (m.start > cursor) {
      out.push(
        <Fragment key={`t-${cursor}`}>{text.slice(cursor, m.start)}</Fragment>,
      );
    }
    out.push(
      <TickerChip
        key={`c-${m.start}-${m.symbol}`}
        symbol={m.symbol}
        size={14}
      />,
    );
    cursor = m.end;
  }
  if (cursor < text.length) {
    out.push(<Fragment key={`t-end`}>{text.slice(cursor)}</Fragment>);
  }
  return out;
}
