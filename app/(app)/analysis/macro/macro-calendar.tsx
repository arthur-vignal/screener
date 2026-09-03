"use client";

/**
 * MacroCalendar — card 4 de Macro tab.
 *
 * Calendário econômico BR com eventos hardcoded (MVP).
 * Estrutura inspirada no print 3 do chart-pack-references.
 *
 * Decisão MVP: lista estática. Atualizar via cron mensal.
 * Pós-MVP: scraping bcb.gov.br/datas-e-horarios + parser.
 *
 * Coluna Impact mostra "5 barras" crescentes (1/3/5) — quanto mais
 * barras preenchidas, maior o impacto esperado no mercado.
 *
 * Status: "agendado" (futuro), "released" (passado com Actual),
 * "scheduled" (futuro). Visual: badge texto pequeno.
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
  impact: 1 | 2 | 3 | 4 | 5;
};

/**
 * Hardcoded MVP — eventos macro BR de maior impacto.
 * Em produção: scraping BCB / calendários econômicos.
 */
const EVENTS: CalendarEvent[] = [
  {
    date: "2026-09-10", time: "08:00",
    name: "IPCA — Inflação 12m",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 4.31, forecast: 4.20, impact: 5,
  },
  {
    date: "2026-09-17", time: "08:30",
    name: "COPOM — Decisão Selic",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 15.00, forecast: 14.75, impact: 5,
  },
  {
    date: "2026-09-24", time: "09:00",
    name: "IBC-Br — Atividade econômica",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 0.9, forecast: 0.5, impact: 3,
  },
  {
    date: "2026-10-01", time: "08:00",
    name: "PNAD — Desemprego",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 7.1, forecast: 7.0, impact: 4,
  },
  {
    date: "2026-10-08", time: "08:00",
    name: "IBGE — Produção industrial",
    country: "Brasil", flag: "🇧🇷", currency: "BRL",
    previous: 1.2, forecast: null, impact: 2,
  },
];

export function MacroCalendar(): JSX.Element {
  // Por simplicidade, começa no primeiro evento. Navegação `<>` mock
  // (não tem estado global de "dia selecionado").
  const [page, setPage] = useState(0);
  const visible = EVENTS.slice(page * 4, page * 4 + 4);
  const hasMore = (page + 1) * 4 < EVENTS.length;

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
            Eventos macro BR · próximos 30 dias
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-[12px] text-foreground pr-1.5">
            {EVENTS.length > 0
              ? new Date(EVENTS[0]!.date).toLocaleDateString("pt-BR", {
                  month: "short", day: "2-digit",
                })
              : "—"}
          </span>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Anterior"
            className="p-1.5 rounded-md bg-white/[0.04] border border-white/10 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Próximo"
            className="p-1.5 rounded-md bg-white/[0.04] border border-white/10 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_1.5fr_auto] gap-3 px-6 pt-2 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold border-b border-white/[0.04]">
        <div>Evento</div>
        <div>Ccy</div>
        <div>Prev.</div>
        <div>Atual</div>
        <div>Forecast</div>
        <div>Quando</div>
        <div>Impacto</div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {visible.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-muted-foreground/85">
            Sem eventos próximos.
          </div>
        ) : (
          visible.map((e, i) => <CalendarRow key={`${e.date}-${e.time}-${i}`} event={e} />)
        )}
      </div>
    </section>
  );
}

function CalendarRow({ event }: { event: CalendarEvent }): JSX.Element {
  return (
    <div className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_1.5fr_auto] items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors">
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
      <span className="text-[12px] tabular-nums text-muted-foreground/50">
        —
      </span>
      <span className="text-[12px] tabular-nums text-muted-foreground/85">
        {event.forecast != null ? `${event.forecast.toFixed(2)}%` : "—"}
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

function ImpactBars({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
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
