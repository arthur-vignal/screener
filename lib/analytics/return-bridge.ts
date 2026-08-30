import type { EarningsYieldHistoryPoint } from "./earnings-yield-history";

/**
 * Tipo da entrada para o helper de ReturnBridge. Cada ponto carrega
 * os 3 ingredientes do retorno: preço, lucro (EPS LTM), múltiplo (P/L).
 *
 * Dados brapi disponíveis:
 *   - candles: preço por dia
 *   - stats-history: eps + trailingPE por quarter
 * Alinhamento: candle vira quarterly (último dia do quarter),
 * stats-history já é quarterly.
 */

export type ReturnBridgeInputPoint = {
  endDate: string; // YYYY-MM-DD
  price: number | null;
  epsLtm: number | null; // em R$ (já normalizado — brapi stats vem em R$)
  trailingPE: number | null;
};

export type ReturnBridgeComponent = {
  label: string; // "Δ Lucro" / "Δ Múltiplo" / "Dividendos" / "Cruzamento" / "Preço"
  value: number; // em % (decimal × 100)
  kind: "positive" | "negative" | "neutral" | "dividend";
  description: string; // tooltip
};

export type ReturnBridgeResult = {
  startDate: string;
  endDate: string;
  windowYears: number;
  startPrice: number | null;
  endPrice: number | null;
  startEps: number | null;
  endEps: number | null;
  startPE: number | null;
  endPE: number | null;
  dividendYieldTotal: number; // soma de proventos/preço ao longo da janela
  components: ReturnBridgeComponent[];
  priceReturn: number; // retorno de preço observado (sanity check)
  totalReturn: number; // retorno total observado = (1+priceRet)×(1+divYield)-1
  reconciliationGap: number; // soma componentes - totalReturn (sanity check, deve ser ~0)
  insufficient: boolean; // true se dados faltam
};

/**
 * Janelas suportadas (em anos).
 */
export const RETURN_BRIDGE_WINDOWS = [1, 3, 5] as const;
export type ReturnBridgeWindow = (typeof RETURN_BRIDGE_WINDOWS)[number];

/**
 * Sinais de dividendos ao longo do período (de DividendHistory ou similar).
 * Cada item: data (YYYY-MM-DD) e valor em R$/share.
 */
export type DividendSignal = {
  date: string;
  value: number; // R$ por share (JCP bruto + dividendos)
};

/**
 * Constrói a série quarterly alinhada de preço / EPS / P/L a partir dos
 * pontos disponíveis.
 *
 * Estratégia: stats-history vem quarterly com `eps` (R$) e `trailingPE`.
 * Pra alinhar, pegamos o último preço de cada quarter a partir do array
 * (se o caller tiver) — senão, o preço é inferido como `eps × trailingPE`
 * (consistente com a definição).
 */
export function buildReturnBridgeInput(
  statsHistory: Array<Record<string, unknown>> | null | undefined,
): ReturnBridgeInputPoint[] {
  if (!Array.isArray(statsHistory)) return [];
  const out: ReturnBridgeInputPoint[] = [];
  for (const row of statsHistory) {
    const endDate = String(row.endDate ?? "");
    if (!endDate) continue;
    const epsRaw = row.trailingEps;
    const peRaw = row.trailingPE;
    const priceRaw = row.price;
    const eps =
      typeof epsRaw === "number" && Number.isFinite(epsRaw) ? epsRaw : null;
    const pe =
      typeof peRaw === "number" && Number.isFinite(peRaw) && peRaw > 0
        ? peRaw
        : null;
    const price =
      typeof priceRaw === "number" && Number.isFinite(priceRaw) && priceRaw > 0
        ? priceRaw
        : null;
    out.push({ endDate, price, epsLtm: eps, trailingPE: pe });
  }
  return out;
}

