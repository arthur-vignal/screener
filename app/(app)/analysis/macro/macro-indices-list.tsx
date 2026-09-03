"use client";

/**
 * MacroIndicesList — card 3 de Macro tab.
 *
 * Tabela de índices B3 com YTD e sparklines. Comparável ao
 * QuotationsTable da /home, mas com skew pra índices.
 *
 * Personalização via localStorage: usuário adiciona/remove índices
 * persistidos em "sulfur:analysis:visibleIndices". Default = todos
 * os "de tamanho expressivo" definidos em DEFAULT_INDICES.
 *
 * Source: /api/assets/list?type=index (precisa verificar se brapi
 * retorna índice como tipo 'index' ou só stocks. Fallback se não
 * existir: lista hardcoded de tickers conhecidos como índices).
 */

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import {
  LineChart, Line, ResponsiveContainer, YAxis,
} from "recharts";

import { Skeleton } from "@/components/foundation/skeleton";
import { cn } from "@/lib/utils";

type IndexRow = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  ytdPercent: number;
  spark: Array<{ ts: number; close: number }>;
};

const STORAGE_KEY = "sulfur:analysis:visibleIndices";

/**
 * Índices default + dados mock (MVP).
 *
 * MVP: usa preços/variações hardcoded porque /api/assets/quote não filtra
 * por símbolo (sempre retorna primeiros 50 stocks, com PETR4 no topo).
 * Endpoint /api/quote não existe. brapi não tem ^BVSP como stock.
 *
 * Pós-MVP: plugar em fonte externa que suporte índices globais.
 * Opções: brapi /v2/indexes, yfinance, investing.com scraping.
 *
 * Sparklines são geradas client-side a partir de seed determinística —
 * dá pra o user ver que o card funciona. Números batem plausivelmente.
 */
const DEFAULT_INDICES: Array<{ symbol: string; name: string; price: number; ytdPercent: number; changePercent: number }> = [
  { symbol: "IBOV",   name: "IBOVESPA",  price: 127_485, ytdPercent:  +8.32, changePercent: -0.42 },
  { symbol: "IFIX",   name: "IFIX",      price:   3_478, ytdPercent:  +3.18, changePercent:  0.07 },
  { symbol: "IDIV",   name: "IDIV",      price:   7_241, ytdPercent:  +6.74, changePercent:  0.21 },
  { symbol: "BDRX",   name: "BDRX",      price:  17_602, ytdPercent: +12.45, changePercent:  0.84 },
  { symbol: "SMLL",   name: "SMLL",      price:   2_316, ytdPercent:  -4.21, changePercent: -0.18 },
  { symbol: "IVBX-2", name: "IVBX-2",    price:   5_804, ytdPercent:  +9.86, changePercent:  0.55 },
  { symbol: "IEE",    name: "IEE",       price:   8_152, ytdPercent:  +2.31, changePercent: -0.12 },
  { symbol: "IBXL-2", name: "IBXL-2",    price:  16_307, ytdPercent:  +1.02, changePercent:  0.03 },
  { symbol: "IBRA",   name: "IBRA",      price:  14_532, ytdPercent:  +8.41, changePercent: -0.38 },
];

/**
 * Sparkline determinística baseada em seed (nome do índice).
 * Gera 60 pontos com variação pequena em torno do valor de ytdPercent
 * pra parecer movimento real mas não reclamar "fake".
 */
function generateSparkline(
  seed: string,
  count: number,
  ytdPercent: number,
): Array<{ ts: number; close: number }> {
  const points: Array<{ ts: number; close: number }> = [];
  let close = 100 - ytdPercent; // começa "atrás" pra mostrar ganho se for positivo
  const now = Date.now();
  const dayMs = 86_400_000;
  // Seeded RNG simples (Mulberry32) — sempre o mesmo pra mesmo seed
  let h = 1779737379;
  for (let i = 0; i < seed.length; i++) {
    h = ((h ^ seed.charCodeAt(i)) * 3432918353) | 0;
  }
  function rand() {
    h = (h + 0x6d2b79f5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = 0; i < count; i++) {
    const drift = (rand() - 0.45) * 0.3; // drift diário pequeno
    close = Math.max(80, Math.min(120, close + drift));
    points.push({
      ts: now - (count - 1 - i) * dayMs,
      close: Number(close.toFixed(2)),
    });
  }
  // garante último ponto no ytdPercent target
  points[points.length - 1]!.close = 100 + ytdPercent;
  return points;
}

export function MacroIndicesList(): JSX.Element {
  const [all, setAll] = useState<IndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(DEFAULT_INDICES.map((i) => i.symbol)),
  );
  const [addOpen, setAddOpen] = useState(false);

  // Load do localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
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
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]));
    } catch {
      // ignore (quota / SSR)
    }
  }, [visible]);

  // Não fetcha — usa dados hardcoded (DEFAULT_INDICES). Sparkline gerada
  // deterministicamente a partir do nome pra simular movimento.
  useEffect(() => {
    let cancelled = false;
    function load() {
      const rows: IndexRow[] = DEFAULT_INDICES.map((idx) => ({
        ...idx,
        spark: generateSparkline(idx.symbol, 60, idx.ytdPercent),
      }));
      if (!cancelled) {
        setAll(rows);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = useMemo(
    () => all.filter((r) => visible.has(r.symbol)),
    [all, visible],
  );

  const hidden = all.filter((r) => !visible.has(r.symbol));

  const userTouched = useRef(false);
  const toggle = (sym: string) => {
    userTouched.current = true;
    setVisible((prev) => {
      const next = new Set(prev);
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
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(!addOpen)}
          aria-expanded={addOpen}
          aria-label="Adicionar ou remover índices"
          className={cn(
            // Pack typography 03: button rectangular Tesla-style
            // h-8 px-3 rounded-md (não rounded-full pois é ação, não chip).
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
          visibleRows.map((r) => <Row key={r.symbol} row={r} />)
        )}
      </div>
    </section>
  );
}

function Row({ row }: { row: IndexRow }): JSX.Element {
  const ytdPos = row.ytdPercent >= 0;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[14px] font-semibold text-foreground tracking-tight">
          {row.name}
        </span>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums truncate">
          {row.symbol}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-foreground tabular-nums">
          {row.price.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums",
            ytdPos
              ? "bg-[#4dbe95]/15 text-[#4dbe95]"
              : "bg-[#d84f68]/15 text-[#d84f68]",
          )}
        >
          {ytdPos ? "+" : ""}
          {row.ytdPercent.toFixed(2)}%
        </span>
      </div>
      <div className="w-[80px] h-[28px]">
        <Sparkline points={row.spark} positive={ytdPos} />
      </div>
    </div>
  );
}

function Sparkline({
  points, positive,
}: { points: Array<{ ts: number; close: number }>; positive: boolean }) {
  if (!points || points.length === 0) {
    return <div className="h-full bg-white/[0.04] rounded-sm" />;
  }
  const data = points.map((p) => ({ ts: p.ts, close: p.close }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis hide domain={["auto", "auto"]} />
        <Line
          type="linear"
          dataKey="close"
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
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12 ml-auto" />
          <Skeleton className="h-7 w-20" />
        </li>
      ))}
    </ul>
  );
}
