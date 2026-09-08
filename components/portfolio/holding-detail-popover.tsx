"use client";

/**
 * HoldingDetailPopover — popover que expande abaixo do card de um holding
 * com informações detalhadas da posição:
 *
 *   - Data de compra
 *   - Preço médio
 *   - Quantidade de ações
 *   - Valor atual da posição
 *   - Retorno absoluto + % desde a compra
 *   - Mini-gráfico de linha com a evolução do ativo no range atual
 *
 * Aparece como dropdown embaixo do card, animado com framer-motion.
 */

import { useMemo } from "react";
import type { JSX } from "react";
import { motion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

import { CHART_COLORS } from "@/lib/chart-theme";

type Candle = { ts: number; close: number };

type Props = {
  holding: {
    symbol: string;
    qty: number;
    avgPrice: number;
    purchasedAt: number;
    price: number | null;
    positionValue: number;
    positionReturn: number | null;
    positionReturnPct: number | null;
    candles: Candle[];
  };
};

export function HoldingDetailPopover({ holding }: Props): JSX.Element {
  const chartData = useMemo(
    () => holding.candles.map((c, i) => ({ index: i, ts: c.ts, value: c.close })),
    [holding.candles],
  );

  const retPositive = (holding.positionReturn ?? 0) >= 0;
  const retColor = retPositive ? CHART_COLORS.seriesPositive : CHART_COLORS.seriesNegative;
  const retFillId = `holding-popover-fill-${holding.symbol}-${retPositive ? "up" : "down"}`;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="overflow-hidden"
      // Impede propagação de clique: clicar no popover não deve fechar + reabrir.
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-t border-white/[0.06] px-5 py-4">
        {/* Linha 1: data de compra, preço médio, qty */}
        <div className="grid grid-cols-3 gap-4">
          <DetailField
            label="Data de compra"
            value={formatDate(holding.purchasedAt)}
          />
          <DetailField
            label="Preço médio"
            value={holding.avgPrice.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
          <DetailField
            label="Quantidade"
            value={formatQty(holding.qty)}
          />
        </div>

        {/* Linha 2: valor atual + retorno (absoluto + %) */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <DetailField
            label="Valor atual"
            value={holding.positionValue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
              Retorno desde a compra
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="text-[16px] font-semibold tabular-nums"
                style={{ color: retColor }}
              >
                {(holding.positionReturn ?? 0) >= 0 ? "+" : "−"}
                {Math.abs(holding.positionReturn ?? 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {holding.positionReturnPct != null && (
                <span
                  className="text-[12px] tabular-nums font-medium"
                  style={{ color: retColor, opacity: 0.85 }}
                >
                  ({retPositive ? "+" : "−"}
                  {Math.abs(holding.positionReturnPct).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mini gráfico de linha */}
        <div className="mt-4 h-[80px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={retFillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={retColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={retColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["auto", "auto"]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={retColor}
                  strokeWidth={1.5}
                  fill={`url(#${retFillId})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground/60">
              Sem dados históricos no range atual
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-[13px] tabular-nums text-foreground font-medium">
        {value}
      </div>
    </div>
  );
}

function formatDate(epochSec: number): string {
  if (!epochSec || Number.isNaN(epochSec)) return "—";
  // DB guarda em segundos. Se vier em ms (timestamp JS) por algum motivo,
  // detecta e normaliza.
  const ms = epochSec > 1e12 ? epochSec : epochSec * 1000;
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatQty(qty: number): string {
  if (qty >= 1 && Number.isInteger(qty)) {
    return qty.toLocaleString("pt-BR");
  }
  return qty.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}
