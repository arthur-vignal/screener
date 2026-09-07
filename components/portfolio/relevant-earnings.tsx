"use client";

import { useMemo, useState } from "react";
import type { JSX } from "react";
import { CalendarDays, ChevronDown, Clock3 } from "lucide-react";
import useSWR from "swr";

import { Skeleton } from "@/components/foundation/skeleton";
import { TickerLogo } from "@/components/foundation/ticker-logo";

type Dividend = {
  paymentDate: string;
  rate: number | null;
  label: string | null;
};

type Event = {
  symbol: string;
  type: "dividend";
  label: string;
  date: string;
};

type Props = { symbols: string[] };

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export function RelevantEarnings({ symbols }: Props): JSX.Element {
  const [window, setWindow] = useState<"upcoming" | "recent">("upcoming");
  const uniqueSymbols = useMemo(() => [...new Set(symbols)], [symbols]);
  const key = uniqueSymbols.length > 0 ? uniqueSymbols.map((symbol) => `/api/asset/${symbol}/dividends`).join("|") : null;
  const { data, error, isLoading } = useSWR<Record<string, { dividends?: Dividend[] }>>(key, async () => {
    const entries = await Promise.all(uniqueSymbols.map(async (symbol) => {
      try { return [symbol, await fetchJson<{ dividends?: Dividend[] }>(`/api/asset/${symbol}/dividends`)] as const; }
      catch { return [symbol, { dividends: [] }] as const; }
    }));
    return Object.fromEntries(entries);
  }, { revalidateOnFocus: false, refreshInterval: 6 * 60 * 60 * 1000 });

  const events = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const all: Event[] = [];
    for (const symbol of uniqueSymbols) {
      for (const dividend of data?.[symbol]?.dividends ?? []) {
        const date = new Date(`${dividend.paymentDate}T00:00:00`);
        if (Number.isNaN(date.getTime())) continue;
        all.push({ symbol, type: "dividend", label: dividend.label || "Dividendo", date: dividend.paymentDate });
      }
    }
    return all.filter((event) => {
      const time = new Date(`${event.date}T00:00:00`).getTime();
      return window === "upcoming" ? time >= today.getTime() : time < today.getTime();
    }).sort((a, b) => window === "upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)).slice(0, 6);
  }, [data, uniqueSymbols, window]);

  return (
    <section className="h-full rounded-2xl border border-white/10 bg-[#101116] p-5" aria-labelledby="portfolio-calendar-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="portfolio-calendar-title" className="text-[15px] font-semibold tracking-tight text-foreground">Economic calendar</h2>
          <CalendarDays className="h-4 w-4 text-muted-foreground/70" strokeWidth={1.75} />
        </div>
        <div className="relative">
          <select aria-label="Janela do calendário" value={window} onChange={(event) => setWindow(event.target.value as typeof window)} className="h-8 appearance-none rounded-md border border-white/10 bg-white/[0.04] py-0 pl-3 pr-8 text-[12px] font-medium text-foreground outline-none hover:bg-white/[0.08]">
            <option value="upcoming">Upcoming</option>
            <option value="recent">Recent</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={2} />
        </div>
      </div>
      <div className="mt-4">
        {isLoading ? <CalendarSkeleton /> : error ? <CalendarError /> : events.length === 0 ? <CalendarEmpty window={window} /> : (
          <ul className="divide-y divide-white/[0.06]">
            {events.map((event) => <CalendarRow key={`${event.symbol}-${event.date}`} event={event} />)}
          </ul>
        )}
      </div>
    </section>
  );
}

function CalendarRow({ event }: { event: Event }): JSX.Element {
  return <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><TickerLogo symbol={event.symbol} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[12px] font-semibold text-foreground">{event.symbol}</span><span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-foreground">{event.label}</span></div><div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/70"><Clock3 className="h-3 w-3" strokeWidth={1.75} />{formatDate(event.date)}</div></div><div className="text-right text-[12px] tabular-nums text-foreground">{event.label}</div></li>;
}

function CalendarSkeleton(): JSX.Element { return <div className="space-y-4">{[0, 1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3"><Skeleton className="h-7 w-7 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-20" /></div><Skeleton className="h-3 w-12" /></div>)}</div>; }
function CalendarEmpty({ window }: { window: "upcoming" | "recent" }): JSX.Element { return <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center"><CalendarDays className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} /><p className="text-[14px] text-foreground">Nenhum evento {window === "upcoming" ? "próximo" : "recente"}.</p><p className="text-[12px] text-muted-foreground/70">O calendário usa as datas de proventos disponíveis para os ativos.</p></div>; }
function CalendarError(): JSX.Element { return <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center"><p className="text-[14px] text-foreground">Falha ao carregar o calendário.</p><p className="text-[12px] text-muted-foreground/70">Tente recarregar a página.</p></div>; }
function formatDate(date: string): string { return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
