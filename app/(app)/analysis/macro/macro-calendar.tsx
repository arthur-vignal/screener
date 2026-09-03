"use client";

/**
 * MacroCalendar — card 4 de Macro tab.
 *
 * Layout inspirado no print 3 do chart-pack-references (Fey mobbin).
 * Adaptado pra BR + simplificado pra MVP com dados hardcoded.
 *
 * Estrutura:
 *   1. Header com "Calendário econômico" + "Today" + setas < >
 *   2. Tabela com colunas: Evento | Ccy | Previous | Actual | Forecast |
 *      Chart sparkline | Date/time | Impact
 *   3. Linha "Today" (Released — verde) com Actual destacado
 *   4. Linha divisora sutil
 *   5. Linha "Upcoming" (futuro — TBA laranja)
 *
 * Quando evento ainda não aconteceu: Actual = "TBA" laranja;
 * quando já aconteceu: Actual = "Released" verde.
 *
 * Impact levels (1-5) renderizados com:
 *   - Texto "5 / 5" / "3 / 5" como pre-label
 *   - 5 bars crescentes 1-5 do lado, brancas a 70% opacity (active) vs
 *     15% (inactive)
 *
 * Charts inline: "—" por enquanto (dados de candle não temos).
 *
 * Decisão: data hardcoded MVP, atualizar via cron mensal.
 * Pós-MVP: scraping BCB / scraping de calendário econômico de portais.
 */

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type CalendarEvent = {
  date: string; // ISO
  time: string; // ex: "08:00"
  name: string;
  country: string;
  flag: string;
  currency: string;
  previous: number | null;
  forecast: number | null;
  /** quanto maior, mais impacto no mercado */
  impact: 1 | 2 | 3 | 4 | 5;
};

/**
 * MVP hardcoded — eventos macro BR de maior impacto.
 * `isPast` é derivado de `date < now()` no client.
 */
const EVENTS: CalendarEvent[] = [
  {
    date: "2026-09-03", time: "08:00",
    name: "Balança comercial — Agosto",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 6.7, forecast: 7.1, impact: 3,
  },
  {
    date: "2026-09-10", time: "08:00",
    name: "IPCA — Inflação 12m",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 4.31, forecast: 4.20, impact: 5,
  },
  {
    date: "2026-09-15", time: "09:00",
    name: "IBC-Br — Atividade econômica (proxy PIB)",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 0.9, forecast: 0.5, impact: 3,
  },
  {
    date: "2026-09-17", time: "08:30",
    name: "COPOM — Decisão SELIC meta",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 15.00, forecast: 14.75, impact: 5,
  },
  {
    date: "2026-09-25", time: "08:00",
    name: "Desemprego (PNAD)",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 7.1, forecast: 7.0, impact: 4,
  },
  {
    date: "2026-10-08", time: "08:00",
    name: "Produção industrial (Indústria Geral)",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 1.2, forecast: null, impact: 2,
  },
  {
    date: "2026-10-15", time: "08:00",
    name: "Vendas no varejo (PMC)",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 0.6, forecast: 0.7, impact: 2,
  },
];

