"use client";

/**
 * PortfolioCalendar — eventos macro BCB + dividendos/JCP dos holdings,
 * agrupados por mês.
 *
 * Substitui o antigo RelevantEarnings, que só listava dividendos dos ativos
 * (e estava nomeado misleadingly como "earnings" sem ter earnings real).
 *
 * Fontes:
 *   - /api/macro/calendar — Copom (BCB), IPCA (IBGE), IBC-Br/IC-Br/IBCR (BCB).
 *     Datas reais oficiais. Cache 12h server-side.
 *   - /api/asset/[symbol]/dividends — dividendos e JCP por ativo.
 *
 * Layout:
 *   - Header: título "Calendar" + seletor Upcoming/Recent.
 *   - Lista agrupada por mês (header sticky do mês em sticky-style).
 *   - Cada row tem: ícone do tipo (logo do ativo OU badge do macro),
 *     label, data formatada pt-BR, referência (ex: "Agosto 2026").
 *   - Eventos macro usam cor azul #489ffa (mesmo padrão do projeto pra
 *     séries macro). Dividendos usam cor neutra com badge DIVIDENDO/JCP.
 */

import { useMemo, useState } from "react";
import type { JSX } from "react";
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock3,
  Landmark,
  TrendingUp,
} from "lucide-react";
import useSWR from "swr";

import { Skeleton } from "@/components/foundation/skeleton";
import { TickerLogo } from "@/components/foundation/ticker-logo";
import { cn } from "@/lib/utils";

type Dividend = {
  paymentDate: string;
  rate: number | null;
  label: string | null;
};

type MacroEvent = {
  id: string;
  date: string;
  time: string | null;
  kind: "copom" | "copom_minutes" | "ipca" | "ibcbr" | "icbr" | "ibcr";
  label: string;
  reference: string | null;
};

type CalendarResponse = {
  events: MacroEvent[];
  fetchedAt: number;
  source: "static+bcb-angular" | "fallback";
};

type CalendarEvent =
  | {
      kind: "macro";
      id: string;
      date: string;
      time: string | null;
      label: string;
      reference: string | null;
      macroKind: MacroEvent["kind"];
    }
  | {
      kind: "dividend";
      id: string;
      date: string;
      symbol: string;
      label: string;
    };

