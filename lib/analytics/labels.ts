/**
 * lib/analytics/labels.ts
 *
 * PT-BR labels for derived metrics that Brapi's /api/v2/dictionary
 * doesn't cover. Spec §0: "Não manter tabela de tradução no código."
 * → dictionary é a fonte primária; isto é fallback pros campos que a
 * Brapi não documentou (margins, ratios puros).
 *
 * Always prefer `dictionary.byKey[X].label` when available; use these
 * constants only as fallback.
 *
 * Convention:
 *   - `label`: short title-cased display name, ≤ 32 chars
 *   - `description`: 1-2 sentence tooltip
 *   - `unit`: "BRL" | "%" | "x" (multiple) | "decimal" | "" (dimensionless)
 *   - `category`: which section of the asset page uses it
 */

export type LabelKey =
  // Section 2 — Valuation
  | "trailingPE"
  | "forwardPE"
  | "priceToBook"
  | "enterpriseValue"
  | "enterpriseToRevenue"
  | "enterpriseToEbitda"
  | "pegRatio"
  | "earningsPerShare"
  | "bookValue"
  // Section 3 — ROIC-WACC
  | "cleanNopat"
  | "roic"
  | "wacc"
  | "roicWaccSpread"
  | "costOfEquity"
  | "costOfDebt"
  // Section 4 — Quality
  | "accruals"
  | "cashConversion"
  | "fscore"
  // Section 5 — Capital
  | "netDebt"
  | "netDebtToEbitda"
  | "interestCoverage"
  // Section 6 — Proventos
  | "yieldLiquido"
  | "pctJCP"
  | "payoutSustainability"
  | "dividendStreakYears"
  // Section 7 — DVA
  | "valorAdicionadoPorFuncionario"
  | "remuneracaoMedia"
  | "cargaTributariaEfetiva"
  | "poderDeBarganha"
  // Section 8 — Risk
  | "beta"
  | "betaMercado"
  | "betaSetorial"
  | "betaIdiossincratico"
  | "drawdownMaximo"
  | "diasParaLiquidar"
  | "volRealizada21d"
  | "benchmark52WeekChange";

export type LabelEntry = {
  label: string;
  description: string;
  unit: "" | "%" | "x" | "BRL" | "decimal" | "anos" | "dias";
  category:
    | "valuation"
    | "rentabilidade"
    | "qualidade"
    | "capital"
    | "proventos"
    | "dva"
    | "risco";
};

