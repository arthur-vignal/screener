"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type MacroItem = {
  symbol: string;
  label: string;
  description: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
};

function fmtPrice(p: number | null, label: string): string {
  if (p == null) return "—";
  if (label === "VIX") return p.toFixed(2);
  if (label === "US 10Y") return `${p.toFixed(3)}%`;
  if (label === "DXY") return p.toFixed(2);
  if (label === "Gold") return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (label === "BTC" || label === "ETH") return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return p.toFixed(2);
}

function fmtChange(c: number | null, p: number | null): string {
  if (c == null || p == null) return "—";
  const sign = c >= 0 ? "+" : "−";
  return `${sign}${Math.abs(c).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const sign = p >= 0 ? "+" : "−";
  return `${sign}${Math.abs(p).toFixed(2)}%`;
}

/**
 * MacroStrip — 6 equal cells, mono labels, 25px tabular values.
 * First thing the eye hits on the dashboard.
 */
export function MacroStrip() {
  const [data, setData] = useState<MacroItem[] | null>(null);

  useEffect(() => {
    fetch("/api/market/macro")
      .then((r) => r.json())
      .then((d) => setData(d.macro ?? []))
      .catch(() => setData([]));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-b border-hairline-strong">
      {(data ?? Array.from({ length: 6 })).map((m, i) => {
        const hasData = m && m.price != null;
        const positive = hasData && (m.change ?? 0) >= 0;
        return (
          <div
            key={m?.symbol ?? `skel-${i}`}
            className={cn(
              "px-[26px] py-[18px] border-b md:border-b-0 border-hairline",
              i < 5 && "lg:border-r border-hairline",
            )}
            style={i > 0 ? { borderLeftWidth: 0 } : undefined}
          >
            <div className="label-s label-muted-2 mb-1">{m?.label ?? "—"}</div>
            <div className="num num-xl text-ink">
              {hasData ? fmtPrice(m.price, m.label) : "—"}
            </div>
            <div
              className={cn(
                "num-row mt-1",
                !hasData
                  ? "text-faint"
                  : positive
                    ? "text-positive"
                    : "text-negative",
              )}
            >
              {hasData ? `${fmtChange(m.change, m.price)} · ${fmtPct(m.changePercent)}` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}