"use client";

/**
 * MacroIndicesList — tabela de índices B3 no layout Fey.
 *
 * Referência visual: print 3 do chat (Americas table). Estrutura:
 *
 *   | Americas | YTD | P/LTM | DivY | MktCap | Vol | 2-day | Price | Daily perf |
 *   | 🇧🇷 Ibovespa | +8.32% | 12.6 | 5.82% | 3.25B | 23.37M | [~~~] | 127.485 | -0.42 -1.67% |
 *
 * Dados:
 *   GET /api/indexes → lista de IndexLive (brapi v2 pros 2 índices
 *   B3 cobertos, mock pros outros 7).
 *
 * Personalização via localStorage `sulfur:analysis:visibleIndices` —
 * mantém o comportamento do componente anterior.
 *
 * TODO quando plugar yfinance: setar `entry.brapi` em lib/indexes.ts
 * pra cada índice e remover o fallback mock. Estrutura da API já tá
 * pronta.
 */

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import {
  LineChart, Line, ResponsiveContainer, YAxis,
} from "recharts";

import { Skeleton } from "@/components/foundation/skeleton";
import type { IndexLive } from "@/lib/indexes";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sulfur:analysis:visibleIndices";

/**
 * Bandeira do país como emoji. Mantém minimal — Fey usa emoji
 * exatamente assim no print. Quando o cliente pedir SVG, troca.
 */
function countryFlag(country: IndexLive["country"]): string {
  switch (country) {
    case "Brazil": return "🇧🇷";
    case "USA": return "🇺🇸";
    case "Mexico": return "🇲🇽";
    case "Canada": return "🇨🇦";
  }
}

