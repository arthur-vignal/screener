"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type SectorRow = {
  sector: string;
  count: number;
  avgChange: number;
  gainers: number;
  losers: number;
};

/**
 * SectorRibbon — replaces treemap. 11 cells (or as many as returned).
 * Cell fill alpha = min(0.24, 0.05 + abs(pct) * 0.1), per Ledger spec.
 * Hover: outline brand-deep, offset -2px (square).
 * Click: filters the market table by sector (passed via onSectorChange).
 */
export function SectorRibbon({
  onSectorChange,
  activeSector,
}: {
  onSectorChange?: (sector: string | null) => void;
  activeSector?: string | null;
}) {
  const [data, setData] = useState<SectorRow[] | null>(null);
  const [gainers, totalSectors] = [
    data?.filter((s) => s.avgChange > 0).length ?? 0,
    data?.length ?? 0,
  ];

  useEffect(() => {
    fetch("/api/market/sectors")
      .then((r) => r.json())
      .then((d) => setData(d.sectors ?? []))
      .catch(() => setData([]));
  }, []);

  function handleClick(sector: string) {
    if (!onSectorChange) return;
    if (activeSector === sector) onSectorChange(null);
    else onSectorChange(sector);
  }

  return (
    <div className="border-b border-hairline-strong flex">
      {/* Left label column (180px fixed) */}
      <div className="w-[180px] shrink-0 px-6 py-[18px] flex flex-col justify-between border-r border-hairline-strong">
        <div>
          <div className="label-s label-muted-2 mb-1">Sectors · 1D</div>
          {data && (
            <div className="num num-md text-ink">
              {gainers} of {totalSectors} up
            </div>
          )}
        </div>
      </div>

      {/* Cells */}
      <div className="flex-1 grid grid-cols-11 gap-px bg-hairline-strong">
        {(data ?? Array.from({ length: 11 }).map(() => ({
          sector: "—",
          avgChange: 0,
          count: 0,
          gainers: 0,
          losers: 0,
        }))).slice(0, 11).map((s, i) => {
          const isPlaceholder = s.sector === "—";
          const direction = s.avgChange >= 0 ? "up" : "down";
          const alpha = isPlaceholder ? 0.05 : Math.min(0.24, 0.05 + Math.abs(s.avgChange) * 0.1);
          const isActive = activeSector === s.sector;

          return (
            <button
              key={`${s.sector}-${i}`}
              type="button"
              onClick={() => !isPlaceholder && handleClick(s.sector)}
              data-direction={direction}
              data-active={isActive}
              className={cn(
                "sector-cell px-3 py-[14px] flex flex-col justify-between min-w-0 text-left press",
                isPlaceholder && "cursor-default opacity-50",
              )}
              style={{ ["--cell-alpha" as string]: alpha }}
              title={`${s.sector} · ${s.avgChange >= 0 ? "+" : ""}${s.avgChange.toFixed(2)}%`}
            >
              <div
                className="label-s truncate"
                style={{ color: "var(--cell-label)", letterSpacing: "0.10em" }}
              >
                {s.sector === "Communication Services"
                  ? "Comms Svc"
                  : s.sector === "Consumer Discretionary"
                    ? "Cons Disc"
                    : s.sector === "Consumer Staples"
                      ? "Cons Stap"
                      : s.sector === "Information Technology"
                        ? "Info Tech"
                        : s.sector}
              </div>
              <div
                className="num num-xs font-medium"
                style={{
                  color: s.avgChange >= 0 ? "var(--cell-value-up)" : "var(--cell-value-down)",
                  letterSpacing: "-0.02em",
                }}
              >
                {!isPlaceholder
                  ? `${s.avgChange >= 0 ? "+" : "−"}${Math.abs(s.avgChange).toFixed(2)}%`
                  : "—"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}