export function MacroCalendar(): JSX.Element {
  // Página atual (mock — não tem dia selecionado real no MVP).
  const [page, setPage] = useState(0);
  const visible = EVENTS.slice(page * 5, page * 5 + 5);
  const hasMore = (page + 1) * 5 < EVENTS.length;
  const hasPrev = page > 0;

  // Split Hoje (passado) vs Upcoming (futuro), baseado em client time.
  // Server side 'now' é do build — queremos client side pra não
  // flash de conteúdo errado.
  const now = new Date();
  const past = visible.filter((e) => isPast(e, now));
  const upcoming = visible.filter((e) => !isPast(e, now));

  return (
    <section
      className="rounded-2xl border border-white/5 bg-[#101116] overflow-hidden"
      aria-label="Calendário econômico"
    >
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="text-[12px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/85">
            Calendário econômico
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground/70">
            Eventos macro BR · 30 dias à frente
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-[12px] text-foreground pr-1.5 tabular-nums">
            {EVENTS.length > 0
              ? new Date(EVENTS[0]!.date).toLocaleDateString("pt-BR", {
                  month: "short", day: "2-digit",
                })
              : "—"}
          </span>
          <NavButton
            direction="prev"
            disabled={!hasPrev}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          />
          <NavButton
            direction="next"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
          />
        </div>
      </header>

      {/* Column headers */}
      <div className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_1fr_1.5fr_auto] gap-3 px-6 pt-2 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold border-b border-white/[0.04]">
        <div>Evento</div>
        <div>Ccy</div>
        <div>Prev.</div>
        <div>Atual</div>
        <div>Forecast</div>
        <div>Gráfico</div>
        <div>Quando</div>
        <div>Impacto</div>
      </div>

      {/* Today (passado, Realizado) */}
      {past.length > 0 && (
        <>
          <SectionLabel>Today</SectionLabel>
          <div className="divide-y divide-white/[0.04]">
            {past.map((e) => (
              <CalendarRow key={`p-${e.date}-${e.time}`} event={e} status="released" />
            ))}
          </div>
        </>
      )}

      {/* Divider subtle between Today and Upcoming */}
      {past.length > 0 && upcoming.length > 0 && (
        <div className="mx-6 my-3 h-px bg-white/[0.04]" />
      )}

      {/* Upcoming (futuro, TBA) */}
      {upcoming.length > 0 && (
        <>
          <SectionLabel accent="warning">Upcoming</SectionLabel>
          <div className="divide-y divide-white/[0.04]">
            {upcoming.map((e) => (
              <CalendarRow key={`u-${e.date}-${e.time}`} event={e} status="upcoming" />
            ))}
          </div>
        </>
      )}

      {past.length === 0 && upcoming.length === 0 && (
        <div className="px-6 py-10 text-center text-[13px] text-muted-foreground/85">
          Sem eventos próximos.
        </div>
      )}
    </section>
  );
}

function NavButton({
  direction, disabled, onClick,
}: { direction: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Anterior" : "Próximo";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={cn(
        "p-1.5 rounded-md bg-white/[0.04] border border-white/10",
        "hover:bg-white/[0.08] transition-colors",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/30",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function SectionLabel({
  children, accent = "muted",
}: { children: React.ReactNode; accent?: "muted" | "warning" }) {
  return (
    <div
      className={cn(
        "px-6 pt-4 pb-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold",
        accent === "warning" ? "text-[#fb923c]" : "text-muted-foreground/85",
      )}
    >
      {children}
    </div>
  );
}

function CalendarRow({
  event, status,
}: { event: CalendarEvent; status: "released" | "upcoming" }) {
  return (
    <div className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_1fr_1.5fr_auto] items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base leading-none" aria-hidden>{event.flag}</span>
        <span className="text-[13px] font-medium text-foreground truncate">
          {event.name}
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
        {event.currency}
      </span>
      <span className="text-[12px] tabular-nums text-muted-foreground/85">
        {event.previous != null ? `${event.previous.toFixed(2)}%` : "N/A"}
      </span>
      <span
        className={cn(
          "text-[12px] tabular-nums font-medium",
          status === "released"
            ? "text-[#4dbe95]" // Released (verdinho)
            : "text-[#fb923c]", // TBA (laranja/warning)
        )}
      >
        {status === "released" ? "Realizado" : "TBA"}
      </span>
      <span className="text-[12px] tabular-nums text-muted-foreground/85">
        {event.forecast != null ? `${event.forecast.toFixed(2)}%` : "—"}
      </span>
      <span className="text-[11px] text-muted-foreground/50 tabular-nums">
        —
      </span>
      <div className="flex flex-col text-[12px] leading-tight">
        <span className="text-foreground tabular-nums">{event.time}</span>
        <span className="text-[10px] text-muted-foreground/70">
          {new Date(event.date).toLocaleDateString("pt-BR", {
            day: "2-digit", month: "short",
          })}
        </span>
      </div>
      <ImpactBars level={event.impact} />
    </div>
  );
}

function ImpactBars({ level }: { level: 1 | 2 | 3 | 4 | 5 }): JSX.Element {
  return (
    <div
      className="flex items-end gap-[2px]"
      role="img"
      aria-label={`Impacto ${level} de 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-sm",
            i <= level ? "bg-foreground/70" : "bg-foreground/15",
          )}
          style={{ height: `${4 + i * 2}px` }}
        />
      ))}
    </div>
  );
}

function isPast(event: CalendarEvent, now: Date): boolean {
  // Comparação por data local — usa o mesmo event.date às event.time.
  const [y, m, d] = event.date.split("-").map(Number);
  const [hh, mm] = event.time.split(":").map(Number);
  const eventDate = new Date(y!, (m ?? 1) - 1, d!, hh ?? 0, mm ?? 0);
  return eventDate.getTime() < now.getTime();
}