export function MacroIndicesList(): JSX.Element {
  const [all, setAll] = useState<IndexLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Set<string> | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Load do localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr) && arr.length > 0) {
          setVisible(new Set(arr));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persistir
  useEffect(() => {
    if (visible == null) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...visible]),
      );
    } catch {
      // ignore (quota / SSR)
    }
  }, [visible]);

  // Fetch dos índices
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/indexes", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { indexes?: IndexLive[] };
        if (!cancelled) {
          setAll(data.indexes ?? []);
          setLoading(false);
          // Default: mostra todos, se ainda não tem filtro
          setVisible((prev) => prev ?? new Set((data.indexes ?? []).map((i) => i.symbol)));
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // visibleSet é null até carregar localStorage — esconde tabela
  const visibleSet = visible ?? new Set(all.map((i) => i.symbol));
  const visibleRows = useMemo(
    () => all.filter((r) => visibleSet.has(r.symbol)),
    [all, visibleSet],
  );
  const hidden = all.filter((r) => !visibleSet.has(r.symbol));

  const userTouched = useRef(false);
  const toggle = (sym: string) => {
    userTouched.current = true;
    setVisible((prev) => {
      const next = new Set(prev ?? visibleSet);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  return (
    <section
      className="rounded-2xl border border-white/5 bg-[#101116] overflow-hidden"
      aria-label="Índices B3"
    >
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="text-[12px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/85">
            Índices B3
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground/70">
            Personalizável · {visibleRows.length} exibidos
            {visibleRows.some((r) => r.source === "brapi") && (
              <span className="ml-2 text-[10px] text-[#4dbe95]">
                ● brapi v2
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(!addOpen)}
          aria-expanded={addOpen}
          aria-label="Adicionar ou remover índices"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md",
            "bg-white/[0.04] border border-white/10 text-foreground",
            "text-[12px] font-medium",
            "hover:bg-white/[0.08] hover:border-white/20",
            "transition-colors",
            "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/30",
          )}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Editar
        </button>
      </header>

      {addOpen && (
        <div className="px-6 pb-4 border-b border-white/[0.04]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">
            Remover da lista
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleRows.map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => toggle(r.symbol)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-3 w-3" /> {r.name}
              </button>
            ))}
          </div>
          {hidden.length > 0 && (
            <>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">
                Adicionar de volta
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {hidden.map((r) => (
                  <button
                    key={r.symbol}
                    type="button"
                    onClick={() => toggle(r.symbol)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] hover:bg-white/[0.08] transition-colors"
                  >
                    <Plus className="h-3 w-3" /> {r.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <SkeletonRows />
        ) : visibleRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-muted-foreground/85">
            Nenhum índice selecionado.
          </div>
        ) : (
          <>
            {/* Header row — Fey usa colunas uppercase micro */}
            <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.6fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)] items-center gap-3 px-6 py-2.5 border-b border-white/[0.06]">
              <HeaderCell>Americas</HeaderCell>
              <HeaderCell>YTD</HeaderCell>
              <HeaderCell>P/LTM</HeaderCell>
              <HeaderCell>Div yield</HeaderCell>
              <HeaderCell>Mkt cap</HeaderCell>
              <HeaderCell>Volume</HeaderCell>
              <HeaderCell>2-day chart</HeaderCell>
              <HeaderCell align="right">Price</HeaderCell>
              <HeaderCell align="right">Daily perf.</HeaderCell>
            </div>
            {visibleRows.map((r) => (
              <Row key={r.symbol} row={r} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function HeaderCell({
  children,
  align = "left",
}: { children: React.ReactNode; align?: "left" | "right" }): JSX.Element {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/60",
        align === "right" && "text-right",
      )}
    >
      {children}
    </span>
  );
}

function Row({ row }: { row: IndexLive }): JSX.Element {
  const ytdPos = row.ytdPercent >= 0;
  const dayPos = row.changePercent >= 0;
  // Gera sparkline 2-day (2 pontos + linha curva) — Fey tem um
  // pattern que vai down/up. Como IndexLive não traz recent aqui,
  // simulamos com base na direção do dia.
  const sparkData = useMemo(() => [
    { x: 0, y: 50 - row.changePercent * 6 },  // ontem (inverte: subiu → ontem mais baixo)
    { x: 1, y: 50 },
  ], [row.changePercent]);
  return (
    <a
      href={`/index/${row.symbol}`}
      className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.6fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1fr)] items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors"
    >
      {/* Americas (bandeira + nome + país) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[18px] leading-none shrink-0" aria-hidden>
          {countryFlag(row.country)}
        </span>
        <span className="text-[14px] font-semibold text-foreground truncate">
          {row.name}
        </span>
        <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wide shrink-0">
          {row.country}
        </span>
      </div>

      {/* YTD */}
      <span
        className={cn(
          "inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums",
          ytdPos ? "bg-[#4dbe95]/15 text-[#4dbe95]" : "bg-[#d84f68]/15 text-[#d84f68]",
        )}
      >
        {ytdPos ? "+" : ""}
        {row.ytdPercent.toFixed(2)}%
      </span>

      {/* P/LTM */}
      <span className="text-[12px] text-foreground tabular-nums">
        {row.peRatio > 0 ? row.peRatio.toFixed(2) : "N/A"}
      </span>

      {/* Div yield */}
      <span className="text-[12px] text-foreground tabular-nums">
        {row.divYield > 0 ? `${row.divYield.toFixed(2)}%` : "N/A"}
      </span>

      {/* Mkt cap */}
      <span className="text-[12px] text-foreground tabular-nums">
        {row.marketCap > 0 ? `${row.marketCap.toFixed(2)}B` : "—"}
      </span>

      {/* Volume */}
      <span className="text-[12px] text-foreground tabular-nums">
        {row.volume > 0
          ? `${(row.volume / 1_000_000).toFixed(2)}M`
          : "—"}
      </span>

      {/* 2-day chart */}
      <div className="w-[80px] h-[28px]">
        <Sparkline data={sparkData} positive={dayPos} />
      </div>

      {/* Price */}
      <span className="text-[13px] text-foreground tabular-nums text-right">
        {row.price.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
      </span>

      {/* Daily perf (change + change%) */}
      <div className="flex items-center justify-end gap-1.5">
        <span
          className={cn(
            "text-[12px] tabular-nums",
            dayPos ? "text-[#4dbe95]" : "text-[#d84f68]",
          )}
        >
          {row.change >= 0 ? "+" : ""}
          {row.change.toFixed(2)}
        </span>
        <span
          className={cn(
            "inline-flex items-center w-fit px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums",
            dayPos ? "bg-[#4dbe95]/15 text-[#4dbe95]" : "bg-[#d84f68]/15 text-[#d84f68]",
          )}
        >
          {dayPos ? "+" : ""}
          {row.changePercent.toFixed(2)}%
        </span>
      </div>
    </a>
  );
}

function Sparkline({
  data, positive,
}: { data: Array<{ x: number; y: number }>; positive: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis hide domain={[0, 100]} />
        <Line
          type="monotone"
          dataKey="y"
          stroke={positive ? "#4dbe95" : "#d84f68"}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SkeletonRows() {
  return (
    <ul className="p-2 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12 ml-auto" />
          <Skeleton className="h-7 w-20" />
        </li>
      ))}
    </ul>
  );
}
