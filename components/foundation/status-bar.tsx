"use client";

/**
 * StatusBar — barra de status inferior com info do mercado.
 *
 * Exibe:
 *   - Indicador (bolinha verde/cinza) — mercado aberto/fechado
 *   - Status textual (Mercado aberto/fechado)
 *   - Hora atual (HH:MM)
 *   - Data (PT-BR)
 *
 * Pode ser usado tanto na home quanto em /asset/[symbol].
 */

import { useEffect, useState } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function StatusBar({ className }: Props): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);

  // Evita hydration mismatch — só renderiza hora no client.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { statusText, isOpen, dateText } = now
    ? computeMarketStatus(now)
    : { statusText: "—", isOpen: false, dateText: "" };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isOpen ? "bg-[var(--positive)]" : "bg-muted-foreground/50"
        )}
        aria-hidden="true"
      />
      <span className="font-medium text-foreground/80">{statusText}</span>
      {now && (
        <>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{now.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </>
      )}
      {dateText && (
        <>
          <span aria-hidden="true">·</span>
          <span>{dateText}</span>
        </>
      )}
    </div>
  );
}

// B3: pregão 10:00–17:30 (horário de Brasília), dias úteis.
function computeMarketStatus(d: Date): {
  statusText: string;
  isOpen: boolean;
  dateText: string;
} {
  // UTC offset SP = -3 (sem DST desde 2019).
  const spString = d.toLocaleString("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  // Parse simples.
  const match = spString.match(
    /(\w+),\s(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/
  );
  if (!match) return { statusText: "Mercado fechado", isOpen: false, dateText: "" };

  const [, wday, mm, dd, yyyy, hh, mn] = match;
  const weekday = wday;
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const hour = parseInt(hh, 10);
  const minute = parseInt(mn, 10);
  const year = parseInt(yyyy, 10);
  const minutesOfDay = hour * 60 + minute;

  // Dias não-úteis: fds.
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  // Feriados nacionais principais (fixos, sem移动iveis): poderia
  // puxar de uma lib externa no futuro. Por ora, lista simplificada.
  const isHoliday = isBrazilianHoliday(day, month);

  const isOpen =
    !isWeekend &&
    !isHoliday &&
    minutesOfDay >= 10 * 60 &&
    minutesOfDay <= 17 * 60 + 30;

  const dateText = `${day.toString().padStart(2, "0")}/${month
    .toString()
    .padStart(2, "0")}/${year}`;

  return {
    statusText: isOpen ? "Mercado aberto" : "Mercado fechado",
    isOpen,
    dateText,
  };
}

function isBrazilianHoliday(day: number, month: number): boolean {
  // Feriados nacionais fixos (simplificado).
  const fixed = [
    [1, 1],   // Confraternização
    [21, 4],  // Tiradentes
    [1, 5],   // Dia do Trabalho
    [7, 9],   // Independência
    [12, 10], // N.Sra Aparecida
    [2, 11],  // Finados
    [15, 11], // Proclamação
    [25, 12], // Natal
  ];
  return fixed.some(([d, m]) => d === day && m === month);
}
