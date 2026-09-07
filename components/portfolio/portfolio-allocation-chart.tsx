"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronDown, PieChart as PieChartIcon } from "lucide-react";

import { Skeleton } from "@/components/foundation/skeleton";
import { CHART_PALETTE } from "@/lib/chart-palette";
import { cn } from "@/lib/utils";

type Holding = {
  symbol: string;
  sector: string | null;
  positionValue: number;
};

type Props = {
  holdings: Holding[];
  loading?: boolean;
  flush?: boolean;
};

type Mode = "sector" | "ticker";

type Slice = {
  name: string;
  value: number;
  weight: number;
};

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "sector", label: "Setor" },
  { id: "ticker", label: "Ticker" },
];

const COLORS = [
  CHART_PALETTE.primary,
  CHART_PALETTE.positive,
  CHART_PALETTE.amber,
  CHART_PALETTE.purple,
  CHART_PALETTE.cyan,
  CHART_PALETTE.pink,
  CHART_PALETTE.muted,
];

export function PortfolioAllocationChart({ holdings, loading, flush }: Props): JSX.Element {
  const [mode, setMode] = useState<Mode>("sector");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const slices = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const holding of holdings) {
      const key = mode === "sector" ? holding.sector || "Outros" : holding.symbol;
      grouped.set(key, (grouped.get(key) ?? 0) + Math.max(holding.positionValue, 0));
    }
    const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);
    return [...grouped.entries()]
      .map(([name, value]) => ({ name, value, weight: total > 0 ? value / total : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, mode]);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const activeLabel = MODES.find((item) => item.id === mode)?.label ?? "Setor";

  return (
    <section className={cn("rounded-2xl border border-white/10 bg-[#101116] p-5 h-full min-h-0 flex flex-col", flush && "border-0 bg-transparent p-0")} aria-labelledby="portfolio-allocation-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="portfolio-allocation-title" className="text-[15px] font-semibold tracking-tight text-foreground">
          Portfolio allocation
        </h2>
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-white/[0.08]"
          >
            {activeLabel}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} strokeWidth={2} />
          </button>
          {open && (
            <div role="listbox" aria-label="Tipo de composição" className="absolute right-0 top-10 z-30 min-w-32 rounded-lg border border-white/10 bg-[#15151a] p-1 shadow-xl">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={mode === item.id}
                  onClick={() => { setMode(item.id); setOpen(false); }}
                  className={cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[12px] transition-colors hover:bg-white/[0.06]", mode === item.id ? "text-foreground" : "text-muted-foreground/70")}
                >
                  {item.label}
                  {mode === item.id && <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex-1 min-h-0">
        {loading ? <AllocationSkeleton /> : holdings.length === 0 ? <EmptyAllocation /> : slices.length === 0 ? <EmptyAllocation /> : (
          <div className="flex h-full min-h-56 flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="relative h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive animationDuration={700}>
                    {slices.map((slice, index) => <Cell key={slice.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<AllocationTooltip />} wrapperStyle={{ outline: "none" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-muted-foreground/70">Total</span>
                <span className="mt-1 text-[16px] font-semibold tabular-nums text-foreground">{formatBRL(total)}</span>
              </div>
            </div>
            <ul className="grid w-full max-w-xs grid-cols-1 gap-2">
              {slices.slice(0, 7).map((slice, index) => (
                <li key={slice.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-foreground" title={slice.name}>{slice.name}</span>
                  <span className="tabular-nums text-muted-foreground/70">{(slice.weight * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function AllocationTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Slice }> }): JSX.Element | null {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return <div className="rounded-md border border-white/15 bg-[#0d0d11] px-3 py-2 shadow-xl"><p className="text-[12px] font-medium text-foreground">{slice.name}</p><p className="mt-1 text-[12px] tabular-nums text-foreground">{formatBRL(slice.value)} · {(slice.weight * 100).toFixed(1)}%</p></div>;
}

function AllocationSkeleton(): JSX.Element {
  return <div className="flex h-full min-h-56 items-center justify-center gap-8"><Skeleton className="h-56 w-56 rounded-full" /><div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" /></div></div>;
}

function EmptyAllocation(): JSX.Element {
  return <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 text-center"><PieChartIcon className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} /><p className="text-[14px] text-foreground">Sem dados de composição.</p><p className="text-[12px] text-muted-foreground/70">Adicione ativos para visualizar a divisão do portfolio.</p></div>;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
