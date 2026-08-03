/**
 * Concept explanations for fundamentals and technical indicators.
 * Used in tooltips across the asset detail page and analysis views.
 *
 * Categories follow Damodaran's valuation framework:
 *  - Trading (P/E, P/B, EV/EBITDA, etc)
 *  - Operating (margins, ROE, ROIC, turnover)
 *  - Risk (leverage, beta, volatility)
 *  - Growth (CAGR, retention)
 *  - Quality scores (Piotroski, Altman Z, Ohlson)
 */

export type ConceptCategory =
  | "trading"
  | "operating"
  | "risk"
  | "growth"
  | "quality"
  | "dividends"
  | "valuation";

export type Concept = {
  key: string;
  label: string;
  category: ConceptCategory;
  short: string; // 1-line description
  formula?: string;
  interpretation: { range: string; meaning: string; tone: "good" | "bad" | "neutral" }[];
};

export const CONCEPTS: Record<string, Concept> = {
  // ================== VALUATION / TRADING MULTIPLES ==================
  pe: {
    key: "pe",
    label: "P/L (P/E)",
    category: "valuation",
    short:
      "Preço dividido pelo lucro por ação. Mede quantos anos de lucro o mercado paga pelo preço atual.",
    formula: "P/L = Preço / Lucro por Ação (LPA)",
    interpretation: [
      { range: "< 10", meaning: "Barato (ou empresa em dificuldade)", tone: "good" },
      { range: "10-20", meaning: "Faixa saudável, típica de blue chips", tone: "neutral" },
      { range: "20-30", meaning: "Empresa de qualidade com crescimento", tone: "neutral" },
      { range: "> 30", meaning: "Caro — mercado espera muito crescimento", tone: "bad" },
    ],
  },
  pvp: {
    key: "pvp",
    label: "P/VP (P/B)",
    category: "valuation",
    short:
      "Preço dividido pelo valor patrimonial por ação. Compara o preço de mercado com o valor contábil.",
    formula: "P/VP = Preço / Valor Patrimonial por Ação (VPA)",
    interpretation: [
      { range: "< 1", meaning: "Desconto sobre valor patrimonial (value trap possível)", tone: "good" },
      { range: "1-3", meaning: "Faixa saudável", tone: "neutral" },
      { range: "> 5", meaning: "Mercado paga prêmio alto (asset-light, growth)", tone: "bad" },
    ],
  },
  ev_ebitda: {
    key: "ev_ebitda",
    label: "EV/EBITDA",
    category: "valuation",
    short:
      "Valor da empresa (Equity + Dívida - Caixa) dividido pelo EBITDA. Melhor que P/E pra comparar empresas com capital structures diferentes.",
    formula: "EV/EBITDA = (Market Cap + Dívida - Caixa) / EBITDA",
    interpretation: [
      { range: "< 8", meaning: "Barato", tone: "good" },
      { range: "8-15", meaning: "Justo, típico de empresas maduras", tone: "neutral" },
      { range: "> 20", meaning: "Caro, esperado para growth", tone: "bad" },
    ],
  },
  psr: {
    key: "psr",
    label: "P/Receita (PSR)",
    category: "valuation",
    short:
      "Preço dividido pela receita por ação. Útil para empresas que ainda não dão lucro (early stage).",
    formula: "PSR = Market Cap / Receita Líquida",
    interpretation: [
      { range: "< 1", meaning: "Muito barato ou em dificuldade", tone: "neutral" },
      { range: "1-3", meaning: "Faixa saudável", tone: "neutral" },
      { range: "> 10", meaning: "Especulativo (growth software, biotech)", tone: "bad" },
    ],
  },
  peg: {
    key: "peg",
    label: "PEG",
    category: "valuation",
    short:
      "P/L dividido pelo crescimento esperado de lucro. < 1 = potencialmente subavaliado; > 2 = caro.",
    formula: "PEG = P/L ÷ CAGR de Lucro %",
    interpretation: [
      { range: "< 1", meaning: "Potencialmente subavaliado", tone: "good" },
      { range: "1-2", meaning: "Justo", tone: "neutral" },
      { range: "> 2", meaning: "Caro vs crescimento", tone: "bad" },
    ],
  },

  // ================== OPERATING / PROFITABILITY ==================
  roe: {
    key: "roe",
    label: "ROE",
    category: "operating",
    short:
      "Retorno sobre Patrimônio Líquido. Mede quanto a empresa gera de lucro com o dinheiro dos acionistas.",
    formula: "ROE = Lucro Líquido / Patrimônio Líquido × 100",
    interpretation: [
      { range: "> 20%", meaning: "Excelente (cria valor)", tone: "good" },
      { range: "10-20%", meaning: "Bom", tone: "good" },
      { range: "5-10%", meaning: "Razoável", tone: "neutral" },
      { range: "< 5%", meaning: "Fraco", tone: "bad" },
    ],
  },
  roic: {
    key: "roic",
    label: "ROIC",
    category: "operating",
    short:
      "Retorno sobre Capital Investido. Diferente do ROE (que usa só equity), considera dívida também. Métrica preferida por Damodaran.",
    formula: "ROIC = NOPAT / (Equity + Dívida Líquida)",
    interpretation: [
      { range: "> 15%", meaning: "Excelente (cria valor)", tone: "good" },
      { range: "10-15%", meaning: "Bom", tone: "good" },
      { range: "5-10%", meaning: "Aceitável", tone: "neutral" },
      { range: "< 5%", meaning: "Destrói valor", tone: "bad" },
    ],
  },
  roa: {
    key: "roa",
    label: "ROA",
    category: "operating",
    short:
      "Retorno sobre Ativos. Mostra eficiência em gerar lucro com todos os ativos (incluindo dívida).",
    formula: "ROA = Lucro Líquido / Ativo Total × 100",
    interpretation: [
      { range: "> 10%", meaning: "Excelente", tone: "good" },
      { range: "5-10%", meaning: "Bom", tone: "good" },
      { range: "2-5%", meaning: "Aceitável", tone: "neutral" },
      { range: "< 2%", meaning: "Fraco", tone: "bad" },
    ],
  },
  gross_margin: {
    key: "gross_margin",
    label: "Margem Bruta",
    category: "operating",
    short:
      "Receita menos custo dos produtos vendidos. Indica poder de precificação e vantagem competitiva.",
    formula: "Margem Bruta = (Receita - COGS) / Receita × 100",
    interpretation: [
      { range: "> 60%", meaning: "Alta (software, luxo, pharma)", tone: "good" },
      { range: "30-60%", meaning: "Saudável (varejo, industrial)", tone: "neutral" },
      { range: "< 20%", meaning: "Baixa margem (commodities)", tone: "bad" },
    ],
  },
  ebitda_margin: {
    key: "ebitda_margin",
    label: "Margem EBITDA",
    category: "operating",
    short:
      "Lucro antes de juros, impostos, depreciação e amortização, sobre receita. Métrica operacional pura.",
    formula: "Margem EBITDA = EBITDA / Receita × 100",
    interpretation: [
      { range: "> 25%", meaning: "Excelente", tone: "good" },
      { range: "10-25%", meaning: "Saudável", tone: "neutral" },
      { range: "< 10%", meaning: "Apertada (operação enxuta)", tone: "bad" },
    ],
  },
  net_margin: {
    key: "net_margin",
    label: "Margem Líquida",
    category: "operating",
    short:
      "Lucro líquido sobre receita. Após todos os custos (impostos, juros, depreciação).",
    formula: "Margem Líquida = Lucro Líquido / Receita × 100",
    interpretation: [
      { range: "> 20%", meaning: "Excelente (software, bancos)", tone: "good" },
      { range: "5-20%", meaning: "Saudável", tone: "neutral" },
      { range: "< 5%", meaning: "Apertada", tone: "bad" },
    ],
  },

  // ================== RISK ==================
  debt_ebitda: {
    key: "debt_ebitda",
    label: "Dívida/EBITDA",
    category: "risk",
    short:
      "Quantos anos de EBITDA a empresa precisa pra pagar toda a dívida. Acima de 3-4x é preocupante.",
    formula: "Dívida Líquida / EBITDA",
    interpretation: [
      { range: "< 1", meaning: "Muito baixo risco", tone: "good" },
      { range: "1-3", meaning: "Saudável", tone: "neutral" },
      { range: "3-5", meaning: "Atenção (pode ter crise)", tone: "bad" },
      { range: "> 5", meaning: "Alto risco (reestruturação possível)", tone: "bad" },
    ],
  },
  debt_equity: {
    key: "debt_equity",
    label: "Dívida/PL",
    category: "risk",
    short:
      "Quanto a empresa deve em relação ao capital próprio. Setor-dependente (bancos ~10x é normal).",
    formula: "Dívida Total / Patrimônio Líquido",
    interpretation: [
      { range: "< 0.5", meaning: "Conservadora", tone: "good" },
      { range: "0.5-1.5", meaning: "Equilibrada", tone: "neutral" },
      { range: "> 2", meaning: "Alavancada (risco)", tone: "bad" },
    ],
  },
  current_ratio: {
    key: "current_ratio",
    label: "Liquidez Corrente",
    category: "risk",
    short:
      "Ativos circulantes divididos por passivos circulantes. Mede capacidade de pagar dívidas de curto prazo.",
    formula: "Liquidez Corrente = Ativo Circulante / Passivo Circulante",
    interpretation: [
      { range: "> 2", meaning: "Saudável", tone: "good" },
      { range: "1-2", meaning: "Aceitável", tone: "neutral" },
      { range: "< 1", meaning: "Problemas de liquidez", tone: "bad" },
    ],
  },
  beta: {
    key: "beta",
    label: "Beta",
    category: "risk",
    short:
      "Sensibilidade ao mercado. 1 = mesma volatilidade; > 1 = mais volátil; < 1 = mais estável.",
    formula: "Beta = Cov(retorno_ativo, retorno_mercado) / Var(retorno_mercado)",
    interpretation: [
      { range: "< 0.8", meaning: "Defensivo (menos volátil)", tone: "good" },
      { range: "0.8-1.2", meaning: "Alinha com mercado", tone: "neutral" },
      { range: "> 1.5", meaning: "Agressivo (muito volátil)", tone: "bad" },
    ],
  },

  // ================== GROWTH ==================
  cagr_revenue: {
    key: "cagr_revenue",
    label: "CAGR Receita",
    category: "growth",
    short:
      "Taxa composta de crescimento anual da receita nos últimos 5 anos. Mede tração histórica.",
    formula: "CAGR = (Receita_final / Receita_inicial) ^ (1/anos) - 1",
    interpretation: [
      { range: "> 20%", meaning: "Crescimento forte", tone: "good" },
      { range: "5-20%", meaning: "Crescimento saudável", tone: "good" },
      { range: "0-5%", meaning: "Estagnado", tone: "neutral" },
      { range: "< 0%", meaning: "Encolhendo", tone: "bad" },
    ],
  },
  cagr_earnings: {
    key: "cagr_earnings",
    label: "CAGR Lucros",
    category: "growth",
    short:
      "Taxa composta de crescimento anual do lucro nos últimos 5 anos. Mais importante que CAGR Receita.",
    formula: "CAGR Lucro = (Lucro_final / Lucro_inicial) ^ (1/anos) - 1",
    interpretation: [
      { range: "> 15%", meaning: "Excelente", tone: "good" },
      { range: "5-15%", meaning: "Bom", tone: "good" },
      { range: "< 0%", meaning: "Lucro encolhendo", tone: "bad" },
    ],
  },

  // ================== DIVIDENDS ==================
  dy: {
    key: "dy",
    label: "Dividend Yield",
    category: "dividends",
    short:
      "Dividendo anual por ação dividido pelo preço. Retorno em dividendos sem contar valorização.",
    formula: "DY = Dividendo Anual / Preço × 100",
    interpretation: [
      { range: "> 6%", meaning: "Alto (verificar sustentabilidade)", tone: "good" },
      { range: "2-6%", meaning: "Moderado", tone: "good" },
      { range: "< 2%", meaning: "Baixo", tone: "neutral" },
      { range: "> 10%", meaning: "Risco (yield trap)", tone: "bad" },
    ],
  },
  payout: {
    key: "payout",
    label: "Payout",
    category: "dividends",
    short:
      "Porcentagem do lucro distribuída como dividendos. > 100% = empresa paga mais do que lucra (insustentável).",
    formula: "Payout = Dividendo / Lucro × 100",
    interpretation: [
      { range: "0-30%", meaning: "Reinveste muito (growth)", tone: "neutral" },
      { range: "30-60%", meaning: "Equilibrado", tone: "good" },
      { range: "60-100%", meaning: "Retorna muito ao acionista", tone: "good" },
      { range: "> 100%", meaning: "Pagando com dívida (insustentável)", tone: "bad" },
    ],
  },

  // ================== QUALITY SCORES ==================
  piotroski: {
    key: "piotroski",
    label: "Piotroski F-Score",
    category: "quality",
    short:
      "Score de 0-9 que mede força financeira. 9 critérios: lucro, ROA, FCF, alavancagem, liquidez, share dilution, gross margin, asset turnover.",
    formula: "Soma de 9 sinais binários (1 ponto cada)",
    interpretation: [
      { range: "8-9", meaning: "Empresa muito saudável", tone: "good" },
      { range: "5-7", meaning: "Saudável", tone: "neutral" },
      { range: "0-4", meaning: "Fraca/Em dificuldade", tone: "bad" },
    ],
  },
  altman: {
    key: "altman",
    label: "Altman Z-Score",
    category: "quality",
    short:
      "Prediz probabilidade de falência em 2 anos. Combina 5 ratios: capital de giro, lucros, ROA, leverage, market cap/sales.",
    formula: "Z = 1.2×A + 1.4×B + 3.3×C + 0.6×D + 1.0×E",
    interpretation: [
      { range: "> 2.99", meaning: "Zona segura (baixo risco de falência)", tone: "good" },
      { range: "1.81-2.99", meaning: "Zona cinza (atenção)", tone: "neutral" },
      { range: "< 1.81", meaning: "Zona de distress (alto risco)", tone: "bad" },
    ],
  },
};

export function getConcept(key: string): Concept | null {
  return CONCEPTS[key] ?? null;
}

/**
 * Get concepts grouped by category for display.
 */
export function getConceptsByCategory(): Record<ConceptCategory, Concept[]> {
  const result: Record<ConceptCategory, Concept[]> = {
    trading: [],
    valuation: [],
    operating: [],
    risk: [],
    growth: [],
    quality: [],
    dividends: [],
  };
  for (const c of Object.values(CONCEPTS)) {
    result[c.category].push(c);
  }
  return result;
}
