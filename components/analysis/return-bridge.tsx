"use client";

/**
 * ReturnBridge — waterfall decompondo o retorno total (B6 da spec
 * 2026-08-29).
 *
 *   retorno_total ≈ ΔLucro + ΔMúltiplo + Dividendos + Outros (resíduo)
 *
 * Resposta: "ganhei dinheiro com o negócio (ΔLucro), com reprecificação
 * (ΔMúltiplo), ou com proventos (Dividendos)?"
 *
 * Implementação: o `Bar` do recharts não tem waterfall nativo. Truque
 * padrão: criar bars com stackId fantasma pra "base" e a barra real
 * empilhada por cima, usando `errorBar` ou só 2 Bar empilhados. Aqui
 * vou usar a abordagem de 2 Bar empilhados:
 *   - Bar 1 "base" (invisível): sustenta a barra até o ponto de partida
 *   - Bar 2 "valor": mostra o componente, cor verde/vermelho/roxo
 *
 * Janela selecionável: 1Y / 3Y / 5Y. Default 5Y.
 */

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  computeReturnBridge,
  RETURN_BRIDGE_WINDOWS,
  type ReturnBridgeComponent,
  type ReturnBridgeInputPoint,
  type ReturnBridgeWindow,
  type ReturnBridgeResult,
} from "@/lib/analytics/return-bridge";
import { TimeXAxis } from "./analysis-utils";

type Props = {
  series: ReturnBridgeInputPoint[];
};

// ────────────────────────────────────────────────────────────────────────
// Waterfall data: cada barra vira 2 pontos (base invisível + valor).
// base = soma acumulada até o componente anterior, valor = componente.
// Acumulador anda pra esquerda/direita conforme o sinal do componente.
// ────────────────────────────────────────────────────────────────────────

type BarDatum = {
  label: string;
  base: number;
  value: number;
  top: number; // base + value
  kind: ReturnBridgeComponent["kind"];
  description: string;
};

function buildWaterfallData(components: ReturnBridgeComponent[]): BarDatum[] {
  const data: BarDatum[] = [];
  let running = 0;
  for (const c of components) {
    const base = c.value >= 0 ? running : running + c.value;
    data.push({
      label: c.label,
      base,
      value: Math.abs(c.value),
      top: base + Math.abs(c.value),
      kind: c.kind,
      description: c.description,
    });
    running += c.value;
  }
  // Barra final = soma (Total) — começa em 0, valor = soma acumulada.
  data.push({
    label: "Total",
    base: 0,
    value: Math.abs(running),
    top: Math.abs(running),
    kind: running >= 0 ? "positive" : "negative",
    description: `Retorno total: ${running >= 0 ? "+" : ""}${running.toFixed(1)}% no período.`,
  });
  return data;
}

function colorForKind(kind: ReturnBridgeComponent["kind"]): string {
  // Verde/laranja para positivo/negativo (lucro/múltiplo).
  // Roxo para dividendos (liberado em A5).
  // Azul claro (var(--primary)) reservado a macro — não usamos aqui.
  switch (kind) {
    case "positive":
      return "var(--positive)";
    case "negative":
      return "var(--negative)";
    case "dividend":
      return "#7c5cff"; // roxo
    default:
      return "var(--muted)";
  }
}

function formatPct(v: number): string {
  if (Math.abs(v) < 0.05) return "0,0%";
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(1)}%`;
}

// ────────────────────────────────────────────────────────────────────────

export function ReturnBridge({ series }: Props) {
  const [windowYears, setWindowYears] = useState<ReturnBridgeWindow>(5);

  const result = useMemo(
    () => computeReturnBridge(series, windowYears),
    [series, windowYears],
  );

  const data = useMemo(() => buildWaterfallData(result.components), [result]);

  // ── Empty state ──────────────────────────────────────────────────────
  if (result.insufficient || data.length === 0) {
    return (
      <Card className="bg-[var(--surface)] border-[var(--border)] p-5">
        <div className="text-sm text-foreground/70">
          Sem dados suficientes pra decompor o retorno em {windowYearsY(windowYears)}.
          <br />
          <span className="text-xs text-foreground/55">
            É preciso histórico de EPS e P/L com pelo menos um ponto no início da
            janela. Stats-history da brapi cobre ~{series.length || 0} quarters.
          </span>
        </div>
      </Card>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  const dominatedBy = dominantDriver(result.components);
  const total = result.totalReturn;

  return (
    <Card className="bg-[var(--surface)] border-[var(--border)] p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-foreground/60 text-[13px] font-semibold tracking-tight mb-1">
              <GitBranch className="size-3.5" />
              Ponte de retorno
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[28px] font-bold tabular-nums tracking-tight text-foreground">
                {formatPct(total)}
              </span>
              <span className="text-[12px] text-foreground/55 tabular-nums">
                {windowYearsY(windowYears)} · {result.startDate} → {result.endDate}
              </span>
            </div>
            {dominatedBy && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                <span className="text-foreground/60">dominante</span>
                <span className="font-semibold text-foreground">{dominatedBy.label}</span>
                <span className="text-foreground/70 tabular-nums">{formatPct(dominatedBy.value)}</span>
              </div>
            )}
          </div>

          <WindowSelector value={windowYears} onChange={setWindowYears} />
        </header>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(238,239,241,0.7)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{ fill: "rgba(238,239,241,0.7)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.10)" />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as BarDatum | undefined;
                  if (!d) return null;
                  const sign = d.kind === "negative" ? "−" : "+";
                  const value = d.value * (d.kind === "negative" ? -1 : 1);
                  return (
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs shadow-md max-w-[260px]">
                      <div className="font-semibold text-foreground mb-1">
                        {d.label}
                      </div>
                      <div className="text-foreground/70 mb-1">
                        <span className="tabular-nums text-foreground font-semibold">
                          {sign}
                          {Math.abs(value).toFixed(2)}%
                        </span>{" "}
                        do retorno total
                      </div>
                      <div className="text-foreground/55 leading-relaxed">
                        {d.description}
                      </div>
                    </div>
                  );
                }}
              />

              {/* Base invisível — sustenta a barra a partir do acumulado */}
              <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
              {/* Valor visível */}
              <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={i} fill={colorForKind(d.kind)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────────────────────────────

function dominantDriver(components: ReturnBridgeComponent[]): ReturnBridgeComponent | null {
  let best: ReturnBridgeComponent | null = null;
  for (const c of components) {
    if (c.label === "Total") continue;
    if (!best || Math.abs(c.value) > Math.abs(best.value)) best = c;
  }
  return best;
}

function windowYearsY(y: number): string {
  if (y === 1) return "1 ano";
  if (y === 3) return "3 anos";
  return "5 anos";
}

function WindowSelector({
  value,
  onChange,
}: {
  value: ReturnBridgeWindow;
  onChange: (v: ReturnBridgeWindow) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
      {RETURN_BRIDGE_WINDOWS.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={`px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
            value === y
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {windowYearsY(y)}
        </button>
      ))}
    </div>
  );
}
