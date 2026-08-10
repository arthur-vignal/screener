"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SectorRibbon } from "@/components/sector-ribbon";
import { MarketTable } from "@/components/market-table";
import { FearGreedPanel, NewsRail, SulfurPortfoliosRail } from "@/components/right-rail";
import { FearGreedGaugeBR } from "@/components/fear-greed-br";

type DashboardMode = "us" | "br";

const DASHBOARD_TITLES: Record<DashboardMode, { title: string; subtitle: string; flag: string }> = {
  us: {
    title: "US Markets",
    subtitle: "Ações do S&P 500 com preços em tempo real (Yahoo Finance), variação de 24h, market cap e volume.",
    flag: "🇺🇸",
  },
  br: {
    title: "Mercado Brasileiro",
    subtitle: "Todas as ações listadas na B3, com preços em tempo real (via Brapi Pro), variação de 24h e volume. Use os filtros de setor para navegar.",
    flag: "🇧🇷",
  },
};

/**
 * normalizeMode — default is BR (matches the spec: open the site and you land
 * on the Brazilian dashboard). Pass ?dashboard=us to switch.
 */
function normalizeMode(raw: string | null): DashboardMode {
  return raw === "us" ? "us" : "br";
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
      <SectorRibbon
        onSectorChange={setSector}
        activeSector={sector}
        market={mode}
      />

      {/* Main split — table + rail */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 340px" }}
      >
        {/* Left — Market table */}
        <div className="border-r border-hairline-strong">
          <MarketTable sectorFilter={sector} market={mode} />
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

function BrDashboardRail() {
  return <FearGreedGaugeBR />;
}
