"use client";

/**
 * /asset/[symbol]/about — company profile + business summary.
 *
 * Pulls the full summaryProfile from the asset bundle and renders:
 *   - Hero: longBusinessSummary (truncated to 5 lines max)
 *   - Identity grid: sector, industry, employees, CNPJ, website, city/state
 *   - Footer link: back to the chart page
 */

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { useAssetBackground } from "@/lib/use-asset-background";

export default function AboutPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  const profile = (data?.profile ?? {}) as Record<string, string | number | null | undefined>;

  const summary = profile.longBusinessSummary as string | undefined;
  const sector = profile.sector as string | undefined;
  const industry = profile.industry as string | undefined;
  const website = profile.website as string | undefined;
  const employees = profile.fullTimeEmployees as number | undefined;
  const cnpj = profile.cnpj as string | undefined;
  const city = profile.city as string | undefined;
  const state = profile.state as string | undefined;

  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);

  return (
    <div
      className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-manrope)",
        ...bgStyle,
      }}
    >
      <div className="px-1 pt-5 pb-12 max-w-5xl">
        <AssetSubheader
          symbol={symbol}
          longName={data?.longName ?? null}
          logoUrl={data?.logoUrl ?? null}
          currency={data?.currency ?? "BRL"}
          price={data?.quote?.price ?? null}
          change={data?.quote?.change ?? null}
          changePercent={data?.quote?.changePercent ?? null}
          section={{ slug: "about", label: "Sobre" }}
        />

        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-2">
            Resumo
          </h2>
          <p className="text-[14px] md:text-[15px] leading-relaxed text-foreground/85 max-w-3xl">
            {isLoading
              ? "Carregando…"
              : summary ?? "Sem resumo disponível para esta empresa."}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Identidade
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Setor" value={sector} />
              <Info label="Indústria" value={industry} />
              <Info
                label="Funcionários"
                value={
                  typeof employees === "number"
                    ? employees.toLocaleString("pt-BR")
                    : null
                }
              />
              <Info label="CNPJ" value={cnpj} mono />
              <Info
                label="Localização"
                value={city || state ? [city, state].filter(Boolean).join(", ") : null}
              />
              <Info
                label="Website"
                value={website}
                link={website?.startsWith("http") ? website : undefined}
              />
            </div>
          </div>
        </section>

        <Link
          href={`/asset/${symbol}`}
          className="inline-flex items-center gap-1.5 mt-8 text-[12px] tracking-[0.18em] uppercase text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar para o gráfico
        </Link>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  link?: string;
}) {
  const display =
    value == null || value === "" ? "—" : String(value);
  return (
    <div className="px-4 py-4 border-t border-border/40 sm:border-t-0 sm:border-l sm:first:border-l-0 sm:first:border-t-0 border-border/40">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block text-[14px] font-medium text-foreground/90 hover:text-foreground truncate underline-offset-2 hover:underline"
        >
          {display}
        </a>
      ) : (
        <p
          className={
            "mt-1.5 text-[14px] font-medium tabular-nums truncate " +
            (mono ? "font-mono text-[13px]" : "")
          }
        >
          {display}
        </p>
      )}
    </div>
  );
}