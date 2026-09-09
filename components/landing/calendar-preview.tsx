"use client";

/**
 * CalendarPreview — preview SVG estática (sem Recharts) do card "Calendar".
 *
 * Layout tight: lista vertical de eventos macro (3 itens) + D-Day chip.
 */

import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  type: "macro" | "dividend";
  title: string;
  tag: string;
  dDay: string;
};

const ITEMS: Item[] = [
  { type: "macro", title: "Copom — decisão SELIC", tag: "SELIC", dDay: "D-2" },
  { type: "macro", title: "IPCA — leitura mensal", tag: "IPCA", dDay: "D-7" },
  { type: "dividend", title: "PETR4 — dividendo", tag: "DIV", dDay: "D-12" },
];

export function CalendarPreview() {
  return (
    <ul className="flex flex-col gap-3">
      {ITEMS.map((item) => (
        <li
          key={item.title}
          className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-b-0"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                item.type === "macro"
                  ? "bg-[#489ffa]/10 border border-[#489ffa]/35 text-[#489ffa]"
                  : "bg-white/[0.05] border border-white/10 text-foreground/85",
              )}
              aria-hidden="true"
            >
              <Clock3 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-foreground truncate">
                {item.title}
              </p>
              <p className="text-[10.5px] text-muted-foreground/60 uppercase tracking-[0.14em] mt-0.5">
                {item.tag}
              </p>
            </div>
          </div>
          <span className="text-[11px] tabular-nums font-medium text-muted-foreground/85 shrink-0">
            {item.dDay}
          </span>
        </li>
      ))}
    </ul>
  );
}
