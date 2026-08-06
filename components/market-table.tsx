"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";

type AssetType = "stock" | "etf" | "crypto";

type AssetListItem = {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
};

type Quote = {
  symbol: string;
  type: AssetType;
  sector: string;
  quote: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
  } | null;
  metrics?: { marketCap?: number };
};

const COLUMNS = [
  { key: "asset", label: "Asset", required: true },
  { key: "sector", label: "Sector" },
  { key: "price", label: "Price" },
  { key: "1d", label: "1D" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "mcap", label: "Market cap" },
  { key: "vol", label: "Volume" },
  { key: "spark", label: "30D" },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

const DEFAULT_VISIBLE: ColKey[] = ["asset", "sector", "price", "1d", "30d", "mcap", "vol", "spark"];

/**
 * MarketTable — Ledger spec. Owns the dashboard page.
 * 10-column grid with sort, column chips, pagination, sparklines, market cap bars.
 */
export function MarketTable({ sectorFilter }: { sectorFilter?: string | null }) {
  const [page, setPage] = useState(0);
  const limit = 12;
  const [items, setItems] = useState<AssetListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote | null>>({});
  const [visible, setVisible] = useState<ColKey[]>(DEFAULT_VISIBLE);
  const [sort, setSort] = useState<{ col: ColKey; dir: "asc" | "desc" }>({
    col: "mcap",
    dir: "desc",
  });
  const [pastChanges, setPastChanges] = useState<Record<string, { d7: number; d30: number }>>({});

  // Reset page when sector filter changes
  useEffect(() => {
    setPage(0);
  }, [sectorFilter]);

  // Fetch page of assets
  useEffect(() => {
    let abort = false;
    const params = new URLSearchParams({
      offset: String(page * limit),
      limit: String(limit),
      exchange: "sp500",
    });
    if (sectorFilter && sectorFilter !== "all") params.set("sector", sectorFilter);

    fetch(`/api/assets/list?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (abort) return;
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {
        if (!abort) setItems([]);
      });
    return () => {
      abort = true;
    };
  }, [page, sectorFilter]);

  // Batch quote for visible symbols
  useEffect(() => {
    if (!items || items.length === 0) return;
    const syms = items.map((i) => i.symbol).join(",");
    fetch(`/api/assets/quote?symbols=${encodeURIComponent(syms)}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, Quote | null> = {};
        for (const row of d.rows ?? []) {
          map[row.symbol] = row;
        }
        setQuotes(map);
      })
      .catch(() => {});
  }, [items]);

  // 7D / 30D changes via chart batch
  useEffect(() => {
    if (!items || items.length === 0) return;
    const syms = items.map((i) => i.symbol);
    Promise.all(
      syms.map((sym) =>
        fetch(`/api/chart/${encodeURIComponent(sym)}?range=1M`)
          .then((r) => r.json())
          .then((d) => {
            const pts = (d.points ?? []) as { close: number; date: string | number }[];
            if (pts.length < 2) return null;
            const last = pts[pts.length - 1].close;
            const d7 = pts[Math.max(0, pts.length - 8)]?.close ?? last;
            const d30 = pts[0]?.close ?? last;
            return {
              sym,
              d7: ((last - d7) / d7) * 100,
              d30: ((last - d30) / d30) * 100,
            };
          })
          .catch(() => null),
      ),
    ).then((arr) => {
      const map: Record<string, { d7: number; d30: number }> = {};
      for (const r of arr) if (r) map[r.sym] = { d7: r.d7, d30: r.d30 };
      setPastChanges(map);
    });
  }, [items]);

  // Sorted items
  const sorted = useMemo(() => {
    if (!items) return null;
    const arr = [...items];
    arr.sort((a, b) => {
      const qa = quotes[a.symbol];
      const qb = quotes[b.symbol];
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sort.col) {
        case "asset":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "sector":
          av = a.sector;
          bv = b.sector;
          break;
        case "price":
          av = qa?.quote?.price ?? 0;
          bv = qb?.quote?.price ?? 0;
          break;
        case "1d":
          av = qa?.quote?.changePercent ?? 0;
          bv = qb?.quote?.changePercent ?? 0;
          break;
        case "7d":
          av = pastChanges[a.symbol]?.d7 ?? 0;
          bv = pastChanges[b.symbol]?.d7 ?? 0;
          break;
        case "30d":
          av = pastChanges[a.symbol]?.d30 ?? 0;
          bv = pastChanges[b.symbol]?.d30 ?? 0;
          break;
        case "mcap":
          av = qa?.metrics?.marketCap ?? 0;
          bv = qb?.metrics?.marketCap ?? 0;
          break;
        case "vol":
          av = qa?.quote?.volume ?? 0;
          bv = qb?.quote?.volume ?? 0;
          break;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = av as number;
      const bn = bv as number;
      return sort.dir === "asc" ? an - bn : bn - an;
    });
    return arr;
  }, [items, quotes, sort, pastChanges]);

  const maxMcap = useMemo(() => {
    let max = 0;
    for (const it of items ?? []) {
      const m = quotes[it.symbol]?.metrics?.marketCap ?? 0;
      if (m > max) max = m;
    }
    return max || 1;
  }, [items, quotes]);

  function toggleCol(key: ColKey) {
    if (key === "asset") return; // required
    setVisible((v) => (v.includes(key) ? v.filter((k) => k !== key) : [...v, key]));
  }

  function toggleSort(col: ColKey) {
    setSort((s) =>
      s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" },
    );
  }

  function fmtCap(v: number | undefined): string {
    if (v == null) return "—";
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    return v.toLocaleString("en-US");
  }

  function fmtVol(v: number | undefined): string {
    if (v == null) return "—";
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toLocaleString("en-US");
  }

  function fmtPrice(p: number | undefined): string {
    if (p == null) return "—";
    if (p < 1) return `$${p.toFixed(4)}`;
    return `$${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }

  function fmtPct(p: number | undefined): string {
    if (p == null) return "—";
    const sign = p >= 0 ? "+" : "−";
    return `${sign}${Math.abs(p).toFixed(2)}%`;
  }

  const totalPages = Math.ceil(total / limit);
  const start = total === 0 ? 0 : page * limit + 1;
  const end = Math.min(total, (page + 1) * limit);

  const columnWidth: Record<ColKey, string> = {
    asset: "minmax(180px,1fr)",
    sector: "110px",
    price: "84px",
    "1d": "76px",
    "7d": "76px",
    "30d": "76px",
    mcap: "84px",
    vol: "80px",
    spark: "104px",
  };
  const cols: ColKey[] = ["asset", "sector", "price", "1d", "7d", "30d", "mcap", "vol", "spark"];
  const activeColumns = cols.filter((key) => key === "asset" || visible.includes(key));
  const tpl = ["44px", ...activeColumns.map((key) => columnWidth[key])].join(" ");
  function isOn(key: ColKey) {
    return visible.includes(key);
  }

  return (
    <div>
      {/* Toolbar: title + count + column chips */}
      <div className="px-7 pt-[22px] pb-[14px] flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[19px] text-ink tracking-[-0.03em]">
            Market
          </h2>
          <span className="label label-muted-2">
            {total > 0 ? `${start}–${end} of ${total.toLocaleString("en-US")}` : "—"}
          </span>
          {sectorFilter && (
            <span className="label border border-hairline-strong px-1.5 py-0.5 text-brand-deep">
              {sectorFilter}
            </span>
          )}
        </div>

        {/* Column chips */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {cols.map((c) => {
            const col = COLUMNS.find((x) => x.key === c)!;
            const on = isOn(c);
            return (
              <button
                key={c}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggleCol(c)}
                data-on={on}
                disabled={c === "asset"}
                className={cn("col-chip press", c === "asset" && "opacity-60 cursor-not-allowed")}
                title={`Toggle ${col.label}`}
              >
                {on ? "✓ " : ""}
                {col.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div>
        {/* Header */}
        <div
          className="grid items-center h-8 px-7 bg-canvas-soft border-t border-hairline-strong border-b border-hairline-strong label text-muted"
          style={{ gridTemplateColumns: tpl }}
        >
          <div className="num text-faint">#</div>
          <SortHeader
            label="Asset"
            col="asset"
            sort={sort}
            onClick={toggleSort}
            className="justify-start"
          />
          {isOn("sector") && (
            <SortHeader label="Sector" col="sector" sort={sort} onClick={toggleSort} />
          )}
          {isOn("price") && (
            <SortHeader
              label="Price"
              col="price"
              sort={sort}
              onClick={toggleSort}
              className="justify-end text-right"
            />
          )}
          {isOn("1d") && (
            <SortHeader
              label="1D"
              col="1d"
              sort={sort}
              onClick={toggleSort}
              className="justify-end text-right"
            />
          )}
          {isOn("7d") && (
            <SortHeader
              label="7D"
              col="7d"
              sort={sort}
              onClick={toggleSort}
              className="justify-end text-right"
            />
          )}
          {isOn("30d") && (
            <SortHeader
              label="30D"
              col="30d"
              sort={sort}
              onClick={toggleSort}
              className="justify-end text-right"
            />
          )}
          {isOn("mcap") && (
            <SortHeader
              label="Mkt cap"
              col="mcap"
              sort={sort}
              onClick={toggleSort}
              className="justify-end text-right"
            />
          )}
          {isOn("vol") && (
            <SortHeader
              label="Volume"
              col="vol"
              sort={sort}
              onClick={toggleSort}
              className="justify-end text-right"
            />
          )}
          {isOn("spark") && <div className="text-right">30D</div>}
        </div>

        {/* Rows */}
        {!sorted ? (
          <div className="space-y-px bg-canvas">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="h-[46px] shimmer" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-7 py-10 text-center label text-muted">
            Nenhum ativo encontrado.
          </div>
        ) : (
          sorted.map((it, i) => {
            const q = quotes[it.symbol];
            const qp = q?.quote;
            const past = pastChanges[it.symbol];
            const mcap = q?.metrics?.marketCap ?? 0;
            const mcapPct = (mcap / maxMcap) * 100;
            const changeColor = (qp?.changePercent ?? 0) >= 0 ? "text-positive" : "text-negative";
            return (
              <Link
                key={it.symbol}
                href={`/asset/${encodeURIComponent(it.symbol)}`}
                className="grid items-center h-[46px] px-7 border-b border-hairline hover-row press animate-fade-up"
                style={{
                  gridTemplateColumns: tpl,
                  animationDelay: `${i * 30}ms`,
                }}
              >
                <div className="num text-faint">
                  {String(start + i).padStart(3, "0")}
                </div>

                {/* Asset (required) */}
                <div className="flex items-center gap-[11px] min-w-0">
                  <div className="w-[22px] h-[22px] bg-surface flex items-center justify-center num text-[9px] text-ink shrink-0">
                    {it.symbol.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <div className="num text-[12.5px] text-ink truncate">
                      {it.symbol}
                    </div>
                    <div className="text-[10.5px] text-muted truncate">
                      {it.name}
                    </div>
                  </div>
                </div>

                {isOn("sector") && (
                  <div className="text-[11.5px] text-muted truncate">{it.sector}</div>
                )}

                {isOn("price") && (
                  <div className="num text-[12.5px] text-ink text-right">
                    {fmtPrice(qp?.price)}
                  </div>
                )}

                {isOn("1d") && (
                  <div className={cn("num text-[12px] text-right font-medium", qp ? changeColor : "text-faint")}>
                    {qp ? formatPercent(qp.changePercent) : "—"}
                  </div>
                )}

                {isOn("7d") && (
                  <div
                    className={cn(
                      "num text-[12px] text-right font-medium",
                      !past ? "text-faint" : past.d7 >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {past ? fmtPct(past.d7) : "—"}
                  </div>
                )}

                {isOn("30d") && (
                  <div
                    className={cn(
                      "num text-[12px] text-right font-medium",
                      !past ? "text-faint" : past.d30 >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {past ? fmtPct(past.d30) : "—"}
                  </div>
                )}

                {isOn("mcap") && (
                  <div className="flex items-center justify-end">
                    <div className="num text-[12px] text-ink text-right whitespace-nowrap">
                      {fmtCap(mcap)}
                    </div>
                  </div>
                )}

                {isOn("vol") && (
                  <div className="num text-[12px] text-muted text-right">
                    {fmtVol(qp?.volume)}
                  </div>
                )}

                {isOn("spark") && (
                  <div className="flex justify-end">
                    <SparkCell symbol={it.symbol} positive={(past?.d30 ?? 0) >= 0} />
                  </div>
                )}
              </Link>
            );
          })
        )}

        {/* Footer / pagination */}
        <div className="px-7 py-4 flex items-center justify-between border-t border-hairline-strong">
          <div className="label label-muted-2">
            Showing {start}–{end} of {total.toLocaleString("en-US")}
          </div>
          <div className="flex items-stretch border border-hairline-strong">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 label text-muted hover:text-ink disabled:text-disabled press border-r border-hairline-strong"
            >
              <ArrowLeft className="inline w-3 h-3 mr-1" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 label text-muted hover:text-ink disabled:text-disabled press"
            >
              Next
              <ArrowRight className="inline w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sort,
  onClick,
  className,
}: {
  label: string;
  col: ColKey;
  sort: { col: ColKey; dir: "asc" | "desc" };
  onClick: (col: ColKey) => void;
  className?: string;
}) {
  const active = sort.col === col;
  return (
    <button
      onClick={() => onClick(col)}
      className={cn(
        "flex items-center label hover:text-ink transition-colors duration-150 press",
        className,
        active ? "text-ink" : "text-muted",
      )}
    >
      {label}
      {active && (
        <span className="ml-1 text-[8px]">{sort.dir === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );
}

/* ---------- Inline sparkline that reads /api/chart/[ticker] ---------- */
function SparkCell({ symbol, positive }: { symbol: string; positive: boolean }) {
  const [pts, setPts] = useState<number[] | null>(null);

  useEffect(() => {
    let abort = false;
    fetch(`/api/chart/${encodeURIComponent(symbol)}?range=1M`)
      .then((r) => r.json())
      .then((d) => {
        if (abort) return;
        const arr = (d.points ?? []) as { close: number }[];
        setPts(arr.map((p) => p.close));
      })
      .catch(() => {});
    return () => {
      abort = true;
    };
  }, [symbol]);

  const w = 112;
  const h = 26;

  if (!pts || pts.length < 2) {
    return (
      <svg width={w} height={h} className="shrink-0" aria-hidden>
        <line
          x1="0"
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke="var(--hairline-strong)"
          strokeWidth="1"
        />
      </svg>
    );
  }

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

  const color = positive ? "var(--positive)" : "var(--negative)";

  return (
    <svg
      width={w}
      height={h}
      className="shrink-0 animate-stroke-draw"
      style={{ ["--draw-length" as string]: pts.length * 12 }}
      aria-hidden
    >
      <path
        d={path}
        stroke={color}
        strokeWidth="1.3"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}