"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SectorRibbon } from "@/components/sector-ribbon";
import { MarketTable } from "@/components/market-table";
import { FearGreedPanel, NewsRail, SulfurPortfoliosRail } from "@/components/right-rail";
import { FearGreedGaugeBR } from "@/components/fear-greed-br";
import { IBOV_SECTORS } from "@/lib/ibovespa";

type DashboardMode = "global" | "us" | "br";

const DASHBOARD_TITLES: Record<DashboardMode, { title: string; subtitle: string; flag: string }> = {
  global: {
    title: "Global Markets",
    subtitle: "Ações S&P 500 e IBOVESPA lado a lado. Use o toggle BR/US/Global para alternar mercados, ou clique num setor acima para filtrar a tabela abaixo.",
    flag: "🌐",
  },
  us: {
    title: "US Markets",
    subtitle: "Ações do S&P 500 com preços em tempo real (Yahoo Finance), variação de 24h, market cap e volume.",
    flag: "🇺🇸",
  },
  br: {
    title: "Mercado Brasileiro 🇧🇷",
    subtitle: "Todas as ações listadas na B3, com preços em tempo real (via Brapi Pro), variação de 24h e volume. Use os filtros de setor para navegar.",
    flag: "🇧🇷",
  },
};

function normalizeMode(raw: string | null): DashboardMode {
  if (raw === "br") return "br";
  if (raw === "us") return "us";
  return "global";
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <div className="max-w-[1920px] mx-auto bg-canvas text-ink p-7">
      <div className="label-s label-muted-2">Carregando…</div>
    </div>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const mode: DashboardMode = normalizeMode(searchParams.get("dashboard"));
  const meta = DASHBOARD_TITLES[mode];

  // Pick the right exchange for the table.
  // - global -> "all" (mixed US + BR list, default behavior)
  // - us     -> "sp500"
  // - br     -> "b3"
  // MarketTable.market prop accepts "global" | "us" | "br" only.
  // The MarketTable itself picks the exchange (sp500 / b3 / all) based on this.
  const tableMarket: "global" | "us" | "br" = mode;

  // For BR dashboard, allow per-sector chip filter.
  const [sector, setSector] = useState<string | null>(null);

  return (
    <div className="max-w-[1920px] mx-auto bg-canvas text-ink">
      {/* Dashboard hero — title + subtitle */}
      <div className="px-8 pt-[26px] pb-[14px] border-b border-hairline-strong">
        <h1 className="font-display text-[32px] md:text-[40px] text-ink tracking-tight">
          {meta.flag} {meta.title}
        </h1>
        <p className="text-body text-sm mt-1 max-w-2xl">{meta.subtitle}</p>
      </div>

      {/* Sector ribbon — click filters the table below */}
      <SectorRibbon onSectorChange={setSector} activeSector={sector} market={mode === "br" ? "br" : mode === "us" ? "us" : "us"} />

      {/* Main split — table + rail */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 340px" }}
      >
        {/* Left — Market table */}
        <div className="border-r border-hairline-strong">
          <MarketTable sectorFilter={sector} market={tableMarket} />
        </div>

        {/* Right — 340px rail */}
        <aside className="px-6 py-7 space-y-[18px]">
          {mode === "br" ? (
            <RailBlock>
              <BrDashboardRail />
            </RailBlock>
          ) : (
            <RailBlock>
              <FearGreedPanel />
            </RailBlock>
          )}
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

/**
 * BrDashboardRail — placeholder rail for the BR dashboard.
 * The real F&G-equivalent for BR (IVOL-BR, IBOV momentum, Selic real,
 * breadth) is a future feature. For now, this lists the same News/Sulfur
 * portfolio blocks the US rail has, so the BR dashboard has a right column
 * that matches in height.
 */
function BrDashboardRail() {
  return <FearGreedGaugeBR />;
}
