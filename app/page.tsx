"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Newspaper, TrendingUp, Wallet } from "lucide-react";

/**
 * Landing page — root URL /. Lets the visitor choose a destination:
 *   - BR dashboard (?dashboard=br)
 *   - US dashboard (?dashboard=us)
 *   - Markets overview (/market/br or /market/us)
 *   - Indices (/indices)
 *
 * The default dashboard moved to /dashboard or /?dashboard=br|us.
 */
export default function LandingPage() {
  return (
    <div className="px-3 md:px-4 py-6 md:py-10 max-w-[1920px]">
      {/* Hero */}
      <div className="border-b border-hairline-strong pb-10 mb-10">
        <div className="flex items-center gap-[11px] mb-4">
          <div className="w-[28px] h-[28px] bg-ink flex items-center justify-center">
            <span className="font-display text-[18px] text-canvas leading-none font-bold">
              S
            </span>
          </div>
          <span className="font-display text-[24px] text-ink leading-none tracking-[-0.03em]">
            Sulfur<span className="bg-brand text-brand-on px-[3px] ml-[1px]">.io</span>
          </span>
        </div>
        <h1 className="font-display text-[40px] md:text-[56px] text-ink tracking-[-0.03em] max-w-[20ch] leading-[1.05]">
          O mercado numa só tela.
        </h1>
        <p className="text-body text-base mt-4 max-w-2xl leading-relaxed">
          Screener de ações US + B3 com valuation oficial (Brapi Pro), índices
          curados, portfólios, notícias e Fear & Greed. Tudo num único lugar.
        </p>
      </div>

      {/* Two main destinations */}
      <h2 className="font-display text-[20px] text-ink tracking-[-0.02em] mb-4">
        Escolha um mercado
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Link
          href="/?dashboard=br"
          className="group border border-hairline-strong bg-surface-elevated p-7 hover-lift"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[28px] leading-none">🇧🇷</span>
            <h3 className="font-display text-[24px] text-ink group-hover:text-brand-deep transition-colors">
              Mercado Brasileiro
            </h3>
          </div>
          <p className="text-body text-sm mb-5 leading-relaxed">
            Todas as ações listadas na B3 (1.184+), com preços em tempo real via
            Brapi Pro, variação de 24h, market cap, volume e Fear & Greed BR.
          </p>
          <div className="label-s text-brand-deep inline-flex items-center gap-1">
            Acessar dashboard
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/?dashboard=us"
          className="group border border-hairline-strong bg-surface-elevated p-7 hover-lift"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[28px] leading-none">🇺🇸</span>
            <h3 className="font-display text-[24px] text-ink group-hover:text-brand-deep transition-colors">
              US Markets
            </h3>
          </div>
          <p className="text-body text-sm mb-5 leading-relaxed">
            Ações S&P 500 com preços em tempo real (Brapi Pro), variação de 24h,
            market cap, volume e Fear & Greed Index.
          </p>
          <div className="label-s text-brand-deep inline-flex items-center gap-1">
            Acessar dashboard
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* Other tools */}
      <h2 className="font-display text-[20px] text-ink tracking-[-0.02em] mb-4">
        Outras ferramentas
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <ToolCard
          href="/market/br"
          icon={BarChart3}
          title="Mercado BR"
          subtitle="Ações, FIIs, ETFs e BDRs"
        />
        <ToolCard
          href="/market/us"
          icon={Building2}
          title="Mercado US"
          subtitle="S&P 500 e ETFs"
        />
        <ToolCard
          href="/indices"
          icon={TrendingUp}
          title="Índices"
          subtitle="B3 + custom"
        />
        <ToolCard
          href="/news"
          icon={Newspaper}
          title="Notícias"
          subtitle="Por ativo"
        />
        <ToolCard
          href="/portfolios"
          icon={Wallet}
          title="Portfólios"
          subtitle="Crie e acompanhe"
        />
      </div>

      <div className="mt-12 pt-6 border-t border-hairline text-xs text-muted">
        Dados via Brapi Pro + B3 + CVM (oficial). Yields: 1 cache min, 30 min
        para cotações históricas.
      </div>
    </div>
  );
}

function ToolCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: typeof Building2;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group border border-hairline-strong bg-surface p-5 hover-lift"
    >
      <Icon className="w-5 h-5 text-muted group-hover:text-brand-deep transition-colors mb-2" />
      <div className="font-medium text-ink text-sm">{title}</div>
      <div className="text-[11px] text-muted mt-0.5">{subtitle}</div>
    </Link>
  );
}
