"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NewsItem = {
  id: number | string;
  headline: string;
  source: string;
  datetime: number;
  url: string;
  relatedTickers?: string[];
};

type MultiNewsResponse = {
  news: NewsItem[];
};

type Props = {
  tickers: string[];
  title?: string;
  showAllHref?: string;
  limit?: number;
};

/**
 * NewsForTickers — aggregated news block for one or more tickers.
 * Used as a rail block on asset / portfolio / index detail pages.
 * Clicks open articles inline (handled by the page's news modal).
 */
export function NewsForTickers({
  tickers,
  title = "News",
  showAllHref,
  limit = 6,
}: Props) {
  const tickersParam = tickers.slice(0, 30).join(",");
  const { data, isLoading } = useSWR<MultiNewsResponse>(
    tickersParam ? `/api/news/multi/${tickersParam}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const news = (data?.news ?? []).slice(0, limit);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-[16px] text-ink tracking-[-0.02em]">
          {title}
        </h3>
        {showAllHref && (
          <Link
            href={showAllHref}
            className="label label-muted-2 hover:text-ink link-underline"
          >
            All →
          </Link>
        )}
      </div>
      <div className="border-t border-hairline-strong">
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: Math.min(4, limit) }).map((_, i) => (
              <div key={i} className="h-[58px] shimmer" />
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="py-4 text-faint text-[12px]">No recent news.</div>
        ) : (
          news.map((n) => (
            <a
              key={`${n.id}-${n.url}`}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-[11px] border-b border-hairline hover-row press group"
            >
              <div className="label-s label-muted-2 mb-1 flex items-center gap-2">
                <span>
                  {new Date(n.datetime * 1000).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{n.source}</span>
                {n.relatedTickers && n.relatedTickers.length > 0 && (
                  <span className="ticker-chip ml-auto shrink-0">
                    {n.relatedTickers[0]}
                  </span>
                )}
              </div>
              <div className="text-[12.5px] leading-[1.45] text-ink group-hover:text-brand-deep transition-colors duration-150 text-pretty line-clamp-2">
                {n.headline}
              </div>
            </a>
          ))
        )}
      </div>
    </section>
  );
}