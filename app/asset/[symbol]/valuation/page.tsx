"use client";

/**
 * /asset/[symbol]/valuation — valuation drill-down (Leva 1).
 *
 * Layout 3-faixas (1920x1080 sem scroll horizontal):
 *
 *   Faixa superior (~30%) — 3 cards de leitura rápida lado a lado:
 *     1. P/L Trailing vs CAPE (mostra divergência em cíclicas)
 *     2. Posição na banda ±1σ (sparkline + classificação)
 *     3. Spread Earnings Yield vs IPCA 12m (prêmio real)
 *
 *   Faixa central (~45%) — duas colunas:
 *     Esquerda: ValuationBandChart com seletor de múltiplo
 *       (P/L, P/VP, EV/EBITDA) e banda real ±1σ/±2σ, com hachura
 *       explícita nos anos de múltiplo indefinido
 *     Direita: QualityVsPriceScatter (EV/EBITDA × ROIC) com quadrantes
 *       bom/ruim × caro/barato
 *
 *   Faixa inferior (~25%) — tabela compacta de múltiplos correntes
 *
 * O P/L mostra a verdade (lucro atual vs média 10 anos deflacionada),
 * protege contra armadilha de cíclica, e o scatter contextualiza o
 * preço pela qualidade do negócio.
 */

import Link from "next/link";
import { use, useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronLeft } from "lucide-react";
import { useAssetBundle } from "../lib/use-asset-bundle";
import { AssetSubheader } from "../components/asset-subheader";
import { AllStatsButton } from "@/components/all-stats-button";
import { useAssetBackground } from "@/lib/use-asset-background";
import { ValuationBandChart } from "@/components/valuation-band-chart";
import { QualityVsPriceScatter } from "@/components/quality-vs-price-scatter";
import { computeCAPE } from "@/lib/analytics/cape";
import { ipca12m } from "@/lib/deflator";
import { formatMultiple } from "@/lib/format";

type Multiple = "trailingPE" | "priceToBook" | "enterpriseToEbitda";

