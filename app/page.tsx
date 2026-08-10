"use client";

import { useState } from "react";
import { SectorRibbon } from "@/components/sector-ribbon";
import { MarketTable } from "@/components/market-table";
import { FearGreedPanel, NewsRail, SulfurPortfoliosRail } from "@/components/right-rail";

/**
 * Dashboard — Ledger spec (1b direction).
 *
 * Layout:
 *   1. MacroStrip  (6 cells, full width, border-bottom)
 *   2. SectorRibbon (1 fixed label col + 11 cells, full width, border-bottom)
 *   3. Main split  (grid 1fr 340px)
 *      Left  — MarketTable (toolbar + sort + column chips + 12 rows + pagination)
 *      Right — Rail (Fear & Greed · News · Sulfur portfolios)
 */
export default function DashboardPage() {
  const [sector, setSector] = useState<string | null>(null);

  return (
    <div className="max-w-[1920px] mx-auto bg-canvas text-ink">
      {/* Sector ribbon — click filters the table below */}
      <SectorRibbon onSectorChange={setSector} activeSector={sector} />

      {/* Main split — table + rail */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 340px" }}
      >
        {/* Left — Market table */}
        <div className="border-r border-hairline-strong">
          <MarketTable sectorFilter={sector} />
        </div>

        {/* Right — 340px rail */}
        <aside className="px-6 py-7 space-y-[18px]">
          <RailBlock>
            <FearGreedPanel />
          </RailBlock>
          <RailBlock>
            <NewsRail />
          </RailBlock>
          <RailBlock>
            <SulfurPortfoliosRail />
          </RailBlock>
        </aside>
      </div>
    </div>
  );
}

function RailBlock({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-hairline-strong pt-[18px]">{children}</div>;
}