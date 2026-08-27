"use client";

/**
 * /asset/[symbol]/valuation — valuation drill-down.
 *
 * Renders:
 *   - Subheader (logo + ticker + breadcrumb + live price)
 *   - Key ratios grid (P/E, Forward P/E, P/B, PEG, EV/EBITDA, EV/Revenue,
 *     52w change, beta, market cap, enterprise value)
 *   - 52w range card
 */

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { useAssetBackground } from "@/lib/use-asset-background";
import { PeBandChart } from "./pe-band-chart";

export default function ValuationPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { data, isLoading } = useAssetBundle(symbol);

  const ks = (data?.keyStatistics ?? {}) as Record<string, number | string | null | undefined>;
  const fd = (data?.financialData ?? {}) as Record<string, number | string | null | undefined>;

  const rows: Array<{ label: string; value: number | string | null; kind: ValueKind }> = [
    { label: "P/L (trailing)", value: num(data?.metrics?.trailingPE ?? null), kind: "multiple" },
    { label: "P/L (forward)", value: num(ks.forwardPE), kind: "multiple" },
    { label: "P/VP", value: num(ks.priceToBook), kind: "multiple" },
    { label: "PEG", value: num(ks.pegRatio), kind: "multiple" },
    { label: "EV / EBITDA", value: num(ks.enterpriseToEbitda), kind: "multiple" },
    { label: "EV / Receita", value: num(ks.enterpriseToRevenue), kind: "multiple" },
    { label: "52w change", value: pct(ks["52WeekChange"] ?? null), kind: "percent" },
    { label: "Beta", value: num(ks.beta), kind: "beta" },
    { label: "Valor de mercado", value: num(data?.metrics?.marketCap ?? null), kind: "compact" },
    { label: "Enterprise value", value: num(ks.enterpriseValue), kind: "compact" },
    { label: "Receita TTM", value: num(fd.totalRevenue), kind: "compact" },
    { label: "EBITDA", value: num(fd.ebitda), kind: "compact" },
  ];

  const w52Low = data?.quote?.fiftyTwoWeekLow ?? null;
  const w52High = data?.quote?.fiftyTwoWeekHigh ?? null;
  const price = data?.quote?.price ?? null;
  const rangePos =
    w52Low != null && w52High != null && price != null && w52High > w52Low
      ? Math.max(0, Math.min(1, (price - w52Low) / (w52High - w52Low)))
      : null;

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
          section={{ slug: "valuation", label: "Valuation" }}
        />

        {/* 52w range — enhanced gauge (F2-1) */}
        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Faixa 52 semanas
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-5 py-5">
            <div className="flex items-baseline justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>{w52Low != null ? fmtBRL(w52Low) : "—"}</span>
              <span>{w52High != null ? fmtBRL(w52High) : "—"}</span>
            </div>
            <div className="relative mt-3 h-2 rounded-full bg-foreground/10 overflow-visible">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-foreground/20 to-foreground/40 rounded-full"
                style={{ width: `${(rangePos ?? 0) * 100}%` }}
              />
              {rangePos != null && (
                <>
                  <div
                    className="absolute h-3.5 w-3.5 top-1/2 -translate-y-1/2 rounded-full bg-white border border-foreground/30 shadow"
                    style={{ left: `calc(${rangePos * 100}% - 7px)` }}
                  />
                  <div
                    className="absolute -bottom-1 h-1 w-0.5 bg-foreground/40"
                    style={{ left: `${rangePos * 100}%` }}
                  />
                </>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
              <div>
                <p className="text-muted-foreground/40">Distância p/ mínima</p>
                <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
                  {price != null && w52Low != null && w52Low > 0
                    ? `+${(((price - w52Low) / w52Low) * 100).toFixed(1)}%`
                    : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground/40">Posição</p>
                <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
                  {rangePos != null ? `${(rangePos * 100).toFixed(0)}º percentil` : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground/40">Distância p/ máxima</p>
                <p className="mt-0.5 text-foreground text-[13px] tabular-nums">
                  {price != null && w52High != null && price > 0
                    ? `${(((price - w52High) / w52High) * 100).toFixed(1)}%`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* F2-3: Banda histórica de P/L */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Banda histórica de P/L
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02] px-4 py-4">
            <PeBandChart
              history={(data?.historicals?.keyStatistics ?? []) as Array<{
                endDate: string;
                trailingPE?: number | null;
                price?: number | null;
              }>}
              currentPe={num(data?.metrics?.trailingPE ?? null)}
              currency={data?.currency ?? "BRL"}
            />
          </div>
        </section>

        {/* Ratios grid */}
        <section className="mt-8">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60 mb-3">
            Múltiplos e indicadores
          </h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-foreground/[0.02]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {rows.map((r) => (
                <Tile key={r.label} label={r.label} value={r.value} kind={r.kind} />
              ))}
            </div>
          </div>
        </section>

        {isLoading && (
          <p className="mt-3 text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/40 text-center">
            Carregando dados fundamentalistas…
          </p>
        )}

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

type ValueKind = "multiple" | "percent" | "beta" | "compact" | "text";

function Tile({
  label,
  value,
  kind,
}: {
  label: string;
  value: number | string | null;
  kind: ValueKind;
}) {
  const display = formatVal(value, kind);
  return (
    <div className="px-4 py-4 border-t border-border/40 sm:border-t-0 sm:border-l sm:first:border-l-0 sm:first:border-t-0 border-border/40">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] md:text-[16px] font-medium tabular-nums truncate">
        {display}
      </p>
    </div>
  );
}

function formatVal(v: number | string | null, kind: ValueKind): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && !Number.isFinite(v)) return "—";
  if (kind === "percent" && typeof v === "number") return `${v.toFixed(2)}%`;
  if (kind === "multiple" && typeof v === "number") return v.toFixed(2);
  if (kind === "beta" && typeof v === "number") return v.toFixed(2);
  if (kind === "compact" && typeof v === "number") return fmtBRL(v);
  return String(v);
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pct(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v * 100;
}

function safeDiv(v: unknown): number | null {
  const n = num(v);
  if (n == null || n === 0) return null;
  return n;
}

function fmtBRL(v: number): string {
  if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(1)}k`;
  if (v < 10 && v > -10) return `R$ ${v.toFixed(2)}`;
  return `R$ ${v.toFixed(0)}`;
}