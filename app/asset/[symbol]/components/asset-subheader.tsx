"use client";

/**
 * AssetSubheader — slim identity strip used on the drill-down pages
 * (/asset/[symbol]/about, /profitability, /valuation, …).
 *
 * Layout:
 *   <logo>  ABEV3 › Valuation            R$ 15,25  +R$ 0,25 +1,67%
 *           Ambev S/A
 *
 * The breadcrumb segment links to the parent /asset/[symbol] page.
 * The logo, ticker, long name and live price mirror what the main
 * chart page shows, but stripped of chart-specific controls.
 */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { TickerLogo } from "@/components/ticker-logo";

export type SubheaderSection = {
  /** Slug used in /asset/[symbol]/<section>. Omit for the root page. */
  slug?: string;
  /** Display label in the breadcrumb, e.g. "Valuation", "Profitability". */
  label: string;
};

export function AssetSubheader({
  symbol,
  longName,
  logoUrl,
  currency,
  price,
  change,
  changePercent,
  section,
}: {
  symbol: string;
  longName: string | null;
  logoUrl: string | null;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  section?: SubheaderSection;
}) {
  const isUp = (change ?? 0) >= 0;
  const accent = isUp ? "#10b981" : "#f43f5e";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between gap-4 pb-4 border-b border-border/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Botão de voltar — seta circular à esquerda do logo, em todas as
            drill-down pages. Equivalente ao ChevronLeft do /asset/[ticker]
            raiz (ver print 3 da sessão). */}
        <Link
          href={`/asset/${symbol}`}
          aria-label={`Voltar para ${symbol}`}
          title="Voltar para o gráfico"
          className="shrink-0 flex items-center justify-center h-9 w-9 rounded-md bg-white/[0.04] border border-white/10 text-muted-foreground/80 hover:bg-white/[0.08] hover:border-white/20 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        {/* Logo: prefer the official SVG from Brapi; fall back to the
            generated TickerLogo circle if it's not present. */}
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${symbol} logo`}
            className="h-11 w-11 rounded-full bg-white/5 object-contain shrink-0"
          />
        ) : (
          <TickerLogo symbol={symbol} size="md" />
        )}
        <div className="min-w-0">
          {/* Breadcrumb: "ABEV3 › Valuation" */}
          <div className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
            <Link
              href={`/asset/${symbol}`}
              className="text-foreground hover:text-foreground/80 transition-colors"
            >
              {symbol}
            </Link>
            {section && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span className="text-muted-foreground">{section.label}</span>
              </>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground truncate max-w-[60ch]">
            {longName ?? symbol}
          </p>
        </div>
      </div>

      {/* Right: live price + change */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-[20px] md:text-[22px] font-semibold tabular-nums leading-none">
            {price == null ? "—" : formatCurrency(price, currency)}
          </p>
          <div
            className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums"
            style={{ color: accent }}
          >
            <span>
              {change == null
                ? "—"
                : `${isUp ? "+" : ""}${formatCurrency(change, currency)}`}
            </span>
            <span className="opacity-70">
              {changePercent == null
                ? ""
                : `${isUp ? "+" : ""}${changePercent.toFixed(2)}%`}
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

function formatCurrency(v: number, currency: string): string {
  const sym = currency === "USD" ? "$" : "R$";
  return `${sym} ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}