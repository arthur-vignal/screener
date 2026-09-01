"use client";

/**
 * CorrelatedStocksTable — mini tabela "ações correlatas" (logo | nome |
 * preço | var 7d | var 30d | mkt cap).
 *
 * Slot direito do grid 2-col do card Earnings na raiz /asset/[symbol].
 * Substitui o placeholder "Slot reservado para próxima métrica".
 *
 * Dados: /api/asset/[symbol]/correlated-stocks (top4 pares do subsetor
 * por marketCap, via /api/peer-benchmarks + brapi quote).
 */

import Link from "next/link";
import useSWR from "swr";
import type { JSX } from "react";

import { TickerLogo } from "@/components/foundation/ticker-logo";
import { Delta } from "@/components/foundation/delta";

type Row = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  changePercent7d: number | null;
  changePercent30d: number | null;
  marketCap: number | null;
  roe: number | null;
  pe: number | null;
};

type CorrelatedResponse = {
  symbol: string;
  rows: Row[];
  peersTotal: number;
  subSector: string | null;
  sectorFallback: boolean;
};

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

type Props = {
  symbol: string;
  className?: string;
};

export function CorrelatedStocksTable({
  symbol,
  className,
}: Props): JSX.Element | null {
  const { data } = useSWR<CorrelatedResponse>(
    `/api/asset/${symbol}/correlated-stocks`,
    fetchJson,
    { revalidateOnFocus: false },
  );

  if (!data || data.rows.length === 0) return null;

  return (
    <div
      className={
        "rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5 " +
        (className ?? "")
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13px] font-semibold text-foreground tracking-tight">
            Ações correlatas
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55">
            {data.subSector ?? "Subsetor"} · top{" "}
            {data.rows.length} por market cap
            {data.sectorFallback && " · setor amplo"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_repeat(4,minmax(0,0.8fr))] gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55 mb-1.5">
        <div>Ativo</div>
        <div className="text-right">Preço</div>
        <div className="text-right">7d</div>
        <div className="text-right">30d</div>
        <div className="text-right">Mkt cap</div>
      </div>

      {data.rows.map((row) => (
        <Link
          key={row.symbol}
          href={`/asset/${row.symbol}`}
          className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_repeat(4,minmax(0,0.8fr))] gap-2 py-2.5 border-t border-border/30 items-center hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <TickerLogo symbol={row.symbol} size="sm" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-foreground truncate">
                {row.symbol}
              </div>
              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[14ch]">
                {row.name.split(/\s/)[0]}
              </div>
            </div>
          </div>
          <div className="text-right text-[12px] tabular-nums text-foreground">
            {row.price != null
              ? row.price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "—"}
          </div>
          <div className="flex justify-end">
            <DeltaCell value={row.changePercent7d} />
          </div>
          <div className="flex justify-end">
            <DeltaCell value={row.changePercent30d} />
          </div>
          <div className="text-right text-[12px] tabular-nums text-muted-foreground/85">
            {row.marketCap != null ? formatCompact(row.marketCap) : "—"}
          </div>
        </Link>
      ))}
    </div>
  );
}

function DeltaCell({ value }: { value: number | null }): JSX.Element {
  if (value == null) {
    return (
      <div className="text-[12px] tabular-nums text-muted-foreground/40">
        —
      </div>
    );
  }
  return <Delta value={value} unit="percent" size="sm" />;
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `R$${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `R$${(n / 1e9).toFixed(0)}B`;
  if (abs >= 1e6) return `R$${(n / 1e6).toFixed(0)}M`;
  return n.toFixed(0);
}