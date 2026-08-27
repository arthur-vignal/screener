/**
 * lib/deflator.ts — deflator IPCA pra CAPE e análises reais.
 *
 * Converte uma série de IPCA mensal (do /api/macro/ipca) em fator de
 * deflação entre duas datas. Usado pra calcular lucro deflacionado
 * no CAPE e outras métricas que precisam de base real.
 *
 * Fator de deflação: Π(1 + valor_i/100) para i entre data_início e data_fim.
 * O fator converte um valor nominal em valor real na data de referência.
 *
 * Exemplo: fator = 1.05 entre 2020 e 2025 → R$ 100 em 2020 nominal
 * vale R$ 95.24 (= 100/1.05) em reais de 2025.
 */

type IPCAMonth = { year: string; month: string; value: number };

/**
 * Calcula o fator de deflação entre dois anos, baseado em IPCA mensal.
 * Retorna 1 se não conseguir calcular.
 *
 * @param ipca        - série mensal (mais recente primeiro)
 * @param fromYear    - ano de partida (ex: 2020)
 * @param toYear      - ano de destino (ex: 2025)
 * @returns fator (ex: 1.18 = 18% de inflação acumulada entre 2020 e 2025)
 */
export function deflatorBetweenYears(
  ipca: IPCAMonth[],
  fromYear: number,
  toYear: number,
): number {
  if (fromYear === toYear) return 1;
  // garante ordem cronológica ascendente pra iterar
  const sorted = ipca.slice().sort((a, b) =>
    a.year !== b.year ? a.year.localeCompare(b.year) : a.month.localeCompare(b.month),
  );
  const startIdx = sorted.findIndex((r) => Number(r.year) >= fromYear);
  if (startIdx < 0) return 1;
  let factor = 1;
  for (let i = startIdx; i < sorted.length && Number(sorted[i].year) <= toYear; i++) {
    const r = sorted[i];
    if (Number.isFinite(r.value)) {
      factor *= 1 + r.value / 100;
    }
  }
  return factor;
}

/**
 * Calcula o IPCA acumulado em 12 meses (proxy de inflação anual corrente).
 * Retorna como percentual (ex: 4.87 = 4,87% a.a.).
 *
 * Útil pra mostrar "inflação 12m" sem precisar do BCB.
 */
export function ipca12m(ipca: IPCAMonth[]): number | null {
  // pega os 12 meses mais recentes
  const sorted = ipca.slice().sort((a, b) =>
    a.year !== b.year ? a.year.localeCompare(b.year) : a.month.localeCompare(b.month),
  );
  const last12 = sorted.slice(-12);
  if (last12.length < 12) return null;
  let factor = 1;
  for (const m of last12) {
    if (Number.isFinite(m.value)) factor *= 1 + m.value / 100;
  }
  return (factor - 1) * 100;
}
