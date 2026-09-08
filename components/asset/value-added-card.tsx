"use client";

/**
 * ValueAddedCard — Demonstração do Valor Adicionado (DVA) anual.
 *
 * Mostra os 3 últimos anos de DVA (16 anos disponíveis via `bundle.historicals.valueAdded`).
 * Componentes exibidos (todos % do valor adicionado a distribuir):
 *   - governo (impostos federais + estaduais + municipais)
 *   - financistas (juros + remuneração de capital de terceiros)
 *   - colaboradores (remuneração de equipe)
 *   - acionistas (dividendos + juros sobre capital próprio + retenção)
 *
 * Resposta da pergunta "quem ficou com o valor gerado pela empresa?"
 *
 * Empty state: 0 rows (token sem Pro, ou endpoint mudou).
 */

import type { JSX } from "react";
import { Building2, Landmark, Users, Wallet } from "lucide-react";

type ValueAddedRow = {
  endDate: string;
  grossAddedValue?: number | null;
  netAddedValue?: number | null;
  taxes?: number | null;
  federalTaxes?: number | null;
  stateTaxes?: number | null;
  municipalTaxes?: number | null;
  teamRemuneration?: number | null;
  remunerationOfThirdPartyCapitals?: number | null;
  dividends?: number | null;
  interestOnOwnEquity?: number | null;
  retainedEarningsOrLoss?: number | null;
};

type Props = {
  /** Série anual (decrescente: h[0]=mais recente). Aceita `Record<string, unknown>`
   *  pra não acoplar o componente ao shape exato do bundle. */
  valueAdded: Array<Record<string, unknown>>;
  className?: string;
};

function pickNum(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatCompactCurrency(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `R$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `R$${(v / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `R$${(v / 1e3).toFixed(0)}K`;
  return `R$${v.toFixed(0)}`;
}

function yearOf(endDate: string): number {
  return Number(endDate.slice(0, 4));
}

export function ValueAddedCard({ valueAdded, className }: Props): JSX.Element | null {
  if (valueAdded.length === 0) return null;

  // Mostra os 3 últimos anos — mais que isso polui o card.
  const rows: ValueAddedRow[] = valueAdded.slice(0, 3) as ValueAddedRow[];

  return (
    <div
      className={
        "rounded-xl bg-[#0d0d11] border border-white/[0.06] p-5 " +
        (className ?? "")
      }
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-foreground">
            Valor adicionado (DVA)
          </h3>
          <span className="inline-flex items-center justify-center h-5 px-2 rounded bg-white/[0.04] border border-white/10 text-[10px] font-semibold text-muted-foreground/70">
            quem ficou com o valor
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground/50 tabular-nums">
          fonte: brapi v2 · {valueAdded.length}a
        </div>
      </div>

      {/* Header de anos */}
      <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55 mb-2">
        <div />
        {rows.map((r) => (
          <div key={r.endDate} className="text-right tabular-nums">
            {yearOf(r.endDate)}
          </div>
        ))}
      </div>

      {/* Valor adicionado bruto */}
      <Row
        icon={<Building2 className="h-3.5 w-3.5" />}
        label="Valor adicionado bruto"
        rows={rows.map((r) => r.grossAddedValue ?? null)}
        format={formatCompactCurrency}
        highlight
      />
      <Row
        icon={<Wallet className="h-3.5 w-3.5" />}
        label="Valor adicionado líquido"
        rows={rows.map((r) => r.netAddedValue ?? null)}
        format={formatCompactCurrency}
      />

      <div className="my-3 border-t border-white/[0.06]" />

      {/* Distribuição (cada % = fração do VA a distribuir) */}
      <DistributionRow
        icon={<Landmark className="h-3.5 w-3.5" />}
        label="Governo (impostos)"
        rows={rows.map((r) =>
          [r.federalTaxes, r.stateTaxes, r.municipalTaxes].reduce<
            number | null
          >((acc, v) => {
            if (acc == null) return v ?? null;
            if (v == null) return acc;
            return acc + v;
          }, null) ?? r.taxes ?? null,
        )}
        totalByRow={rows.map((r) => r.netAddedValue ?? null)}
      />
      <DistributionRow
        icon={<Users className="h-3.5 w-3.5" />}
        label="Colaboradores"
        rows={rows.map((r) => r.teamRemuneration ?? null)}
        totalByRow={rows.map((r) => r.netAddedValue ?? null)}
      />
      <DistributionRow
        icon={<Wallet className="h-3.5 w-3.5" />}
        label="Financistas"
        rows={rows.map((r) => r.remunerationOfThirdPartyCapitals ?? null)}
        totalByRow={rows.map((r) => r.netAddedValue ?? null)}
      />
      <DistributionRow
        icon={<Building2 className="h-3.5 w-3.5" />}
        label="Acionistas (dividendos + JCP + retido)"
        rows={rows.map((r) =>
          [r.dividends, r.interestOnOwnEquity, r.retainedEarningsOrLoss].reduce<
            number | null
          >((acc, v) => {
            if (acc == null) return v ?? null;
            if (v == null) return acc;
            return acc + v;
          }, null),
        )}
        totalByRow={rows.map((r) => r.netAddedValue ?? null)}
      />
    </div>
  );
}

function Row({
  icon,
  label,
  rows,
  format,
  highlight,
}: {
  icon: JSX.Element;
  label: string;
  rows: Array<number | null>;
  format: (v: number) => string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 py-1.5">
      <div className="flex items-center gap-2 text-[11px] text-foreground/85">
        <span className="text-muted-foreground/60">{icon}</span>
        <span className={highlight ? "font-semibold" : ""}>{label}</span>
      </div>
      {rows.map((v, i) => (
        <div
          key={i}
          className={
            "text-right text-[12px] tabular-nums " +
            (highlight ? "font-semibold text-foreground" : "text-foreground/80")
          }
        >
          {v != null ? format(v) : "—"}
        </div>
      ))}
    </div>
  );
}

function DistributionRow({
  icon,
  label,
  rows,
  totalByRow,
}: {
  icon: JSX.Element;
  label: string;
  rows: Array<number | null>;
  totalByRow: Array<number | null>;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 py-1.5">
      <div className="flex items-center gap-2 text-[11px] text-foreground/70">
        <span className="text-muted-foreground/50">{icon}</span>
        <span>{label}</span>
      </div>
      {rows.map((v, i) => {
        const total = totalByRow[i];
        const pct =
          v != null && total != null && total > 0 ? (v / total) * 100 : null;
        return (
          <div
            key={i}
            className="text-right text-[12px] tabular-nums text-foreground/80"
          >
            {pct != null ? `${pct.toFixed(1)}%` : "—"}
          </div>
        );
      })}
    </div>
  );
}