/**
 * Soma proventos por share dentro de [startDate, endDate]. Aproximação
 * ingênua (sem J-curve nem divisor de "tipo") — pra BR, dividendYield da
 * brapi já entra líquido de IR em alguns casos; sem doc oficial a gente
 * trata como bruto. Documentado.
 */
export function sumDividendsInWindow(
  dividends: DividendSignal[],
  startDate: string,
  endDate: string,
): number {
  let sum = 0;
  for (const d of dividends) {
    if (d.date >= startDate && d.date <= endDate) sum += d.value;
  }
  return sum;
}

/**
 * Calcula a decomposição do retorno total de N anos:
 *
 *   retorno_total ≈ ΔLucro + ΔMúltiplo + Cross + Dividendos
 *
 * Onde:
 *   ΔLucro     = ln(epsEnd / epsStart)  (log p/ aditividade)
 *   ΔMúltiplo  = ln(peEnd  / peStart)
 *   Cross      = ln(1 + return_eps × return_pe)  [normalmente ~0]
 *   Dividendos = ln(1 + divYieldTotal)
 *   Preço      = ln(priceEnd / priceStart)
 *
 * Sanidade: ΔLucro + ΔMúltiplo + Cross + Dividendos ≈ Preço + Dividendos
 * quando os inputs são consistentes (preço = eps × pe).
 */
