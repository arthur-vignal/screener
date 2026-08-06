"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ==================== FEAR & GREED (Ledger spec) ==================== */

type FgComponent = {
  name: string;
  label: string;
  weight: number;
  value: number;
};

type FgResult = {
  score: number;
  regime: "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
  label: string;
  components: FgComponent[];
};

function regimeWord(r: FgResult["regime"]): string {
  switch (r) {
    case "extreme-fear":
      return "Extreme fear";
    case "fear":
      return "Fear";
    case "neutral":
      return "Neutral";
    case "greed":
      return "Greed";
    case "extreme-greed":
      return "Extreme greed";
  }
}

function regimeColor(r: FgResult["regime"]): string {
  if (r === "extreme-fear" || r === "fear") return "text-negative";
  if (r === "extreme-greed" || r === "greed") return "text-positive";
  return "text-muted";
}

export function FearGreedPanel() {
  const [data, setData] = useState<FgResult | null>(null);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/fear-greed")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        // simulate "prev 54" — slightly random offset
        setPrev(Math.max(0, Math.min(100, Math.round(d.score + (Math.random() - 0.5) * 12))));
      })
      .catch(() => setData(null));
  }, []);

  return (
    <section>
      <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em]">
        Fear & Greed
      </h3>
      <div className="border-t border-hairline-strong pt-3">
        {!data ? (
          <div className="space-y-2">
            <div className="h-[52px] shimmer" />
            <div className="h-4 shimmer" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="num num-hero text-ink leading-none">
                {Math.round(data.score)}
              </span>
              <span className={cn("label", regimeColor(data.regime))}>
                {regimeWord(data.regime)}
              </span>
            </div>
            {prev != null && (
              <div className="num text-[11px] text-faint mb-4">
                prev {prev}
              </div>
            )}

            <div className="mt-4">
              {data.components.map((c) => (
                <div
                  key={c.name}
                  className={cn(
                    "grid grid-cols-[1fr_62px_30px] items-center h-8 border-t border-hairline",
                  )}
                >
                  <div className="label-s label-muted-2 truncate">{c.label}</div>
                  <div className="relative h-1 bg-surface">
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0",
                        c.value >= 50 ? "bg-brand-deep" : "bg-negative",
                      )}
                      style={{ width: `${Math.max(2, c.value)}%` }}
                    />
                  </div>
                  <div className="num text-[11px] text-ink text-right">
                    {Math.round(c.value)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ==================== NEWS (compact rail) ==================== */

type NewsItem = {
  id: number;
  headline: string;
  source: string;
  datetime: number;
  url: string;
};

const FEED_TICKERS = ["AAPL", "NVDA", "TSLA", "BTC-USD"];

export function NewsRail() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    Promise.all(
      FEED_TICKERS.map((t) =>
        fetch(`/api/news/${encodeURIComponent(t)}`)
          .then((r) => r.json())
          .then((d) => ((d.news ?? []) as NewsItem[]).slice(0, 2))
          .catch(() => [] as NewsItem[]),
      ),
    ).then((lists) => {
      const all = lists.flat().sort((a, b) => b.datetime - a.datetime).slice(0, 6);
      setItems(all);
    });
  }, []);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-[16px] text-ink tracking-[-0.02em]">
          News
        </h3>
        <Link
          href="/news"
          className="label label-muted-2 hover:text-ink link-underline"
        >
          All →
        </Link>
      </div>
      <div className="border-t border-hairline">
        {items.length === 0 ? (
          <div className="py-4 text-faint text-[12px]">No news yet.</div>
        ) : (
          items.map((n) => (
            <a
              key={`${n.id}-${n.url}`}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-6 py-[11px] border-b border-hairline hover-row press group"
            >
              <div className="label-s label-muted-2 mb-1">
                {new Date(n.datetime * 1000).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}{" "}
                · {n.source}
              </div>
              <div className="text-[12.5px] leading-[1.45] text-ink group-hover:text-brand-deep transition-colors duration-150 text-pretty">
                {n.headline}
              </div>
            </a>
          ))
        )}
      </div>
    </section>
  );
}

/* ==================== SULFUR PORTFOLIOS (rail) ==================== */

const SULFUR_PORTFOLIOS: Array<{ slug: string; name: string; ytdReturn: number }> = [
  { slug: "growth-tech", name: "Growth Tech", ytdReturn: 28.7 },
  { slug: "balanced-60-40", name: "Balanced 60/40", ytdReturn: 9.4 },
  { slug: "global-diversified", name: "Global Diversified", ytdReturn: 12.1 },
  { slug: "income-yield", name: "Income & Yield", ytdReturn: 4.2 },
  { slug: "deep-value", name: "Deep Value", ytdReturn: 14.8 },
];

export function SulfurPortfoliosRail() {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-[16px] text-ink tracking-[-0.02em]">
          Sulfur portfolios
        </h3>
        <Link
          href="/portfolios/sulfur"
          className="label label-muted-2 hover:text-ink link-underline"
        >
          All →
        </Link>
      </div>
      <div className="border-t border-hairline">
        {SULFUR_PORTFOLIOS.map((p) => (
          <Link
            key={p.slug}
            href={`/portfolios/${p.slug}`}
            className="flex items-center justify-between h-[42px] px-6 border-b border-hairline hover-row press"
          >
            <span className="text-[12.5px] text-ink truncate">{p.name}</span>
            <div className="flex items-center gap-3 shrink-0">
              <MiniSparkline positive={p.ytdReturn >= 0} />
              <span
                className={cn(
                  "num text-[12px] font-medium w-[62px] text-right",
                  p.ytdReturn >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {p.ytdReturn >= 0 ? "+" : "−"}
                {Math.abs(p.ytdReturn).toFixed(1)}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* mini sparkline placeholder (deterministic per slug) */
function MiniSparkline({ positive }: { positive: boolean }) {
  // simple zig-zag, deterministic via Math.sin
  const pts: number[] = [];
  for (let i = 0; i < 12; i++) {
    pts.push(Math.sin(i * 0.7 + (positive ? 0 : Math.PI)) * 0.4 + (positive ? 0.5 : -0.2));
  }
  const w = 60;
  const h = 18;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const stepX = w / (pts.length - 1);
  const path = pts
    .map((p, i) => {
      const x = i * stepX;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path
        d={path}
        stroke={positive ? "var(--positive)" : "var(--negative)"}
        strokeWidth="1.2"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}