export const LABELS: Record<LabelKey, LabelEntry> = {
  // ── Valuation ──
  trailingPE: {
    label: "P/L",
    description:
      "Preço dividido pelo lucro por ação dos últimos 12 meses. Indica quantos anos de lucro são precisos para recuperar o investimento pelo preço atual.",
    unit: "x",
    category: "valuation",
  },
  forwardPE: {
    label: "P/L projetado",
    description:
      "P/L usando projeções de lucro. Brapi não publica projeções, então este campo é frequentemente nulo.",
    unit: "x",
    category: "valuation",
  },
  priceToBook: {
    label: "P/VP",
    description:
      "Preço dividido pelo valor patrimonial por ação. Abaixo de 1,0 sugere que o mercado precifica a empresa abaixo do seu patrimônio líquido.",
    unit: "x",
    category: "valuation",
  },
  enterpriseValue: {
    label: "Valor da Firma (EV)",
    description:
      "Market cap + dívida líquida. Representa o custo teórico de aquisição da empresa.",
    unit: "BRL",
    category: "valuation",
  },
  enterpriseToRevenue: {
    label: "EV/Receita",
    description:
      "Valor da firma sobre receita dos últimos 12 meses. Útil para comparar empresas em diferentes alíquotas de IR.",
    unit: "x",
    category: "valuation",
  },
  enterpriseToEbitda: {
    label: "EV/EBITDA",
    description:
      "Valor da firma sobre EBITDA. Mostra quantos anos de geração operacional bruta são precisos para pagar o valor da firma.",
    unit: "x",
    category: "valuation",
  },
  pegRatio: {
    label: "PEG",
    description:
      "P/L dividido pelo crescimento esperado do lucro. <1 sugere crescimento barato; cobertura da Brapi é baixa e valores podem ser outliers.",
    unit: "x",
    category: "valuation",
  },
  earningsPerShare: {
    label: "LPA",
    description: "Lucro líquido atribuível aos controladores dividido pelo número de ações em circulação.",
    unit: "BRL",
    category: "valuation",
  },
  bookValue: {
    label: "VPA",
    description: "Patrimônio líquido dividido pelo número de ações. Valor contábil por ação.",
    unit: "BRL",
    category: "valuation",
  },

  // ── ROIC-WACC ──
  cleanNopat: {
    label: "NOPAT limpo",
    description:
      "Lucro operacional líquido de tributos após excluir itens não recorrentes. Usado como numerador do ROIC.",
    unit: "BRL",
    category: "rentabilidade",
  },
  roic: {
    label: "ROIC",
    description:
      "Retorno sobre capital investido. NOPAT limpo dividido por (PL + dívida líquida). Mede a eficiência da alocação de capital.",
    unit: "%",
    category: "rentabilidade",
  },
  wacc: {
    label: "WACC",
    description:
      "Custo médio ponderado de capital. Combina o custo do equity (curva DI + β × prêmio) e o custo da dívida após IR.",
    unit: "%",
    category: "rentabilidade",
  },
  roicWaccSpread: {
    label: "ROIC − WACC",
    description:
      "Spread entre o retorno sobre capital investido e o custo de capital. Positivo sustentado indica criação de valor; negativo persistente indica destruição.",
    unit: "%",
    category: "rentabilidade",
  },
  costOfEquity: {
    label: "Ke (custo do equity)",
    description:
      "Custo do capital próprio. Curva DI interpolada pela duration do negócio + β × prêmio de risco de mercado.",
    unit: "%",
    category: "rentabilidade",
  },
  costOfDebt: {
    label: "Kd (custo da dívida)",
    description:
      "Custo efetivo da dívida. Despesas financeiras anualizadas sobre o endividamento bruto médio.",
    unit: "%",
    category: "rentabilidade",
  },

  // ── Quality ──
  accruals: {
    label: "Accruals",
    description:
      "(Lucro líquido − caixa operacional) / ativo total. Altos accruals historicamente antecipam reversão de lucro.",
    unit: "%",
    category: "qualidade",
  },
  cashConversion: {
    label: "Conversão de caixa",
    description:
      "Free cash flow dividido pelo lucro líquido. >1 indica lucro de alta qualidade; <0,5 sinaliza alerta.",
    unit: "%",
    category: "qualidade",
  },
  fscore: {
    label: "Piotroski F-Score",
    description:
      "Pontuação 0-9 baseada em 9 sinais fundamentalistas (rentabilidade, alavancagem, eficiência). ≥7 é forte; ≤3 é fraco.",
    unit: "",
    category: "qualidade",
  },

  // ── Capital ──
  netDebt: {
    label: "Dívida líquida",
    description: "Dívida total menos caixa e equivalentes. Proxy do endividamento ajustado pela liquidez.",
    unit: "BRL",
    category: "capital",
  },
  netDebtToEbitda: {
    label: "Dívida líquida / EBITDA",
    description:
      "Anos de EBITDA para pagar a dívida líquida. <2 é confortável; >4 exige atenção.",
    unit: "x",
    category: "capital",
  },
  interestCoverage: {
    label: "Cobertura de juros",
    description:
      "EBIT dividido pelas despesas financeiras absolutas. >3 é confortável; <1,5 indica aperto.",
    unit: "x",
    category: "capital",
  },

  // ── Proventos ──
  yieldLiquido: {
    label: "Yield líquido",
    description:
      "Yield anual após imposto: dividendos são isentos; JCP paga 15% de IR na fonte. Ranking de pagadoras muda após esse ajuste.",
    unit: "%",
    category: "proventos",
  },
  pctJCP: {
    label: "% JCP",
    description:
      "Participação de JCP no total de proventos. Quanto maior, mais erosão fiscal no yield bruto.",
    unit: "%",
    category: "proventos",
  },
  payoutSustainability: {
    label: "Sustentabilidade",
    description:
      "Payout (dividendos + JCP) sobre lucro líquido. >80% levanta dúvida sobre consistência futura.",
    unit: "%",
    category: "proventos",
  },
  dividendStreakYears: {
    label: "Anos pagando",
    description: "Quantos anos consecutivos a empresa distribuiu algum provento.",
    unit: "anos",
    category: "proventos",
  },

  // ── DVA ──
  valorAdicionadoPorFuncionario: {
    label: "VA / funcionário",
    description:
      "Valor adicionado líquido dividido pelo número de funcionários. Produtividade em termos de riqueza gerada por cabeça.",
    unit: "BRL",
    category: "dva",
  },
  remuneracaoMedia: {
    label: "Remuneração média",
    description: "Folha total (encargos incluídos) dividida pelo número de funcionários.",
    unit: "BRL",
    category: "dva",
  },
  cargaTributariaEfetiva: {
    label: "Carga tributária efetiva",
    description: "Tributos sobre o valor adicionado distribuído. Captura ICMS, ISS, PIS/Cofins e folha.",
    unit: "%",
    category: "dva",
  },
  poderDeBarganha: {
    label: "Poder de barganha",
    description:
      "Valor adicionado líquido sobre receita. Mede quanto da receita é criação própria vs. repasse de insumo.",
    unit: "%",
    category: "dva",
  },

  // ── Risk ──
  beta: {
    label: "β",
    description:
      "Sensibilidade do retorno do ativo ao retorno do Ibovespa. >1 amplifica o mercado; <1 defende.",
    unit: "x",
    category: "risco",
  },
  betaMercado: {
    label: "β de mercado",
    description:
      "Componente do β explicado pela exposição ao mercado (Ibovespa). É o que se diversifica.",
    unit: "x",
    category: "risco",
  },
  betaSetorial: {
    label: "β setorial",
    description: "Componente do β explicado pela exposição ao subsetor. Diversificável dentro do subsetor.",
    unit: "x",
    category: "risco",
  },
  betaIdiossincratico: {
    label: "β idiossincrático",
    description: "Risco próprio da empresa. Não diversificável — é o prêmio pelo alfa.",
    unit: "x",
    category: "risco",
  },
  drawdownMaximo: {
    label: "Drawdown máx.",
    description: "Maior queda pico-a-vale em uma janela. Mede o sofrimento histórico no熊.",
    unit: "%",
    category: "risco",
  },
  diasParaLiquidar: {
    label: "Dias para liquidar",
    description:
      "Dias para sair de uma posição de X% do float ao volume médio diário. Útil em small caps.",
    unit: "dias",
    category: "risco",
  },
  volRealizada21d: {
    label: "Vol 21d",
    description: "Volatilidade realizada em janela de 21 dias úteis, anualizada.",
    unit: "%",
    category: "risco",
  },
  benchmark52WeekChange: {
    label: "Ibov 52w",
    description:
      "Variação do Ibovespa nos últimos 12 meses. Comparação contra o β em vez do S&P 500.",
    unit: "%",
    category: "risco",
  },
};

export function labelOf(key: LabelKey): LabelEntry {
  return LABELS[key];
}
