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
 * Índices default. Símbolos brapi de cada índice B3:
 *   IBOV  = ^BVSP (Sao Paulo Bovespa Index)
 *   IFIX  = ^FIXB11 (Fixed Income Fund Index)
 *   IDIV  = ^IDIV (Dividend Index)
 *   BDRX  = ^BDRX (BDR Index)
 *   SMLL  = ^SMLL (Small Cap Index)
 *   IVBX  = ^IVBX-2 (Valor Index, index alternativo)
 *   IEE   = ^IEE (Electricity Index)
 *   IBXL  = ^IBXL-2 (B2B Index)
 *   IBRA  = ^IBRA (Brazil Broad Index)
 *   ICO2  = ?não disponível no brapi como símbolo simples
 *   IGC   = ?não disponível
 *
 * MVP: lista parcial hardcoded com YTD/sparkline vir do brapi.
 * Futuras iterações: buscar via /api/indexes ou /api/quote/{symbol}.
 */
const DEFAULT_INDICES: Array<{ symbol: string; name: string }> = [
  { symbol: "^BVSP",   name: "IBOVESPA" },
  { symbol: "^FIXB11", name: "IFIX"     },
  { symbol: "^IDIV",   name: "IDIV"     },
  { symbol: "^BDRX",   name: "BDRX"     },
  { symbol: "^SMLL",   name: "SMLL"     },
  { symbol: "^IVBX-2", name: "IVBX-2"   },
  { symbol: "^IEE",    name: "IEE"      },
  { symbol: "^IBXL-2", name: "IBXL-2"   },
  { symbol: "^IBRA",   name: "IBRA"     },
];

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

  // Fetch (MVP — usa /api/quote list. Quando brapi não tiver,
  // fallback para defaults hardcoded.)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const symbols = DEFAULT_INDICES.map((i) => i.symbol).join(",");
        const r = await fetch(`/api/quote?symbols=${symbols}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { rows?: IndexRow[] };
        if (cancelled) return;
        const rows = (data.rows ?? []).map((row, i) => ({
          ...row,
          name: DEFAULT_INDICES[i]?.name ?? row.symbol,
        }));
        setAll(rows);
      } catch {
        // deixa vazio
      } finally {
        if (!cancelled) setLoading(false);
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
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-md",
            "bg-white/[0.04] border border-white/10 text-foreground",
            "text-[12px] font-medium",
            "hover:bg-white/[0.08] hover:border-white/20 transition-colors",
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
