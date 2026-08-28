"use client";

/**
 * Delta — variação numérica com sinal redundante (cor + seta + sinal explícito).
 *
 * Regra (sulfur-ui-rules §3): cor sozinha não basta — daltonismo afeta ~8% dos homens.
 *   - Positivo: cor --positive + ArrowUp + "+" antes do número
 *   - Negativo: cor --negative + ArrowDown + sem "+" ou com "−"
 *   - Zero: muted, sem seta, sem "+"/"−"
 */

import { ArrowDown, ArrowUp } from "lucide-react";
import type { JSX } from "react";

export type DeltaSize = "sm" | "md" | "lg";

type Props = {
  value: number | null | undefined;
  /** Formatador customizado. Default: arredonda pra 2 casas + "%" se unit="percent" senão mantém. */
  format?: (v: number) => string;
  /** Unidade: "percent" adiciona "%" no final. */
  unit?: "percent" | "currency" | "number";
  /** Currency BRL/USD pra formatCurrency. */
  currency?: "BRL" | "USD";
  /** Sinal explícito antes do número. Default: true. */
  showSign?: boolean;
  /** Tamanho da fonte. Default: "sm". */
  size?: DeltaSize;
  /** Direção da seta invertida (down pra valor positivo = "queda" conceitual). Default: false. */
  inverted?: boolean;
  className?: string;
};

const sizeMap: Record<DeltaSize, { text: string; icon: string }> = {
  sm: { text: "text-[11px]", icon: "h-3 w-3" },
  md: { text: "text-[12px]", icon: "h-3.5 w-3.5" },
  lg: { text: "text-[14px]", icon: "h-4 w-4" },
};

export function Delta({
  value,
  format,
  unit,
  currency,
  showSign = true,
  size = "sm",
  inverted = false,
  className,
}: Props): JSX.Element | null {
  if (value == null || !Number.isFinite(value)) return null;

  const sizes = sizeMap[size];

  // Zero: muted, sem seta
  if (value === 0) {
    return (
      <span
        className={[
          "inline-flex items-center gap-1 tabular-nums",
          "text-muted-foreground",
          sizes.text,
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showSign ? "0" : ""}
        {unit === "percent" ? "%" : ""}
      </span>
    );
  }

  const isPositive = inverted ? value < 0 : value > 0;
  const sign = isPositive ? "+" : "−";
  const abs = Math.abs(value);

  let display: string;
  if (format) {
    display = format(value);
  } else if (unit === "percent") {
    display = `${abs.toFixed(2)}%`;
  } else if (unit === "currency") {
    display = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency ?? "BRL",
    }).format(abs);
  } else {
    display = abs.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const Icon = isPositive ? ArrowUp : ArrowDown;
  const colorClass = isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 tabular-nums",
        colorClass,
        sizes.text,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className={sizes.icon} strokeWidth={2} />
      {showSign ? sign : ""}
      {display}
    </span>
  );
}