export function computeReturnBridge(
  series: ReturnBridgeInputPoint[],
  dividends: DividendSignal[],
  windowYears: number,
): ReturnBridgeResult {
  const insufficient = series.length < 2;

  // Pega o último ponto (mais recente) e o ponto "windowYears" antes.
  // Se não tem ponto antigo o suficiente, usa o primeiro disponível
  // (e marca insufficient=true para o caller decidir).
  const sortedAsc = [...series].sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );

  if (insufficient) {
    return {
      startDate: "",
      endDate: "",
      windowYears,
      startPrice: null,
      endPrice: null,
      startEps: null,
      endEps: null,
      startPE: null,
      endPE: null,
      dividendYieldTotal: 0,
      components: [],
      priceReturn: 0,
      totalReturn: 0,
      reconciliationGap: 0,
      insufficient: true,
      };
  }

  const end = sortedAsc[sortedAsc.length - 1];
  const endTime = new Date(end.endDate + "T00:00:00Z").getTime();
  const cutoff = endTime - windowYears * 365.25 * 24 * 3600 * 1000;

  // Procura o ponto mais próximo >= cutoff (primeiro dentro da janela).
  let startIdx = 0;
  for (let i = 0; i < sortedAsc.length; i++) {
    if (
      new Date(sortedAsc[i].endDate + "T00:00:00Z").getTime() >= cutoff
    ) {
      startIdx = i;
      break;
    }
  }
  const start = sortedAsc[startIdx];

  const startPrice = start.price;
  const endPrice = end.price;
  const startEps = start.epsLtm;
  const endEps = end.epsLtm;
  const startPE = start.trailingPE;
  const endPE = end.trailingPE;

  // Returns em decimal.
  const epsRet =
    startEps != null && endEps != null && startEps > 0
      ? endEps / startEps - 1
      : null;
  const peRet =
    startPE != null && endPE != null && startPE > 0
      ? endPE / startPE - 1
      : null;
  const priceRet =
    startPrice != null && endPrice != null && startPrice > 0
      ? endPrice / startPrice - 1
      : null;

  // Dividend yield total (sem reinvestimento).
  // `rate` da brapi é fração (ex: 0.05 = 5% do preço). Somar direto.
  const divSum = sumDividendsInWindow(dividends, start.endDate, end.endDate);
  const divYieldTotal = divSum; // já é fração

  // Em log: ln(1+r_preço) = ln(1+r_eps) + ln(1+r_pe) por definição
  // (preço = eps × pe → 1+r_preço = (1+r_eps)(1+r_pe)). Mas brapi pode
  // retornar pontos onde preço ≠ eps × pe (arredondamento, datas
  // diferentes). Quando isso acontece, surge um resíduo — é informação
  // não capturada pelos 3 componentes principais, e a gente exibe
  // como "Outros (resíduo)" no waterfall.
  const ln = (x: number) => Math.log(x);
  const dLucro = epsRet != null ? ln(1 + epsRet) : null;
  const dMultiplo = peRet != null ? ln(1 + peRet) : null;
  const dPreco = priceRet != null ? ln(1 + priceRet) : null;
  const dDividendos = ln(1 + divYieldTotal);

  const components: ReturnBridgeComponent[] = [];
  if (dLucro != null) {
    components.push({
      label: "Δ Lucro",
      value: dLucro * 100,
      kind: dLucro >= 0 ? "positive" : "negative",
      description:
        "Crescimento do lucro por ação no período. " +
        (dLucro >= 0 ? "Positivo = negócio entregou mais." : "Negativo = lucro caiu."),
    });
  }
  if (dMultiplo != null) {
    components.push({
      label: "Δ Múltiplo",
      value: dMultiplo * 100,
      kind: dMultiplo >= 0 ? "positive" : "negative",
      description:
        "Mudança do P/L (trailing). " +
        (dMultiplo >= 0
          ? "Positivo = reprecificação (mercado paga mais pelo mesmo lucro)."
          : "Negativo = reprecificação pra baixo."),
    });
  }
  if (dDividendos != null) {
    components.push({
      label: "Dividendos",
      value: dDividendos * 100,
      kind: "dividend",
      description:
        "Soma de proventos por ação no período, dividida pelo preço inicial. " +
        "Bruto (sem descontar IR).",
    });
  }

  // Resíduo = ln(1+r_preço) - ln(1+r_eps) - ln(1+r_pe) — diferença entre
  // preço observado e o que eps × pe prevê. Idealmente zero; quando não
  // é, mostramos como "Outros" pra dar crédito (ou culpa) honestamente.
  const residualLog =
    dPreco != null && dLucro != null && dMultiplo != null
      ? dPreco - dLucro - dMultiplo
      : null;
  if (residualLog != null && Math.abs(residualLog) > 0.01) {
    components.push({
      label: "Outros",
      value: residualLog * 100,
      kind: residualLog >= 0 ? "positive" : "negative",
      description:
        "Resíduo entre preço observado e eps × pe. Vem de inconsistência " +
        "temporal nos dados brapi (preço de um dia, EPS de outro).",
    });
  }

  // Total = exp(ΔLucro + ΔMúltiplo + Resíduo + Dividendos) - 1.
  const summed =
    (dLucro ?? 0) + (dMultiplo ?? 0) + (residualLog ?? 0) + dDividendos;
  const total = Math.exp(summed) - 1; // volta pro espaço %
  const totalReturn =
    priceRet != null ? (1 + priceRet) * (1 + divYieldTotal) - 1 : null;
  const reconciliationGap =
    totalReturn != null ? totalReturn - total : 0; // diferença entre fórmula e dado

  return {
    startDate: start.endDate,
    endDate: end.endDate,
    windowYears,
    startPrice,
    endPrice,
    startEps,
    endEps,
    startPE,
    endPE,
    dividendYieldTotal: divYieldTotal,
    components,
    priceReturn: (priceRet ?? 0) * 100,
    totalReturn: (totalReturn ?? 0) * 100,
    reconciliationGap: reconciliationGap * 100,
    insufficient: false,
  };
}

/**
 * Helper pra converter EarningsYieldHistoryPoint[] (já existente) em
 * ReturnBridgeInputPoint[]. Não usado direto no /analysis (que pega
 * stats-history bruto) — mas útil pro componente se precisar
 * reusar a série.
 */
export function fromEarningsHistory(
  series: EarningsYieldHistoryPoint[],
): ReturnBridgeInputPoint[] {
  return series.map((p) => ({
    endDate: p.endDate,
    price: p.price,
    epsLtm: p.epsLtm,
    trailingPE: p.trailingPE,
  }));
}