const MULTIPLE_LABELS: Record<Multiple, string> = {
  trailingPE: "P/L",
  priceToBook: "P/VP",
  enterpriseToEbitda: "EV/EBITDA",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ValuationPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");
  const { style: bgStyle, className: bgClass } = useAssetBackground(symbol);
  const { data, isLoading, error } = useAssetBundle(symbol);

  // IPCA pra CAPE deflacionado
  const { data: ipcaData } = useSWR<{ ipca: Array<{ year: string; month: string; value: number }> }>(
    `/api/macro/ipca`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const ipca = ipcaData?.ipca ?? [];

  const ks = (data?.keyStatistics ?? {}) as Record<string, number | string | null | undefined>;
  const fd = (data?.financialData ?? {}) as Record<string, number | string | null | undefined>;

  // Seletor de múltiplo da faixa central
  const [multiple, setMultiple] = useState<Multiple>("trailingPE");

  // ── Métricas correntes ─────────────────────────────────────────
  const price = data?.quote?.price ?? null;
  const trailingPE = data?.metrics?.trailingPE ?? null;
  const priceToBook = num(ks.priceToBook);
  const enterpriseToEbitda = num(ks.enterpriseToEbitda);
  const ebitda = num(fd.ebitda);
  const netIncome = num(ks.netIncomeToCommon);
  const sharesOutstanding = num(ks.sharesOutstanding);
  const roe = num(ks.returnOnEquity); // (do bundle via keyStatistics — não vem, vem em fd)
  const roeFromFd = num(fd.returnOnEquity);
  const roic = roeFromFd != null ? roeFromFd : roe;

  // ── Histórico de cada múltiplo (decrescente: h[0]=2025) ─────────
  const ksHist = (data?.historicals?.keyStatistics ?? []) as Array<{
    endDate: string;
    trailingPE?: number | null;
    priceToBook?: number | null;
    enterpriseToEbitda?: number | null;
  }>;

  const history = useMemo(() => {
    return ksHist.map((r) => {
      const v = r[multiple];
      return { endDate: r.endDate, value: v ?? null };
    });
  }, [ksHist, multiple]);

  // ── CAPE: P/L sobre lucro médio real de 10 anos ────────────────
  const incomeHist = (data?.historicals?.income ?? []) as Array<{
    endDate: string;
    netIncome?: number | null;
  }>;
  const cape = useMemo(() => {
    if (incomeHist.length === 0 || ipca.length === 0) return null;
    const netIncomeByYear = incomeHist.map((r) => ({
      year: Number(r.endDate?.slice(0, 4) ?? 0),
      value: r.netIncome ?? null,
    }));
    return computeCAPE({
      netIncomeByYear,
      sharesOutstanding,
      currentPrice: price,
      ipca,
    });
  }, [incomeHist, ipca, sharesOutstanding, price]);

  // ── Spread Earnings Yield vs IPCA 12m (prêmio real) ────────────
  const earningsYield = trailingPE != null && trailingPE > 0 ? 1 / trailingPE : null;
  const ipca12 = ipca12m(ipca);
  const realSpread =
    earningsYield != null && ipca12 != null ? earningsYield - ipca12 / 100 : null;

  // ── Posição na banda: classifica o valor atual vs histórico ────
  const position = useMemo(() => {
    if (history.length < 2) return null;
    const validValues = history
      .map((h) => h.value)
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    if (validValues.length < 2) return null;
    const mean = validValues.reduce((s, v) => s + v, 0) / validValues.length;
    const std = Math.sqrt(
      validValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (validValues.length - 1),
    );
    const current = history.find((h) => h.value != null)?.value ?? null;
    if (current == null || std === 0) return null;
    const z = (current - mean) / std;
    let band: "caro (+2σ)" | "caro (+1σ)" | "neutro (±1σ)" | "barato (−1σ)" | "barato (−2σ)";
    if (z > 1.5) band = "caro (+2σ)";
    else if (z > 0.5) band = "caro (+1σ)";
    else if (z > -0.5) band = "neutro (±1σ)";
    else if (z > -1.5) band = "barato (−1σ)";
    else band = "barato (−2σ)";
    return { z, mean, std, current, band };
  }, [history]);

  const currentMultiple =
    multiple === "trailingPE"
      ? trailingPE
      : multiple === "priceToBook"
        ? priceToBook
        : enterpriseToEbitda;

  // ── WACC aproximado: usa ROIC como proxy ────────────────────────
  const waccProxy = 0.12; // 12% (Selic real típica)

  return (
    <div
      className={`${bgClass} min-h-screen text-foreground overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-manrope)",
        ...bgStyle,
      }}
    >
      <div className="px-6 pt-5 pb-8 w-full max-w-[1920px] mx-auto">
        <AssetSubheader
          symbol={symbol}
          longName={data?.longName ?? null}
          logoUrl={data?.logoUrl ?? null}
          currency={data?.currency ?? "BRL"}
          price={price}
          change={data?.quote?.change ?? null}
          changePercent={data?.quote?.changePercent ?? null}
          section={{ slug: "valuation", label: "Valuation" }}
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60">
            <span>Valuation</span>
            {error && <span className="text-[var(--negative)]">dados indisponíveis</span>}
          </div>
          <AllStatsButton href={`/asset/${symbol}/stats/earnings`} label="Todas as estatísticas" />
        </div>

        {/* ── Faixa superior: 3 cards de leitura rápida ───────────── */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: P/L Trailing vs CAPE */}
          <div className="rounded-2xl border border-white/10 bg-[#101116] px-5 py-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
              P/L trailing vs ciclo
            </div>
            <div className="mt-3 flex items-baseline gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/50">
                  Trailing
                </div>
                <div className="text-[28px] font-medium tabular-nums tracking-tight text-foreground">
                  {trailingPE != null ? formatMultiple(trailingPE) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/50">
                  CAPE (10a)
                </div>
                <div
                  className="text-[28px] font-medium tabular-nums tracking-tight"
                  style={{
                    color:
                      cape != null && cape > 25
                        ? "var(--negative)"
                        : cape != null && cape < 8
                          ? "var(--positive)"
                          : "var(--foreground)",
                  }}
                >
                  {cape != null ? formatMultiple(cape) : "—"}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
              {cape != null && trailingPE != null ? (
                cape > trailingPE * 1.5 ? (
                  <>
                    P/L de ciclo <strong className="text-[var(--negative)]">{((cape / trailingPE) * 100 - 100).toFixed(0)}% acima</strong> do trailing. Lucro atual está no pico do ciclo.
                  </>
                ) : cape < trailingPE * 0.7 ? (
                  <>
                    P/L de ciclo <strong className="text-[var(--positive)]">{(((trailingPE - cape) / cape) * 100).toFixed(0)}% abaixo</strong> do trailing. Lucro atual está abaixo da média histórica.
                  </>
                ) : (
                  <>P/L de ciclo próximo ao trailing. Sem divergência material.</>
                )
              ) : (
                <>Sem dados suficientes pra calcular CAPE.</>
              )}
            </p>
          </div>

          {/* Card 2: Posição na banda */}
          <div className="rounded-2xl border border-white/10 bg-[#101116] px-5 py-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Posição na banda
            </div>
            {position ? (
              <>
                <div className="mt-3 flex items-baseline gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/50">
                      Atual
                    </div>
                    <div className="text-[28px] font-medium tabular-nums tracking-tight">
                      {formatMultiple(position.current)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/50">
                      Z-score
                    </div>
                    <div
                      className="text-[28px] font-medium tabular-nums tracking-tight"
                      style={{
                        color:
                          position.z > 1.5
                            ? "var(--negative)"
                            : position.z < -1.5
                              ? "var(--positive)"
                              : "var(--foreground)",
                      }}
                    >
                      {position.z > 0 ? "+" : ""}
                      {position.z.toFixed(2)}σ
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
                  <strong className="text-foreground">{position.band}</strong>.{" "}
                  Média {formatMultiple(position.mean)} · σ {formatMultiple(position.std)}.
                </p>
              </>
            ) : (
              <p className="mt-3 text-[14px] text-muted-foreground/70">
                Histórico insuficiente (precisa de ≥2 anos válidos).
              </p>
            )}
          </div>

          {/* Card 3: Spread Earnings Yield vs IPCA 12m */}
          <div className="rounded-2xl border border-white/10 bg-[#101116] px-5 py-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Prêmio real (earnings yield − IPCA 12m)
            </div>
            {realSpread != null ? (
              <>
                <div className="mt-3 text-[28px] font-medium tabular-nums tracking-tight"
                  style={{
                    color:
                      realSpread > 0.05
                        ? "var(--positive)"
                        : realSpread < 0
                          ? "var(--negative)"
                          : "var(--foreground)",
                  }}
                >
                  {(realSpread * 100).toFixed(1)} p.p.
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
                  Earnings yield {earningsYield != null ? `${(earningsYield * 100).toFixed(1)}%` : "—"}{" "}
                  − IPCA 12m {ipca12 != null ? `${ipca12.toFixed(1)}%` : "—"}.{" "}
                  {realSpread > 0.05
                    ? "Atrativo contra renda fixa."
                    : realSpread < 0
                      ? "Abaixo da renda fixa real."
                      : "Próximo da paridade."}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[14px] text-muted-foreground/70">
                P/L ou IPCA 12m indisponíveis.
              </p>
            )}
          </div>
        </div>

        {/* ── Faixa central: gráfico de banda (esq) + scatter (dir) ── */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          <div className="flex flex-col">
            {/* Seletor de múltiplo */}
            <div className="flex items-center gap-1 mb-3 p-0.5 rounded-md border border-white/10 bg-white/[0.02] w-fit">
              {(Object.keys(MULTIPLE_LABELS) as Multiple[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMultiple(m)}
                  className={`px-3 h-7 rounded text-[12px] transition-colors ${
                    multiple === m
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {MULTIPLE_LABELS[m]}
                </button>
              ))}
            </div>
            <ValuationBandChart
              history={history}
              current={currentMultiple}
              title={MULTIPLE_LABELS[multiple]}
              accentColor="#ffffff"
            />
          </div>
          <QualityVsPriceScatter
            roic={roic}
            evEbitda={enterpriseToEbitda}
            wacc={waccProxy}
            loading={isLoading}
          />
        </div>

        {/* ── Faixa inferior: tabela compacta de múltiplos ──────── */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 rounded-2xl border border-white/10 bg-[#101116] overflow-hidden">
          <RatioTile label="P/L" value={trailingPE} fmt="multiple" />
          <RatioTile label="P/VP" value={priceToBook} fmt="multiple" />
          <RatioTile
            label="EV/EBITDA"
            value={enterpriseToEbitda}
            fmt="multiple"
          />
          <RatioTile
            label="EV/Receita"
            value={num(ks.enterpriseToRevenue)}
            fmt="multiple"
          />
          <RatioTile
            label="52w change"
            value={pct(ks["52WeekChange"] ?? null)}
            fmt="percent"
          />
          <RatioTile label="Beta" value={num(ks.beta)} fmt="multiple" />
        </div>

        <Link
          href={`/asset/${symbol}`}
          className="inline-flex items-center gap-1.5 mt-6 text-[12px] tracking-[0.18em] uppercase text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar para o gráfico
        </Link>
      </div>
    </div>
  );
}

function RatioTile({
  label,
  value,
  fmt,
}: {
  label: string;
  value: number | null;
  fmt: "multiple" | "percent";
}) {
  const display =
    value == null ? "—" : fmt === "multiple" ? formatMultiple(value) : `${value.toFixed(2)}%`;
  return (
    <div className="px-4 py-4 border-r border-white/[0.06] last:border-r-0 border-b border-white/[0.06]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-1.5 text-[18px] font-medium tabular-nums">{display}</p>
    </div>
  );
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pct(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v * 100;
}