type Props = {
  symbols: string[];
  flush?: boolean;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

const MACRO_KIND_META: Record<
  MacroEvent["kind"],
  { icon: typeof Landmark; shortLabel: string }
> = {
  copom: { icon: Landmark, shortLabel: "SELIC" },
  copom_minutes: { icon: Landmark, shortLabel: "ATA" },
  ipca: { icon: TrendingUp, shortLabel: "IPCA" },
  ibcbr: { icon: TrendingUp, shortLabel: "IBC-Br" },
  icbr: { icon: TrendingUp, shortLabel: "IC-Br" },
  ibcr: { icon: TrendingUp, shortLabel: "IBCR" },
};

export function PortfolioCalendar({ symbols, flush }: Props): JSX.Element {
  const [window, setWindow] = useState<"upcoming" | "recent">("upcoming");
  const uniqueSymbols = useMemo(() => [...new Set(symbols)], [symbols]);

  // Dividendos: 1 request por símbolo (já cacheado server-side 6h).
  const dividendsKey = uniqueSymbols.length > 0
    ? uniqueSymbols.map((s) => `/api/asset/${s}/dividends`).join("|")
    : null;
  const { data: dividendsBySymbol, isLoading: divLoading, error: divError } =
    useSWR<Record<string, { dividends?: Dividend[] }>>(dividendsKey, async () => {
      const entries = await Promise.all(uniqueSymbols.map(async (symbol) => {
        try {
          return [symbol, await fetchJson<{ dividends?: Dividend[] }>(
            `/api/asset/${symbol}/dividends`,
          )] as const;
        } catch {
          return [symbol, { dividends: [] }] as const;
        }
      }));
      return Object.fromEntries(entries);
    }, { revalidateOnFocus: false, refreshInterval: 6 * 60 * 60 * 1000 });

  // Macro events: 1 request, cache 12h server-side.
  const { data: macroResp, isLoading: macroLoading, error: macroError } =
    useSWR<CalendarResponse>("/api/macro/calendar", fetchJson, {
      revalidateOnFocus: false,
      refreshInterval: 12 * 60 * 60 * 1000,
    });

  const events = useMemo<CalendarEvent[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    const out: CalendarEvent[] = [];

    // Macro events
    for (const m of macroResp?.events ?? []) {
      const ts = new Date(`${m.date}T00:00:00`).getTime();
      if (Number.isNaN(ts)) continue;
      const isUpcoming = ts >= todayTs;
      if ((window === "upcoming") !== isUpcoming) continue;
      out.push({
        kind: "macro",
        id: m.id,
        date: m.date,
        time: m.time,
        label: m.label,
        reference: m.reference,
        macroKind: m.kind,
      });
    }

    // Dividend events
    for (const symbol of uniqueSymbols) {
      const dividends = dividendsBySymbol?.[symbol]?.dividends ?? [];
      for (const d of dividends) {
        const ts = new Date(`${d.paymentDate}T00:00:00`).getTime();
        if (Number.isNaN(ts)) continue;
        const isUpcoming = ts >= todayTs;
        if ((window === "upcoming") !== isUpcoming) continue;
        out.push({
          kind: "dividend",
          id: `${symbol}-${d.paymentDate}-${d.label ?? "DIV"}`,
          date: d.paymentDate,
          symbol,
          label: d.label || "Dividendo",
        });
      }
    }

    return out.sort((a, b) =>
      window === "upcoming"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
    );
  }, [macroResp, dividendsBySymbol, uniqueSymbols, window]);

  const grouped = useMemo(() => groupByMonth(events, window), [events, window]);

  const loading = macroLoading || divLoading;
  const error = macroError && divError;

  return (
    <section
      className={cn(
        "h-full min-h-0 flex flex-col rounded-2xl fey-card p-5",
        flush && "rounded-none border-0 bg-transparent p-0",
      )}
      aria-labelledby="portfolio-calendar-title"
    >
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <h2
            id="portfolio-calendar-title"
            className="text-[15px] font-semibold tracking-tight text-foreground"
          >
            Calendar
          </h2>
          <CalendarDays className="h-4 w-4 text-muted-foreground/70" strokeWidth={1.75} />
        </div>
        <div className="relative">
          <select
            aria-label="Janela do calendário"
            value={window}
            onChange={(e) => setWindow(e.target.value as typeof window)}
            className="h-8 appearance-none rounded-md border border-white/10 bg-white/[0.04] py-0 pl-3 pr-8 text-[12px] font-medium text-foreground outline-none hover:bg-white/[0.08]"
          >
            <option value="upcoming">Upcoming</option>
            <option value="recent">Recent</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/70"
            strokeWidth={2}
          />
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 -mr-1">
        {loading ? (
          <CalendarSkeleton />
        ) : error ? (
          <CalendarError />
        ) : events.length === 0 ? (
          <CalendarEmpty window={window} />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ monthKey, label, items }) => (
              <div key={monthKey}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                    {label}
                  </span>
                  <span className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">
                    {items.length}
                  </span>
                </div>
                <ul className="divide-y divide-white/[0.06]">
                  {items.map((event) => (
                    <CalendarRow key={event.id} event={event} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Group by month ───────────────────────────────────────────────────────

function groupByMonth(
  events: CalendarEvent[],
  window: "upcoming" | "recent",
): Array<{ monthKey: string; label: string; items: CalendarEvent[] }> {
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const today = new Date();
  const map = new Map<string, CalendarEvent[]>();
  const order: string[] = [];

  for (const e of events) {
    const d = new Date(`${e.date}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(monthKey)) {
      order.push(monthKey);
      map.set(monthKey, []);
    }
    map.get(monthKey)!.push(e);
  }

  // Ordenar: upcoming → mês ascendente; recent → mês descendente.
  if (window === "recent") order.reverse();

  return order.map((monthKey) => {
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const suffix =
      year !== today.getFullYear()
        ? ` de ${year}`
        : "";
    return {
      monthKey,
      label: `${monthNames[month]}${suffix}`,
      items: map.get(monthKey)!,
    };
  });
}

// ─── Row ───────────────────────────────────────────────────────────────────

function CalendarRow({ event }: { event: CalendarEvent }): JSX.Element {
  if (event.kind === "macro") {
    const meta = MACRO_KIND_META[event.macroKind];
    const Icon = meta.icon;
    return (
      <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: "rgba(72,159,250,0.35)",
            backgroundColor: "rgba(72,159,250,0.10)",
            color: "#489ffa",
          }}
          aria-hidden="true"
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-foreground truncate">
              {event.label}
            </span>
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: "rgba(72,159,250,0.10)",
                color: "#489ffa",
              }}
            >
              {meta.shortLabel}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <Clock3 className="h-3 w-3" strokeWidth={1.75} />
            {formatDate(event.date)}
            {event.time ? ` · ${event.time}` : ""}
            {event.reference ? ` · Ref. ${event.reference}` : ""}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <TickerLogo symbol={event.symbol} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-foreground">
            {event.symbol}
          </span>
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground">
            {event.label}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <Banknote className="h-3 w-3" strokeWidth={1.75} />
          {formatDate(event.date)}
        </div>
      </div>
    </li>
  );
}

// ─── Skeleton / Empty / Error ──────────────────────────────────────────────

function CalendarSkeleton(): JSX.Element {
  return (
    <div className="space-y-5">
      {[0, 1].map((g) => (
        <div key={g} className="space-y-3">
          <Skeleton className="h-3 w-20" roundedMd />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CalendarEmpty({ window }: { window: "upcoming" | "recent" }): JSX.Element {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
      <CalendarDays className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
      <p className="text-[14px] text-foreground">
        Nenhum evento {window === "upcoming" ? "próximo" : "recente"}.
      </p>
      <p className="text-[12px] text-muted-foreground/70">
        {window === "upcoming"
          ? "Adicione ativos à carteira pra ver dividendos, ou aguarde os próximos Copom/IPCA."
          : "Os eventos recentes aparecem aqui após a divulgação."}
      </p>
    </div>
  );
}

function CalendarError(): JSX.Element {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
      <p className="text-[14px] text-foreground">Falha ao carregar o calendário.</p>
      <p className="text-[12px] text-muted-foreground/70">Tente recarregar a página.</p>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
