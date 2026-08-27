"use client";

/**
 * ChartPeriodSelector — seletor de período reutilizável pra gráficos
 * que sofrem com outliers/picos que comprimem a escala.
 *
 * Tem 4 opções pre-definidas + 1 custom (range de anos):
 *   - 1y, 3y, 5y, max — botões rápidos
 *   - Custom — 2 selects de ano (start, end) que aplicam ao filtro
 *
 * Props:
 *   value: { startYear: number | null; endYear: number | null }
 *     - startYear/endYear null = sem filtro (mostra tudo)
 *     - senão filtra history entre [startYear, endYear]
 *   onChange: callback quando o usuário muda o período
 *   minYear: ano mínimo permitido (default: 2010)
 *   maxYear: ano máximo permitido (default: ano corrente)
 *   dataLength: quantos pontos tem o histórico (ex: 16) — usado pra
 *     desabilitar "1y" se não houver dados suficientes
 */

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type PeriodRange = {
  startYear: number | null;
  endYear: number | null;
};

type Preset = "1y" | "3y" | "5y" | "max" | "custom";

type Props = {
  value: PeriodRange;
  onChange: (range: PeriodRange) => void;
  minYear?: number;
  maxYear?: number;
  dataLength?: number;
};

const PRESETS: Array<{ key: Preset; label: string; years: number | null }> = [
  { key: "1y", label: "1a", years: 1 },
  { key: "3y", label: "3a", years: 3 },
  { key: "5y", label: "5a", years: 5 },
  { key: "max", label: "máx", years: null },
];

export function ChartPeriodSelector({
  value,
  onChange,
  minYear = 2010,
  maxYear = new Date().getFullYear(),
  dataLength = 16,
}: Props) {
  const [openCustom, setOpenCustom] = useState(false);
  const currentYear = maxYear;

  // Determina qual preset tá ativo (baseado no range atual)
  const activePreset = (() => {
    if (value.startYear == null && value.endYear == null) return "max" as Preset;
    const span =
      (value.endYear ?? currentYear) - (value.startYear ?? minYear);
    if (span <= 1) return "1y" as Preset;
    if (span <= 3) return "3y" as Preset;
    if (span <= 5) return "5y" as Preset;
    return "custom" as Preset;
  })();

  function applyPreset(p: Preset) {
    setOpenCustom(false);
    if (p === "custom") {
      setOpenCustom(true);
      return;
    }
    const years = PRESETS.find((x) => x.key === p)?.years;
    if (years == null) {
      onChange({ startYear: null, endYear: null });
    } else {
      onChange({
        startYear: Math.max(minYear, currentYear - years + 1),
        endYear: currentYear,
      });
    }
  }

  // anos disponíveis (limitados pelo dataLength)
  const yearOptions: number[] = [];
  for (let y = minYear; y <= maxYear; y++) yearOptions.push(y);

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-md border border-white/10 bg-white/[0.04]">
      {PRESETS.map((p) => {
        // desabilita presets maiores que o dataLength
        const disabled =
          p.years != null && p.years > dataLength;
        const active = activePreset === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => !disabled && applyPreset(p.key)}
            disabled={disabled}
            className={`px-2.5 h-7 rounded text-[12px] transition-colors ${
              active
                ? "bg-foreground text-background"
                : disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground/85 hover:text-foreground"
            }`}
            title={
              disabled
                ? `Histórico insuficiente (${dataLength} anos)`
                : `Últimos ${p.years ?? "todos"} anos`
            }
          >
            {p.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => applyPreset("custom")}
        className={`px-2 h-7 rounded text-[12px] transition-colors flex items-center gap-1 ${
          activePreset === "custom"
            ? "bg-foreground text-background"
            : "text-muted-foreground/85 hover:text-foreground"
        }`}
        title="Período personalizado"
      >
        <Calendar className="h-3 w-3" />
      </button>

      {openCustom && (
        <>
          {/* Backdrop pra fechar */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpenCustom(false)}
            aria-hidden
          />
          <div className="absolute top-11 right-0 z-40 rounded-xl border border-white/10 bg-[#101116] shadow-2xl shadow-black/40 p-3 flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
                De
              </label>
              <select
                value={value.startYear ?? minYear}
                onChange={(e) =>
                  onChange({
                    startYear: Number(e.target.value),
                    endYear: value.endYear,
                  })
                }
                className="h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-[12px] text-foreground focus:outline-none focus:border-white/20"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-muted-foreground/40 mt-4">→</span>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
                Até
              </label>
              <select
                value={value.endYear ?? maxYear}
                onChange={(e) =>
                  onChange({
                    startYear: value.startYear,
                    endYear: Number(e.target.value),
                  })
                }
                className="h-8 px-2 rounded bg-white/[0.04] border border-white/10 text-[12px] text-foreground focus:outline-none focus:border-white/20"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setOpenCustom(false)}
              className="ml-1 mt-4 h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-[12px] hover:bg-white/[0.08] hover:border-white/20 transition-colors"
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Helper: filtra uma série de HistoryPoint por PeriodRange.
 * Não filtra se startYear e endYear forem null.
 */
export function filterByRange<T extends { endDate: string }>(
  series: T[],
  range: PeriodRange,
): T[] {
  if (range.startYear == null && range.endYear == null) return series;
  return series.filter((p) => {
    const y = Number(p.endDate?.slice(0, 4) ?? 0);
    if (range.startYear != null && y < range.startYear) return false;
    if (range.endYear != null && y > range.endYear) return false;
    return true;
  });
}
