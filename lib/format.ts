/**
 * format.ts — formatadores centralizados pra UI do Sulfur.
 *
 * Regras (DESIGN_RULES.md §6):
 *   - Moeda: 2 casas decimais, símbolo R$, separador pt-BR
 *   - Percentual: 1 casa, com sinal explícito +/−
 *   - Múltiplo: 2 casas com sufixo "x"
 *   - Data: PT-BR (dd/mm/yyyy) pra datas completas, "mmm/aa" pra séries temporais
 *
 * Todos os formatadores recebem `number | null | undefined` e retornam string.
 * Nulos retornam "—" (sem espaço, sem texto extra) — o contexto da UI
 * é que decide se mostra explicação ao lado.
 */

const BR_LOCALE = "pt-BR";

export function compactBRL(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e12) return `${sign}R$ ${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}R$ ${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}R$ ${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}R$ ${(abs / 1e3).toFixed(1)}k`;
  return `${sign}R$ ${abs.toFixed(2)}`;
}

export function exactBRL(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(BR_LOCALE, {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(
  value: number | null | undefined,
  opts: { decimals?: number; withSign?: boolean } = {},
): string {
  const { decimals = 1, withSign = false } = opts;
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = withSign && pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(decimals)}%`;
}

export function formatPercentRaw(
  value: number | null | undefined,
  decimals = 1,
): string {
  // Quando o número já está em escala percentual (ex: 16.26 → "16,3%")
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

export function formatMultiple(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")}x`;
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(BR_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatYear(endDate: string | null | undefined): string {
  // endDate vem como "YYYY-MM-DD" — só queremos o ano
  if (!endDate) return "—";
  return endDate.slice(0, 4);
}

export function formatDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(BR_LOCALE);
}
